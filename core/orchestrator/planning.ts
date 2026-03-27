import { dbService } from "../../services/db";
import { AGENT_ROLES } from "../agents";
import crypto from "crypto";
import {
    buildBacklogTaskKey,
    chooseHigherPriority,
    inferFallbackAgentName,
    normalizeTaskDependencies,
    normalizeTaskText,
    tryParseJsonBlock
} from "./shared";

export const planningHandlers = {
    buildStaticLandingSpecialistReviews(project: any, goal: string) {
        const dbAgents = dbService.getAgents();
        const activeMap: Record<string, any> = {
            "James Wilson": {
                participates: true,
                reason: "Validar el setup, scripts y restricciones del proyecto antes de coordinar la ejecucion.",
                phase: "analysis",
                tasks: [{ title: `Validacion inicial del proyecto ${project.config?.framework || project.stack || 'web'}`, description: `Verificar estructura, scripts y condiciones minimas del proyecto para cumplir la meta "${goal}" sin anadir complejidad innecesaria.`, priority: "high", phase: "analysis", dependencies: [] }]
            },
            "Isabella Garcia": {
                participates: true,
                reason: "La landing requiere criterio visual y estructura de navegacion minima.",
                phase: "design",
                tasks: [{ title: "Diseno minimo de la landing", description: "Definir una landing page sencilla con jerarquia visual clara y exactamente 3 links visibles.", priority: "high", phase: "design", dependencies: [] }]
            },
            "Maya Patel": {
                participates: true,
                reason: "La implementacion en Astro necesita ejecucion frontend concreta.",
                phase: "build",
                tasks: [{ title: "Implementacion de la landing en Astro", description: "Construir o ajustar la pagina principal en Astro para que renderice correctamente los 3 links visibles con HTML semantico y estilos basicos.", priority: "high", phase: "build", dependencies: ["Diseno minimo de la landing"] }]
            },
            "Lucas White": {
                participates: true,
                reason: "Se requiere cierre funcional y verificacion visible del entregable.",
                phase: "validation",
                tasks: [{ title: "Validacion funcional y cierre", description: "Comprobar que la landing renderiza, que existen exactamente 3 links visibles y que el proyecto queda listo para revision final.", priority: "medium", phase: "validation", dependencies: ["Implementacion de la landing en Astro"] }]
            }
        };

        return AGENT_ROLES.map((agent: any) => {
            const active = activeMap[agent.name];
            const dbAgent = dbAgents.find((item: any) => item.name === agent.name);
            return {
                agentId: dbAgent?.id || agent.id,
                agentName: agent.name,
                agentRole: agent.role || agent.title,
                status: 'completed',
                participates: !!active,
                reason: active?.reason || "Este proyecto simple no requiere intervencion especializada adicional de este perfil.",
                phase: active?.phase || 'analysis',
                tasks: active?.tasks || []
            };
        });
    },

    async reviewSpecialist(this: any, project: any, goal: string, agent: any) {
        const dbAgent = dbService.getAgents().find((item: any) => item.name === agent.name);
        const config = project.config || {};
        const prompt = `
Eres ${agent.name}, especialista con rol ${agent.role || agent.title}.
Analiza el proyecto "${project.name}" y decide si debes participar.

CONTEXTO:
- Objetivo: ${goal}
- Framework: ${config.framework || project.stack || 'No especificado'}
- Runtime: ${config.runtime || 'No especificado'}
- Tipo: ${config.type || project.type || 'No especificado'}

REGLAS:
1. Si no aportas valor directo, responde participates=false.
2. Si participas, genera entre 1 y 3 tareas maximo.
3. Evita infraestructura innecesaria en proyectos simples.
4. Usa phases: analysis, design, build, validation, release.
5. Responde solo JSON.
`;

        try {
            const { response } = await this.chatWithFallback([{ role: 'user', content: prompt }], 25000);
            const parsed = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
            return {
                agentId: dbAgent?.id || agent.id,
                agentName: agent.name,
                agentRole: agent.role || agent.title,
                status: 'completed',
                participates: !!parsed.participates,
                reason: parsed.reason || '',
                phase: parsed.phase || 'analysis',
                tasks: Array.isArray(parsed.tasks) ? parsed.tasks : []
            };
        } catch (error: any) {
            return {
                agentId: dbAgent?.id || agent.id,
                agentName: agent.name,
                agentRole: agent.role || agent.title,
                status: 'completed',
                participates: false,
                reason: `No se pudo completar el analisis automatizado de este especialista: ${error.message}`,
                phase: 'analysis',
                tasks: []
            };
        }
    },

    async analyzeSpecialists(this: any, projectId: string, goal?: string) {
        if (dbService.isProjectBusy(projectId)) return;
        dbService.setProjectBusy(projectId, true);
        try {
            const project = dbService.getProjectById(projectId);
            if (!project) throw new Error("Proyecto no encontrado");
            if (project.environment_status !== 'ready') throw new Error("El ambiente aun no esta listo");

            const finalGoal = goal || project.goal || project.config?.goal || `Desarrollar ${project.name}`;
            dbService.clearSpecialistReviewsByProject(projectId);
            dbService.updateProject(projectId, { status: 'analyzing_specialists' });
            dbService.logSystemEvent(projectId, "Iniciando analisis coordinado de los 14 especialistas...", "ai");

            const isSimpleLanding = (project.config?.type || '').toLowerCase() === 'landingpage' && (project.config?.framework || '').toLowerCase().includes('astro');
            const reviews = isSimpleLanding
                ? this.buildStaticLandingSpecialistReviews(project, finalGoal)
                : await Promise.all(AGENT_ROLES.map((agent: any) => this.reviewSpecialist(project, finalGoal, agent)));

            for (const review of reviews) {
                dbService.upsertSpecialistReview(projectId, review.agentId, review);
                dbService.logSystemEvent(projectId, `${review.agentName}: ${review.participates ? `${review.tasks.length} tareas propuestas` : 'sin participacion directa'}.`, review.participates ? "success" : "info");
            }

            dbService.updateProject(projectId, { status: 'route_map_ready' });
            dbService.logSystemEvent(projectId, "RouteMap consolidado. Listo para confirmar el plan.", "success");
            return reviews;
        } finally {
            dbService.setProjectBusy(projectId, false);
        }
    },

    getRouteMap(projectId: string) {
        const project = dbService.getProjectById(projectId);
        if (!project) throw new Error("Proyecto no encontrado");
        const reviews = dbService.getSpecialistReviewsByProject(projectId);
        const participating = reviews.filter((review: any) => review.participates);
        const totalTasks = participating.reduce((sum: number, review: any) => sum + (review.tasks?.length || 0), 0);
        return { projectId, projectName: project.name, status: project.status, totalSpecialists: reviews.length, participatingSpecialists: participating.length, skippedSpecialists: reviews.length - participating.length, totalTasks, reviews };
    },

    async materializeTasksFromReviews(this: any, projectId: string) {
        if (dbService.isProjectBusy(projectId)) return;
        dbService.setProjectBusy(projectId, true);
        let shouldStartQueue = false;
        try {
            const project = dbService.getProjectById(projectId);
            if (!project) throw new Error("Proyecto no encontrado");
            const reviews = dbService.getSpecialistReviewsByProject(projectId);
            if (reviews.length === 0) throw new Error("No hay analisis de especialistas para materializar");

            dbService.clearTasksByProject(projectId);
            dbService.updateProject(projectId, { status: 'generating_tasks' });

            const materializedTasks = new Map<string, any>();
            let proposedTasks = 0;

            for (const review of reviews.filter((item: any) => item.participates)) {
                for (const task of review.tasks || []) {
                    const title = String(task?.title || "").trim();
                    if (!title) continue;
                    proposedTasks += 1;
                    const phase = task.phase || review.phase || 'analysis';
                    const key = buildBacklogTaskKey({ title, description: task.description, phase });
                    const existing = materializedTasks.get(key);

                    if (!existing) {
                        materializedTasks.set(key, {
                            title,
                            description: task.description || "",
                            assignedAgentId: review.agent_id || review.agentId || null,
                            dependencies: normalizeTaskDependencies(task.dependencies),
                            phase,
                            priority: task.priority || 'medium'
                        });
                        continue;
                    }

                    existing.dependencies = Array.from(new Set([...existing.dependencies, ...normalizeTaskDependencies(task.dependencies)]));
                    existing.priority = String(chooseHigherPriority(existing.priority, task.priority || 'medium'));
                    if (!existing.description && task.description) existing.description = task.description;
                }
            }

            const taskIds: string[] = [];
            for (const task of materializedTasks.values()) {
                taskIds.push(dbService.addTask(projectId, task.title, task.description, task.assignedAgentId, task.dependencies, { phase: task.phase }, task.priority));
            }

            dbService.updateProject(projectId, { status: 'active' });
            const duplicatesRemoved = Math.max(0, proposedTasks - taskIds.length);
            const dedupeSuffix = duplicatesRemoved > 0 ? ` (${duplicatesRemoved} duplicadas omitidas)` : "";
            dbService.logSystemEvent(projectId, `Backlog materializado: ${taskIds.length} tareas listas para ejecucion${dedupeSuffix}.`, "success");
            shouldStartQueue = true;
            return taskIds;
        } finally {
            dbService.setProjectBusy(projectId, false);
            if (shouldStartQueue) setTimeout(() => this.processQueue(projectId), 0);
        }
    },

    async createTaskFromUserPrompt(this: any, projectId: string, message: string) {
        const project = dbService.getProjectById(projectId);
        if (!project) throw new Error("Proyecto no encontrado");

        const trimmedMessage = String(message || "").trim();
        if (!trimmedMessage) throw new Error("El prompt no puede estar vacio");
        const requestId = crypto.randomUUID();
        const dbAgents = dbService.getAgents();
        const prompt = `Eres un coordinador senior de producto y operaciones.\nDebes analizar una nueva solicitud del usuario para el proyecto "${project.name}".`;

        let parsed = null as any;
        try {
            const { response } = await this.chatWithFallback([{ role: 'user', content: prompt + `\n\nSOLICITUD DEL USUARIO:\n${trimmedMessage}` }], 30000);
            parsed = tryParseJsonBlock(response);
        } catch {
            parsed = null;
        }

        const fallbackAgentName = inferFallbackAgentName(project, trimmedMessage);
        const assignedAgentName = String(parsed?.assignedAgentName || fallbackAgentName).trim();
        const assignedAgent = dbAgents.find((agent: any) => agent.name === assignedAgentName) || dbAgents.find((agent: any) => agent.name === fallbackAgentName) || dbAgents[0];
        if (!assignedAgent) throw new Error("No hay especialistas registrados");

        const taskTitle = String(parsed?.taskTitle || `Solicitud del usuario: ${trimmedMessage.slice(0, 72)}`).trim();
        const taskDescription = String(parsed?.taskDescription || `Atender la solicitud del usuario para el proyecto "${project.name}": ${trimmedMessage}`).trim();
        const priority = String(parsed?.priority || (normalizeTaskText(trimmedMessage).includes("error") || normalizeTaskText(trimmedMessage).includes("bug") ? "high" : "medium")).trim();
        const phase = String(parsed?.phase || "build").trim();
        const analysis = String(parsed?.analysis || `Se recibio una nueva solicitud del usuario. Debe traducirse a trabajo ejecutable y atenderse por ${assignedAgent.name}.`).trim();

        const taskId = dbService.addTask(projectId, taskTitle, taskDescription, assignedAgent.id, [], { phase, source: 'user_prompt', user_prompt: trimmedMessage, analysis }, priority);

        dbService.createProjectThreadMessage({ project_id: projectId, request_id: requestId, role: 'user', content: trimmedMessage, meta: { type: 'project_prompt' } });
        dbService.createProjectThreadMessage({
            project_id: projectId,
            request_id: requestId,
            role: 'system',
            content: analysis,
            meta: { type: 'project_prompt_response', priority, phase, task_title: taskTitle, task_description: taskDescription },
            assigned_agent_id: assignedAgent.id,
            task_id: taskId
        });

        dbService.updateProject(projectId, { status: 'active' });
        dbService.logSystemEvent(projectId, `Nueva instruccion del usuario convertida en tarea para ${assignedAgent.name}: ${taskTitle}.`, "info");
        dbService.logSystemEvent(projectId, analysis, "ai");
        setTimeout(() => this.processQueue(projectId), 0);

        return { projectId, taskId, analysis, assignedAgent: { id: assignedAgent.id, name: assignedAgent.name, role: assignedAgent.role || assignedAgent.title || 'Especialista' }, task: { title: taskTitle, description: taskDescription, priority, phase } };
    },

    buildStaticLandingPlan(project: any, goal: string) {
        const framework = project.config?.framework || project.stack || 'framework no especificado';
        return {
            tasks: [
                { title: `Validacion inicial del proyecto ${framework}`, description: `Verificar estructura, scripts y condiciones minimas del proyecto para cumplir la meta "${goal}" sin anadir complejidad innecesaria.`, assignedAgentName: "James Wilson", priority: "high" },
                { title: "Diseno minimo de la landing", description: "Definir una landing page sencilla con jerarquia visual clara y exactamente 3 links visibles.", assignedAgentName: "Isabella Garcia", priority: "high" },
                { title: "Implementacion de la landing en Astro", description: "Construir o ajustar la pagina principal en Astro para que renderice correctamente los 3 links visibles con HTML semantico y estilos basicos.", assignedAgentName: "Maya Patel", priority: "high" },
                { title: "Validacion funcional y cierre", description: "Comprobar que la landing renderiza, que existen exactamente 3 links visibles y que el proyecto queda listo para revision final.", assignedAgentName: "Lucas White", priority: "medium" }
            ]
        };
    },

    async generateTasks(this: any, projectId: string, goal?: string) {
        await this.analyzeSpecialists(projectId, goal);
        return this.materializeTasksFromReviews(projectId);
    },

    async planGoal(this: any, projectId: string, goal: string) {
        dbService.logSystemEvent(projectId, "Initializing A2A Core Orchestrator...", "info");
        const project = dbService.getProjectById(projectId);
        if (!project) throw new Error("Proyecto no encontrado");

        const config = project.config || {};
        dbService.logSystemEvent(projectId, "Syncing with Multi-Agent Fleet...", "ai");
        dbService.logSystemEvent(projectId, "Senior Developer is architecting the project roadmap...", "ai");

        const agentListStr = (AGENT_ROLES as any[]).map(a => `- ${a.name}: ${a.persona?.role || a.title}`).join("\n");
        const planPrompt = `Eres el Senior Developer y actuas como el planificador central.\nDesglosa la meta "${goal}" en tareas para el equipo especializado.\n\nAGENTES DISPONIBLES:\n${agentListStr}`;

        try {
            const isSimpleLanding = (config.type || '').toLowerCase() === 'landingpage' && (config.framework || '').toLowerCase().includes('astro');
            const plan = isSimpleLanding
                ? this.buildStaticLandingPlan(project, goal)
                : JSON.parse((await this.chatWithFallback([{ role: 'user', content: planPrompt }], 30000)).response.replace(/```json/g, '').replace(/```/g, '').trim());

            dbService.logSystemEvent(projectId, `Roadmap generado: ${plan.tasks.length} tareas asignadas.`, "success");
            const taskIds: string[] = [];
            const dbAgents = dbService.getAgents();
            for (const t of plan.tasks) {
                const dbAgent = dbAgents.find((da) => da.name === t.assignedAgentName);
                taskIds.push(dbService.addTask(projectId, t.title, t.description, dbAgent?.id || null, [], null, t.priority));
            }
            return taskIds;
        } catch (error: any) {
            throw new Error(`Fallo en planificacion IA: ${error.message}`);
        }
    }
};
