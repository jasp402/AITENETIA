import { dbService } from "../../services/db";
import { dockerService } from "../../services/dockerService";
import { projectManager } from "../../services/projectManager";
import { agentService } from "../../services/agent";
import { getAgentSystemPrompt } from "../agents";
import crypto from "crypto";
import { existsSync } from "node:fs";
import {
    TASK_LOCK_LEASE_MS,
    buildAgentPresenceMessage,
    executeStructuredToolCall,
    getPreviewUrl,
    normalizeA2AActions,
    normalizeReportedFiles,
    resolveWorkspaceFile,
    taskRequiresArtifactEvidence,
    taskRequiresPreviewEvidence,
    truncateError
} from "./shared";

export const executionHandlers = {
    async processQueue(this: any, projectId: string) {
        const tasks = dbService.getTasksByProject(projectId);
        const now = Date.now();
        for (const task of tasks) {
            if (['running', 'active'].includes(task.status)) {
                const lock = dbService.getTaskExecutionLock(task.id);
                const expiresAt = Date.parse(lock?.lease_expires_at || "");
                if (!lock || !Number.isFinite(expiresAt) || expiresAt <= now) {
                    dbService.updateTask(task.id, { status: 'pending' });
                    this.persistTaskCheckpoint(task, { status: 'stale', stage: task.execution_stage || 'stale_lock', lastError: 'La tarea perdio su lease de ejecucion y fue reencolada automaticamente.' });
                    dbService.logSystemEvent(projectId, `La tarea ${task.title} recupero su ejecucion tras perder el lease activo.`, "info");
                }
            }

            if (['awaiting_peer_review', 'awaiting_dependency'].includes(task.status)) {
                const openInteractions = dbService.getOpenAgentInteractionsByTask(task.id);
                const staleInteraction = openInteractions.find((interaction: any) => {
                    const createdAt = Date.parse(interaction.created_at || "");
                    return Number.isFinite(createdAt) && (now - createdAt) > 30 * 60 * 1000;
                });
                if (staleInteraction) {
                    dbService.resolveAgentInteraction(staleInteraction.id, { response: 'Timeout automatico del sistema por falta de respuesta del peer.', status: 'escalated' });
                    dbService.setTaskBlocked(task.id, { status: 'awaiting_user', blocker_type: 'a2a_timeout', blocker_summary: 'La coordinacion A2A excedio el tiempo de espera y requiere criterio humano.', blocker_source_agent_id: staleInteraction.to_agent_id || null });
                    this.persistTaskCheckpoint(task, { status: 'awaiting_user', stage: 'a2a_timeout', lastError: 'Timeout automatico por interaccion A2A sin respuesta.' });
                    dbService.logSystemEvent(projectId, `La tarea ${task.title} fue escalada al usuario tras timeout de colaboracion A2A.`, "info");
                }
            }
        }

        if (dbService.isProjectBusy(projectId)) return;

        const freshTasks = dbService.getTasksByProject(projectId);
        const pending = freshTasks.filter((t: any) => t.status === 'pending');
        const running = freshTasks.filter((t: any) => t.status === 'running' || t.status === 'active');
        const failed = freshTasks.filter((t: any) => t.status === 'failed');
        const blocked = freshTasks.filter((t: any) => ['blocked', 'awaiting_user', 'awaiting_peer_review', 'awaiting_dependency'].includes(t.status));

        if (freshTasks.length > 0 && pending.length === 0 && running.length === 0 && blocked.length === 0) {
            if (failed.length > 0) {
                dbService.updateProject(projectId, { status: 'failed' });
                return;
            }

            const delivery = await this.assessProjectDelivery(projectId);
            if (delivery.deliveryReady) {
                dbService.updateProject(projectId, { status: 'completed' });
                dbService.logSystemEvent(projectId, "La entrega final fue verificada. El proyecto esta listo para revision visual.", "success");
            } else {
                dbService.updateProject(projectId, { status: 'delivery_pending' });
                dbService.logSystemEvent(projectId, `La ejecucion termino, pero la entrega aun no puede cerrarse: ${delivery.reason}`, "info");
            }
            return;
        }

        if (freshTasks.length > 0 && pending.length === 0 && running.length === 0 && blocked.length > 0) {
            const pendingInteractions = dbService.getPendingAgentInteractionsByProject(projectId);
            if (pendingInteractions.length === 0) {
                dbService.updateProject(projectId, { status: 'blocked' });
                dbService.logSystemEvent(projectId, "El proyecto esta esperando resolucion de bloqueos antes de continuar.", "info");
                return;
            }
        }

        const pendingInteractions = dbService.getPendingAgentInteractionsByProject(projectId);
        if (pendingInteractions.length > 0) {
            dbService.setProjectBusy(projectId, true);
            try {
                await this.executeAgentInteraction(pendingInteractions[0]);
            } finally {
                dbService.setProjectBusy(projectId, false);
                setTimeout(() => this.processQueue(projectId), 1000);
            }
            return;
        }

        if (pending.length > 0) {
            dbService.setProjectBusy(projectId, true);
            const task = pending[0];
            const dbAgent = dbService.getAgents().find((agent: any) => agent.id === task.assigned_agent_id);
            dbService.logSystemEvent(projectId, buildAgentPresenceMessage(dbAgent?.name || "Un especialista", "is reviewing the queue for", task.title), "ai");
            try {
                await this.executeTask(task);
            } finally {
                dbService.setProjectBusy(projectId, false);
                setTimeout(() => this.processQueue(projectId), 2000);
            }
        }
    },

    async executeTask(this: any, task: any) {
        const ownerToken = crypto.randomUUID();
        const lockAcquired = dbService.acquireTaskExecutionLock(task.id, task.project_id, ownerToken, TASK_LOCK_LEASE_MS);
        if (!lockAcquired) {
            dbService.logSystemEvent(task.project_id, `La tarea ${task.title} ya esta siendo ejecutada por otro worker.`, "info");
            return;
        }

        const attemptCount = Number(task.execution_attempts || 0) + 1;
        dbService.updateTask(task.id, { status: 'running', execution_stage: 'starting', execution_attempts: attemptCount, last_heartbeat_at: new Date().toISOString() });
        this.persistTaskCheckpoint(task, { status: 'active', stage: 'starting', evidence: { attempt_count: attemptCount, started_at: new Date().toISOString() } });

        const dbAgents = dbService.getAgents();
        const dbAgent = dbAgents.find((a: any) => a.id === task.assigned_agent_id);
        const state = dbService.getProjectState(task.project_id);
        dbService.logSystemEvent(task.project_id, buildAgentPresenceMessage(dbAgent?.name || "Un especialista", "is actively working on", task.title), "ai");

        if (task.title.toLowerCase().includes("setup") || task.title.toLowerCase().includes("install")) {
            dbService.logSystemEvent(task.project_id, buildAgentPresenceMessage(dbAgent?.name || "Un especialista", "is preparing the environment for", task.title), "info");
            try {
                return await this.handleInstallationTask(task);
            } finally {
                dbService.releaseTaskExecutionLock(task.id, ownerToken);
            }
        }

        const project = dbService.getProjectById(task.project_id);
        if (project?.name) projectManager.switchProject(project.name);

        const systemPrompt = getAgentSystemPrompt(dbAgent?.name || "", state?.global_context || {});
        const taskPrompt = [
            `Tarea: ${task.title}`,
            `Descripcion: ${task.description}`,
            project ? `Ruta del proyecto: ${project.path}` : null,
            project ? `Goal del proyecto: ${project.goal || project.config?.goal || project.name}` : null,
            `Si necesitas inspeccionar, crear o modificar archivos, usa herramientas MCP reales y luego reporta solo lo que exista de verdad en el workspace.`,
            `No declares "completed" sin haber verificado artefactos reales.`
        ].filter(Boolean).join("\n");

        try {
            const checkpoint = dbService.getTaskCheckpoint(task.id);
            const initialConversation = checkpoint?.conversation?.length > 0 ? checkpoint.conversation : [agentService.injectToolsToPrompt({ role: 'system', content: systemPrompt }), { role: 'user', content: taskPrompt }];
            const conversation: any[] = [...initialConversation];
            const executedToolCalls: any[] = Array.isArray(checkpoint?.tool_calls) ? [...checkpoint.tool_calls] : [];
            const evidence = { ...(checkpoint?.evidence || {}), task_prompt: taskPrompt, resumed_from_checkpoint: !!checkpoint, resumed_at: checkpoint ? new Date().toISOString() : null };
            let fullResponse = "";
            let serviceName = "Unknown";
            let modelName = "Unknown";

            for (let step = 0; step < 8; step += 1) {
                this.touchTaskExecution(task.id, ownerToken);
                this.persistTaskCheckpoint(task, { status: 'active', stage: `model_turn_${step + 1}`, conversation, toolCalls: executedToolCalls, evidence });
                const agentTurn = await this.chatWithFallback(conversation, 60000);
                fullResponse = agentTurn.response;
                serviceName = agentTurn.serviceName;
                modelName = agentTurn.modelName;

                const toolCalls = agentService.parseToolCalls(fullResponse);
                if (!toolCalls || toolCalls.length === 0) {
                    this.persistTaskCheckpoint(task, { status: 'active', stage: 'final_response', conversation: [...conversation, { role: 'assistant', content: fullResponse }], toolCalls: executedToolCalls, evidence: { ...evidence, final_response: fullResponse } });
                    break;
                }

                conversation.push({ role: 'assistant', content: fullResponse });
                for (const toolCall of toolCalls) {
                    this.touchTaskExecution(task.id, ownerToken);
                    try {
                        const toolResult = await executeStructuredToolCall(toolCall);
                        executedToolCalls.push({ ...toolCall, isError: !!toolResult?.isError, completedAt: new Date().toISOString() });
                        conversation.push(agentService.formatToolResult(`${toolCall.server}/${toolCall.tool}`, toolResult, !!toolResult?.isError));
                        this.persistTaskCheckpoint(task, { status: 'active', stage: `tool_${toolCall.server}_${toolCall.tool}`, conversation, toolCalls: executedToolCalls, evidence: { ...evidence, tool_calls_count: executedToolCalls.length } });
                    } catch (toolError: any) {
                        executedToolCalls.push({ ...toolCall, isError: true, completedAt: new Date().toISOString(), error: truncateError(toolError?.message) });
                        conversation.push(agentService.formatToolResult(`${toolCall.server}/${toolCall.tool}`, { error: toolError?.message || "Tool execution failed" }, true));
                        this.persistTaskCheckpoint(task, { status: 'active', stage: `tool_error_${toolCall.server}_${toolCall.tool}`, conversation, toolCalls: executedToolCalls, evidence: { ...evidence, tool_calls_count: executedToolCalls.length }, lastError: truncateError(toolError?.message) });
                    }
                }
            }

            const reports = agentService.parseA2AReports(fullResponse);
            const executionModel = `${serviceName}:${modelName}`;
            if (reports && reports.length > 0) {
                for (const r of reports) await this.handleAgentReport(task.id, { ...r, model_used: executionModel });
            } else {
                await this.handleAgentReport(task.id, { status: 'completed', result: { raw: fullResponse }, model_used: executionModel });
            }
        } catch (e: any) {
            this.persistTaskCheckpoint(task, { status: 'failed', stage: 'runtime_error', lastError: truncateError(e.message), evidence: { failed_at: new Date().toISOString() } });
            dbService.updateTask(task.id, { status: 'failed', execution_stage: 'runtime_error', result: { error: e.message } });
            dbService.logSystemEvent(task.project_id, buildAgentPresenceMessage(dbAgent?.name || "Un especialista", "could not complete", task.title), "error");
        } finally {
            dbService.releaseTaskExecutionLock(task.id, ownerToken);
        }
    },

    async handleInstallationTask(this: any, task: any) {
        try {
            this.persistTaskCheckpoint(task, { status: 'active', stage: 'installation', evidence: { install_started_at: new Date().toISOString() } });
            const project = dbService.getProjectById(task.project_id);
            const cmd = project?.stack?.includes('bun') ? 'bun install' : 'npm install';
            const { exitCode } = await dockerService.execCommand(task.project_id, cmd);
            const code = await exitCode;

            if (code === 0) {
                dbService.logSystemEvent(task.project_id, "El sistema esta retomando la ejecucion tras aplicar dependencias del proyecto.", "info");
                const runtime = await dockerService.startContainer(task.project_id, project!.path);
                const previewUrl = getPreviewUrl(task.project_id);
                const isReady = await dockerService.waitForHttp(previewUrl);
                dbService.updateProject(task.project_id, { runtime_status: isReady ? 'running' : 'error', preview_url: previewUrl, runtime_container_name: runtime.containerName, container_ip: runtime.containerIp });
                dbService.updateTask(task.id, { status: 'completed', execution_stage: 'completed', result: { output: `Instalacion y arranque exitosos. App lista en ${previewUrl}. Status: ${isReady ? 'Live' : 'Port not responding yet'}` } });
                this.persistTaskCheckpoint(task, { status: 'completed', stage: 'completed', evidence: { preview_url: previewUrl, preview_ready: isReady, install_command: cmd } });
                dbService.clearTaskCheckpoint(task.id);
                dbService.logSystemEvent(task.project_id, "El ambiente se reinicio correctamente y la tarea de instalacion quedo cerrada.", "success");
            } else {
                dbService.updateTask(task.id, { status: 'failed', execution_stage: 'failed', result: { error: `Error en instalacion (Codigo ${code})` } });
                this.persistTaskCheckpoint(task, { status: 'failed', stage: 'failed', lastError: `Error en instalacion (Codigo ${code})`, evidence: { install_command: cmd } });
                dbService.logSystemEvent(task.project_id, "La tarea de instalacion fallo y requiere revision tecnica.", "error");
            }
        } catch (e: any) {
            dbService.updateTask(task.id, { status: 'failed', execution_stage: 'failed', result: { error: e.message } });
            this.persistTaskCheckpoint(task, { status: 'failed', stage: 'failed', lastError: truncateError(e.message) });
            dbService.logSystemEvent(task.project_id, "La instalacion encontro un error inesperado y se detuvo.", "error");
        }
    },

    async handleAgentReport(this: any, taskId: string, report: any) {
        const task = dbService.getTaskById(taskId);
        if (!task) return;

        const project = dbService.getProjectById(task.project_id);
        const rawStatus = String(report.status || '').toLowerCase();
        const normalizedStatus = rawStatus === 'failed' ? 'failed' : rawStatus === 'pending' ? 'pending' : 'completed';
        const reportResult = report.result || {};
        const reportedFiles = normalizeReportedFiles(reportResult.files_created);
        const verifiedFiles = project ? reportedFiles.filter((filePath) => existsSync(resolveWorkspaceFile(project.path, filePath))) : [];
        const checkpointEvidence = { report_summary: reportResult.summary || reportResult.raw || "", files_created: reportedFiles, verified_files: verifiedFiles, model_used: report.model_used || null, technical_details: reportResult.technical_details || null, a2a_actions: normalizeA2AActions(reportResult?.a2a_actions || reportResult?.actions) };

        if (await this.processA2AActions(task, reportResult)) {
            this.persistTaskCheckpoint(task, { status: 'waiting_a2a', stage: 'waiting_a2a', evidence: checkpointEvidence });
            dbService.updateTask(taskId, { execution_stage: 'waiting_a2a', model_used: report.model_used, result: { ...reportResult, files_created: reportedFiles, verified_files: verifiedFiles } });
            return;
        }

        if (normalizedStatus === 'completed' && project) {
            const requiresArtifacts = taskRequiresArtifactEvidence(task);
            const requiresPreview = taskRequiresPreviewEvidence(task, project);
            const delivery = requiresPreview ? await this.assessProjectDelivery(task.project_id) : null;
            const hasAlternativeEvidence = !!delivery?.previewReady;

            if (requiresArtifacts && verifiedFiles.length === 0 && !hasAlternativeEvidence) {
                const blockerSummary = reportedFiles.length > 0 ? `La tarea reporto archivos (${reportedFiles.join(", ")}), pero no existen realmente en el workspace.` : "La tarea fue marcada como completada sin crear archivos verificables en el workspace.";
                dbService.setTaskBlocked(taskId, { status: 'blocked', blocker_type: 'missing_artifacts', blocker_summary: blockerSummary, blocker_source_agent_id: task.assigned_agent_id });
                dbService.updateTask(taskId, { execution_stage: 'blocked_missing_artifacts', result: { ...reportResult, files_created: reportedFiles, verified_files: verifiedFiles }, model_used: report.model_used });
                this.persistTaskCheckpoint(task, { status: 'blocked', stage: 'blocked_missing_artifacts', evidence: checkpointEvidence, lastError: blockerSummary });
                const dbAgent = dbService.getAgents().find((agent: any) => agent.id === task.assigned_agent_id);
                dbService.logSystemEvent(task.project_id, buildAgentPresenceMessage(dbAgent?.name || "Un especialista", "reported completion without real workspace artifacts for", task.title), "error");
                return;
            }

            if (requiresPreview && !delivery?.previewReady) {
                dbService.setTaskBlocked(taskId, { status: 'awaiting_dependency', blocker_type: 'preview_unavailable', blocker_summary: 'La tarea requiere un preview verificable antes de poder cerrarse.', blocker_source_agent_id: task.assigned_agent_id });
                dbService.updateTask(taskId, { execution_stage: 'awaiting_preview', result: { ...reportResult, files_created: reportedFiles, verified_files: verifiedFiles }, model_used: report.model_used });
                this.persistTaskCheckpoint(task, { status: 'awaiting_dependency', stage: 'awaiting_preview', evidence: { ...checkpointEvidence, preview_delivery: delivery }, lastError: 'La tarea requiere preview verificable antes del cierre.' });
                const dbAgent = dbService.getAgents().find((agent: any) => agent.id === task.assigned_agent_id);
                dbService.logSystemEvent(task.project_id, buildAgentPresenceMessage(dbAgent?.name || "Un especialista", "is waiting for a renderable preview before closing", task.title), "info");
                return;
            }
        }

        dbService.updateTask(taskId, { status: normalizedStatus, execution_stage: normalizedStatus === 'completed' ? 'completed' : normalizedStatus === 'failed' ? 'failed' : 'pending', result: { ...reportResult, files_created: reportedFiles, verified_files: verifiedFiles }, model_used: report.model_used });
        this.persistTaskCheckpoint(task, { status: normalizedStatus, stage: normalizedStatus === 'completed' ? 'completed' : normalizedStatus === 'failed' ? 'failed' : 'pending', evidence: checkpointEvidence, lastError: normalizedStatus === 'failed' ? truncateError(reportResult?.error || reportResult?.summary || '') : null });
        if (normalizedStatus === 'completed') dbService.clearTaskCheckpoint(taskId);

        const dbAgent = dbService.getAgents().find((agent: any) => agent.id === task.assigned_agent_id);
        if (normalizedStatus === 'completed') dbService.logSystemEvent(task.project_id, buildAgentPresenceMessage(dbAgent?.name || "Un especialista", "completed", task.title), "success");
        else if (normalizedStatus === 'failed') dbService.logSystemEvent(task.project_id, buildAgentPresenceMessage(dbAgent?.name || "Un especialista", "reported a failure on", task.title), "error");
        else if (normalizedStatus === 'pending') dbService.logSystemEvent(task.project_id, buildAgentPresenceMessage(dbAgent?.name || "Un especialista", "paused work temporarily on", task.title), "info");
    }
};
