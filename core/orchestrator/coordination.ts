import { dbService } from "../../services/db";
import { projectManager } from "../../services/projectManager";
import { getAgentSystemPrompt } from "../agents";
import { agentService } from "../../services/agent";
import {
    TASK_LOCK_LEASE_MS,
    buildAgentPresenceMessage,
    executeStructuredToolCall,
    normalizeA2AActions,
    parseInteractionDecision,
    truncateError
} from "./shared";

export const coordinationHandlers = {
    async createDecisionRequest(data: { projectId: string; taskId: string; agentId: string; question: string; context?: string; options?: string[]; recommendedOption?: string; impactIfDelayed?: string; }) {
        const task = dbService.getTaskById(data.taskId);
        if (!task) throw new Error("Tarea no encontrada");

        dbService.setTaskBlocked(data.taskId, {
            status: 'awaiting_user',
            blocker_type: 'decision_request',
            blocker_summary: data.question,
            blocker_source_agent_id: data.agentId
        });

        const requestId = dbService.createDecisionRequest({
            project_id: data.projectId,
            task_id: data.taskId,
            agent_id: data.agentId,
            question: data.question,
            context: data.context,
            options: data.options,
            recommended_option: data.recommendedOption,
            impact_if_delayed: data.impactIfDelayed
        });

        dbService.logSystemEvent(data.projectId, `Decision request creada para la tarea ${task.title}.`, "info");
        dbService.logSystemEvent(data.projectId, buildAgentPresenceMessage("El agente responsable", "is waiting for your decision on", task.title), "info");
        return requestId;
    },

    async answerDecisionRequest(this: any, requestId: string, userResponse: string) {
        const request = dbService.getDecisionRequestById(requestId);
        if (!request) throw new Error("Decision request no encontrada");
        dbService.answerDecisionRequest(requestId, userResponse);
        dbService.resolveTaskBlocker(request.task_id, 'pending');
        dbService.logSystemEvent(request.project_id, `Decision respondida por el usuario para la tarea ${request.task_id}.`, "success");
        dbService.logSystemEvent(request.project_id, "La tarea se reanudo despues de recibir confirmacion del usuario.", "success");
        setTimeout(() => this.processQueue(request.project_id), 0);
        return { taskId: request.task_id, projectId: request.project_id };
    },

    async retryFailedTask(this: any, taskId: string) {
        const task = dbService.getTaskById(taskId);
        if (!task) throw new Error("Tarea no encontrada");
        if (task.status !== 'failed') throw new Error("Solo se pueden reintentar tareas fallidas");
        dbService.retryTask(taskId);
        dbService.updateProject(task.project_id, { status: 'active' });
        dbService.logSystemEvent(task.project_id, `La tarea ${task.title} fue reencolada manualmente desde la interfaz.`, "info");
        setTimeout(() => this.processQueue(task.project_id), 0);
        return { taskId: task.id, projectId: task.project_id, status: 'pending' };
    },

    async resumePausedTask(this: any, taskId: string) {
        const task = dbService.getTaskById(taskId);
        if (!task) throw new Error("Tarea no encontrada");
        const resumableStatuses = new Set(['blocked', 'awaiting_dependency', 'awaiting_peer_review']);
        if (!resumableStatuses.has(task.status)) throw new Error("Solo se pueden reanudar tareas pausadas por bloqueos tecnicos o dependencias");
        dbService.retryTask(taskId);
        dbService.updateProject(task.project_id, { status: 'active' });
        dbService.logSystemEvent(task.project_id, `La tarea ${task.title} fue reanudada manualmente desde la interfaz.`, "info");
        setTimeout(() => this.processQueue(task.project_id), 0);
        return { taskId: task.id, projectId: task.project_id, status: 'pending' };
    },

    async createAgentInteraction(data: { projectId: string; taskId: string; fromAgentId: string; toAgentId: string; type: 'handoff' | 'consultation' | 'review'; message: string; }) {
        const task = dbService.getTaskById(data.taskId);
        if (!task) throw new Error("Tarea no encontrada");

        if (data.type === 'consultation') {
            const budget = dbService.getInteractionBudget(data.projectId, data.fromAgentId);
            const total = Number(budget.budget_total || 3);
            const used = Number(budget.budget_used || 0);
            if (used >= total) {
                dbService.setTaskBlocked(data.taskId, {
                    status: 'awaiting_user',
                    blocker_type: 'interaction_budget_exhausted',
                    blocker_summary: 'El agente consumio sus 3 comodines y necesita decision del usuario para continuar.',
                    blocker_source_agent_id: data.fromAgentId
                });
                throw new Error("Interaction budget exhausted");
            }

            dbService.consumeInteractionBudget(data.projectId, data.fromAgentId);
            dbService.setTaskBlocked(data.taskId, {
                status: 'awaiting_peer_review',
                blocker_type: 'consultation',
                blocker_summary: 'Esperando opinion de otro especialista para continuar esta tarea.',
                blocker_source_agent_id: data.toAgentId
            });
        }

        if (data.type === 'review') {
            dbService.setTaskBlocked(data.taskId, {
                status: 'awaiting_peer_review',
                blocker_type: 'review',
                blocker_summary: 'Esperando revision y criterio de otro especialista.',
                blocker_source_agent_id: data.toAgentId
            });
        }

        const interactionId = dbService.createAgentInteraction({
            project_id: data.projectId,
            task_id: data.taskId,
            from_agent_id: data.fromAgentId,
            to_agent_id: data.toAgentId,
            type: data.type,
            message: data.message,
            round_number: 1,
            status: 'requested'
        });

        dbService.logSystemEvent(data.projectId, `Interaccion ${data.type} iniciada para la tarea ${task.title}.`, "info");
        dbService.logSystemEvent(data.projectId, `El equipo esta coordinando una ${data.type} para destrabar o validar la tarea ${task.title}.`, "ai");
        dbService.createProjectThreadMessage({
            project_id: data.projectId,
            role: 'system',
            content: `Solicitud A2A enviada a ${dbService.getAgents().find((agent: any) => agent.id === data.toAgentId)?.name || 'otro especialista'}: ${data.message}`,
            meta: { type: 'a2a_request', interaction_id: interactionId, interaction_type: data.type },
            assigned_agent_id: data.toAgentId,
            task_id: data.taskId
        });
        return interactionId;
    },

    async resolveAgentInteraction(this: any, interactionId: string, data: { response: string; approved: boolean; }) {
        const interaction = dbService.getAgentInteractionById(interactionId);
        if (!interaction) throw new Error("Interaccion no encontrada");
        const status = data.approved ? 'approved' : 'rejected';
        dbService.resolveAgentInteraction(interactionId, { response: data.response, status });

        if (data.approved) {
            dbService.resolveTaskBlocker(interaction.task_id, 'pending');
            dbService.logSystemEvent(interaction.project_id, `Interaccion resuelta favorablemente para la tarea ${interaction.task_id}.`, "success");
            dbService.logSystemEvent(interaction.project_id, "La tarea retomo ejecucion despues de una respuesta satisfactoria del especialista consultado.", "success");
            setTimeout(() => this.processQueue(interaction.project_id), 0);
        } else {
            dbService.setTaskBlocked(interaction.task_id, {
                status: 'awaiting_user',
                blocker_type: 'peer_rejected_solution',
                blocker_summary: 'El especialista consultado rechazo la solucion propuesta. Se requiere decision del usuario.',
                blocker_source_agent_id: interaction.to_agent_id
            });
            dbService.logSystemEvent(interaction.project_id, `La tarea ${interaction.task_id} requiere decision del usuario tras rechazo de peer review.`, "info");
            dbService.logSystemEvent(interaction.project_id, "La solucion propuesta no fue aceptada por el especialista. El sistema espera criterio humano para continuar.", "info");
        }

        return { taskId: interaction.task_id, projectId: interaction.project_id, status };
    },

    async resetAgentInteractionBudget(projectId: string, agentId: string) {
        dbService.resetInteractionBudget(projectId, agentId);
        dbService.logSystemEvent(projectId, `El usuario reinicio los comodines del agente ${agentId}.`, "success");
        return dbService.getInteractionBudget(projectId, agentId);
    },

    buildTaskCheckpoint(task: any, partial: any = {}) {
        const previous = dbService.getTaskCheckpoint(task.id);
        const evidence = { ...(previous?.evidence || {}), ...(partial.evidence || {}) };
        return {
            task_id: task.id,
            project_id: task.project_id,
            status: partial.status || previous?.status || 'active',
            stage: partial.stage ?? previous?.stage ?? null,
            attempt_count: Math.max(1, Number(task.execution_attempts || previous?.attempt_count || 1)),
            conversation: partial.conversation || previous?.conversation || [],
            tool_calls: partial.toolCalls || previous?.tool_calls || [],
            evidence,
            last_error: partial.lastError ?? previous?.last_error ?? null
        };
    },

    persistTaskCheckpoint(task: any, partial: any = {}) {
        const payload = this.buildTaskCheckpoint(task, partial);
        dbService.upsertTaskCheckpoint(payload);
        dbService.updateTask(task.id, { execution_stage: payload.stage, execution_attempts: payload.attempt_count, last_heartbeat_at: new Date().toISOString() });
        return payload;
    },

    touchTaskExecution(taskId: string, ownerToken: string) {
        dbService.renewTaskExecutionLock(taskId, ownerToken, TASK_LOCK_LEASE_MS);
        dbService.updateTask(taskId, { last_heartbeat_at: new Date().toISOString() });
    },

    async runAgentLoop(this: any, systemPrompt: string, userPrompt: string, maxSteps: number = 6, timeoutMs: number = 45000) {
        const conversation: any[] = [agentService.injectToolsToPrompt({ role: 'system', content: systemPrompt }), { role: 'user', content: userPrompt }];
        const executedToolCalls: any[] = [];
        let fullResponse = "";
        let serviceName = "Unknown";
        let modelName = "Unknown";

        for (let step = 0; step < maxSteps; step += 1) {
            const agentTurn = await this.chatWithFallback(conversation, timeoutMs);
            fullResponse = agentTurn.response;
            serviceName = agentTurn.serviceName;
            modelName = agentTurn.modelName;
            const toolCalls = agentService.parseToolCalls(fullResponse);
            if (!toolCalls || toolCalls.length === 0) break;
            conversation.push({ role: 'assistant', content: fullResponse });

            for (const toolCall of toolCalls) {
                try {
                    const toolResult = await executeStructuredToolCall(toolCall);
                    executedToolCalls.push({ ...toolCall, isError: !!toolResult?.isError, completedAt: new Date().toISOString() });
                    conversation.push(agentService.formatToolResult(`${toolCall.server}/${toolCall.tool}`, toolResult, !!toolResult?.isError));
                } catch (toolError: any) {
                    executedToolCalls.push({ ...toolCall, isError: true, completedAt: new Date().toISOString(), error: truncateError(toolError?.message) });
                    conversation.push(agentService.formatToolResult(`${toolCall.server}/${toolCall.tool}`, { error: toolError?.message || "Tool execution failed" }, true));
                }
            }
        }

        return { response: fullResponse, conversation, toolCalls: executedToolCalls, modelUsed: `${serviceName}:${modelName}` };
    },

    async executeAgentInteraction(this: any, interaction: any) {
        const task = dbService.getTaskById(interaction.task_id);
        if (!task) {
            dbService.resolveAgentInteraction(interaction.id, { response: 'La tarea asociada ya no existe. Interaccion cerrada por el sistema.', status: 'escalated' });
            return;
        }

        const project = dbService.getProjectById(interaction.project_id);
        const targetAgent = dbService.getAgents().find((agent: any) => agent.id === interaction.to_agent_id);
        if (!project || !targetAgent) {
            dbService.resolveAgentInteraction(interaction.id, { response: 'No fue posible ubicar el proyecto o el agente destino. Se requiere intervencion humana.', status: 'escalated' });
            dbService.setTaskBlocked(task.id, { status: 'awaiting_user', blocker_type: 'a2a_missing_target', blocker_summary: 'La colaboracion A2A no pudo ejecutarse por falta de contexto o agente receptor.', blocker_source_agent_id: interaction.to_agent_id || null });
            return;
        }

        if (project?.name) projectManager.switchProject(project.name);
        dbService.updateAgentInteractionStatus(interaction.id, 'waiting');
        dbService.logSystemEvent(interaction.project_id, `${targetAgent.name} esta procesando una solicitud A2A para ${task.title}.`, "ai");

        const state = dbService.getProjectState(interaction.project_id);
        const systemPrompt = getAgentSystemPrompt(targetAgent.name, state?.global_context || {});
        const reviewPrompt = [
            `Interaccion A2A tipo: ${interaction.type}`,
            `Proyecto: ${project.name}`,
            `Tarea origen: ${task.title}`,
            `Descripcion de la tarea: ${task.description || 'Sin descripcion adicional'}`,
            `Solicitante: ${interaction.from_agent_name || interaction.from_agent_id}`,
            `Especialista receptor: ${targetAgent.name}`,
            `Solicitud concreta: ${interaction.message}`,
            '',
            'Debes evaluar la solicitud y responder SOLO JSON con este formato:',
            '{',
            '  "approved": true|false,',
            '  "response": "Respuesta tecnica breve y accionable",',
            '  "escalate_to_user": true|false',
            '}',
            '',
            'Puedes usar MCP si necesitas inspeccionar archivos o contexto antes de responder.'
        ].join("\n");

        try {
            const agentTurn = await this.runAgentLoop(systemPrompt, reviewPrompt, 5, 45000);
            const decision = parseInteractionDecision(agentTurn.response);

            if (decision.escalation && !decision.approved) {
                dbService.resolveAgentInteraction(interaction.id, { response: decision.response || 'El especialista receptor solicita criterio humano.', status: 'escalated' });
                dbService.setTaskBlocked(task.id, { status: 'awaiting_user', blocker_type: 'a2a_escalated_to_user', blocker_summary: decision.response || 'La colaboracion A2A requiere criterio del usuario.', blocker_source_agent_id: interaction.to_agent_id });
                dbService.logSystemEvent(interaction.project_id, `La interaccion A2A de ${task.title} fue escalada al usuario por ${targetAgent.name}.`, "info");
                return;
            }

            const resolution = await this.resolveAgentInteraction(interaction.id, { response: decision.response || agentTurn.response, approved: !!decision.approved });
            dbService.createProjectThreadMessage({
                project_id: interaction.project_id,
                role: 'system',
                content: `${targetAgent.name} respondio una interaccion ${interaction.type}: ${decision.response || 'Sin detalle adicional.'}`,
                meta: { type: 'a2a_resolution', interaction_id: interaction.id, interaction_type: interaction.type, approved: !!decision.approved, model_used: agentTurn.modelUsed, tool_calls_count: agentTurn.toolCalls.length },
                assigned_agent_id: interaction.to_agent_id,
                task_id: interaction.task_id
            });
            return resolution;
        } catch (error: any) {
            dbService.resolveAgentInteraction(interaction.id, { response: `Error ejecutando colaboracion A2A: ${truncateError(error?.message)}`, status: 'escalated' });
            dbService.setTaskBlocked(task.id, { status: 'awaiting_user', blocker_type: 'a2a_execution_failed', blocker_summary: 'La colaboracion A2A fallo durante su ejecucion automatica.', blocker_source_agent_id: interaction.to_agent_id });
            dbService.logSystemEvent(interaction.project_id, `Fallo la ejecucion automatica de una interaccion A2A para ${task.title}.`, "error");
        }
    },

    async processA2AActions(this: any, task: any, reportResult: any) {
        const actions = normalizeA2AActions(reportResult?.a2a_actions || reportResult?.actions);
        if (actions.length === 0) return false;

        const dbAgents = dbService.getAgents();
        for (const action of actions) {
            if (action.type === 'decision_request') {
                await this.createDecisionRequest({
                    projectId: task.project_id,
                    taskId: task.id,
                    agentId: task.assigned_agent_id,
                    question: action.question || 'Se requiere decision humana para continuar.',
                    context: action.context || reportResult?.summary || '',
                    options: action.options,
                    recommendedOption: action.recommendedOption || undefined,
                    impactIfDelayed: action.impactIfDelayed || undefined
                });
                return true;
            }

            const targetAgent = dbAgents.find((agent: any) => agent.name === action.targetAgentName);
            if (!targetAgent) {
                dbService.setTaskBlocked(task.id, { status: 'awaiting_user', blocker_type: 'missing_peer_agent', blocker_summary: `La accion A2A solicita al agente "${action.targetAgentName}", pero ese especialista no existe.`, blocker_source_agent_id: task.assigned_agent_id });
                dbService.logSystemEvent(task.project_id, `Accion A2A invalida en ${task.title}: no existe el agente ${action.targetAgentName}.`, "error");
                return true;
            }

            const openInteractions = dbService.getOpenAgentInteractionsByTask(task.id);
            const duplicate = openInteractions.find((interaction: any) => interaction.type === action.type && interaction.to_agent_id === targetAgent.id && String(interaction.message || "").trim() === action.question);
            if (duplicate) {
                dbService.setTaskBlocked(task.id, { status: action.type === 'handoff' ? 'awaiting_dependency' : 'awaiting_peer_review', blocker_type: `a2a_${action.type}`, blocker_summary: `La tarea ya tiene una accion A2A abierta de tipo ${action.type}.`, blocker_source_agent_id: targetAgent.id });
                return true;
            }

            await this.createAgentInteraction({
                projectId: task.project_id,
                taskId: task.id,
                fromAgentId: task.assigned_agent_id,
                toAgentId: targetAgent.id,
                type: action.type as 'handoff' | 'consultation' | 'review',
                message: action.question || `El agente ${task.agent_name || task.assigned_agent_id} necesita apoyo de ${targetAgent.name}.`
            });

            if (action.type === 'handoff') {
                dbService.updateTask(task.id, { assigned_agent_id: targetAgent.id });
                dbService.setTaskBlocked(task.id, { status: 'awaiting_dependency', blocker_type: 'a2a_handoff', blocker_summary: `La tarea fue transferida temporalmente a ${targetAgent.name} para continuar.`, blocker_source_agent_id: targetAgent.id });
            }
            return true;
        }

        return false;
    }
};
