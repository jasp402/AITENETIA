import { mcpService } from "../../services/mcpClient";
import { automationService } from "../../services/automationService";
import { readdirSync } from "node:fs";
import { join } from "node:path";

export const TASK_LOCK_LEASE_MS = 120000;

export const getPreviewUrl = (projectId: string) => `http://127.0.0.1:8080/preview/${projectId}`;

export const getProjectAppPort = (project: any) => {
    const port = Number(project?.environment_details?.appPort);
    return Number.isFinite(port) && port > 0 ? port : 3000;
};

export const buildAgentPresenceMessage = (agentName: string, action: string, subject?: string) =>
    `${agentName} ${action}${subject ? ` ${subject}` : ''}.`;

export const normalizeTaskText = (value: unknown) =>
    String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

export const normalizeReportedFiles = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => String(item || "").trim())
        .filter(Boolean);
};

export const truncateError = (value: unknown) => String(value || "").slice(0, 800);

export const safeArray = (value: unknown) => Array.isArray(value) ? value : [];

export const tryParseJsonBlock = (value: string) => {
    const cleaned = String(value || "").replace(/```json/g, "").replace(/```/g, "").trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start >= 0 && end > start) {
            try {
                return JSON.parse(cleaned.slice(start, end + 1));
            } catch {
                return null;
            }
        }
        return null;
    }
};

export const normalizeA2AActionType = (value: unknown) => {
    const normalized = normalizeTaskText(value);
    if (normalized.includes("decision")) return "decision_request";
    if (normalized.includes("consult")) return "consultation";
    if (normalized.includes("review")) return "review";
    if (normalized.includes("handoff")) return "handoff";
    return "";
};

export const normalizeA2AActions = (value: unknown) => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            const action = item && typeof item === "object" ? item as any : {};
            const type = normalizeA2AActionType(action.type);
            if (!type) return null;
            return {
                type,
                targetAgentName: String(action.targetAgentName || action.target_agent_name || "").trim(),
                question: String(action.question || action.message || action.prompt || "").trim(),
                context: String(action.context || "").trim(),
                options: safeArray(action.options).map((option) => String(option || "").trim()).filter(Boolean),
                recommendedOption: String(action.recommendedOption || action.recommended_option || "").trim(),
                impactIfDelayed: String(action.impactIfDelayed || action.impact_if_delayed || "").trim()
            };
        })
        .filter(Boolean) as Array<{
            type: string;
            targetAgentName: string;
            question: string;
            context: string;
            options: string[];
            recommendedOption: string;
            impactIfDelayed: string;
        }>;
};

export const parseInteractionDecision = (value: string) => {
    const parsed = tryParseJsonBlock(value);
    if (parsed && typeof parsed === 'object') {
        const approved = typeof parsed.approved === 'boolean'
            ? parsed.approved
            : normalizeTaskText(parsed.status).includes('approve')
                || normalizeTaskText(parsed.verdict).includes('approve')
                || normalizeTaskText(parsed.decision).includes('approve');
        return {
            approved,
            response: String(parsed.response || parsed.summary || parsed.reason || value).trim(),
            escalation: !!parsed.escalate_to_user || normalizeTaskText(parsed.status).includes('user')
        };
    }

    const text = normalizeTaskText(value);
    return {
        approved: text.includes('approve') || text.includes('aprob'),
        response: String(value || '').trim(),
        escalation: text.includes('usuario') || text.includes('human')
    };
};

export const resolveWorkspaceFile = (projectPath: string, filePath: string) => {
    const normalized = filePath.replace(/^\.?[\\/]+/, "").replace(/\//g, "\\");
    return join(projectPath, normalized);
};

export const hasMeaningfulWorkspaceFiles = (path: string) => {
    const ignored = new Set(["Dockerfile", ".dockerignore"]);
    const visit = (currentPath: string): boolean => {
        try {
            const entries = readdirSync(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith(".git") || entry.name === "node_modules") continue;
                const fullPath = join(currentPath, entry.name);
                if (entry.isDirectory()) {
                    if (visit(fullPath)) return true;
                    continue;
                }
                if (!ignored.has(entry.name)) return true;
            }
        } catch {
            return false;
        }
        return false;
    };

    return visit(path);
};

export const normalizeTaskDependencies = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(
        value
            .map((item) => String(item || "").trim())
            .filter(Boolean)
    ));
};

export const getTaskPhase = (task: any) =>
    normalizeTaskText(task?.phase || task?.result?.phase || "");

export const priorityWeight = (value: unknown) => {
    const normalized = normalizeTaskText(value);
    if (normalized === "high") return 3;
    if (normalized === "medium") return 2;
    return 1;
};

export const chooseHigherPriority = (left: unknown, right: unknown) =>
    priorityWeight(right) > priorityWeight(left) ? right : left;

export const buildBacklogTaskKey = (task: any) => {
    const title = normalizeTaskText(task?.title);
    const phase = getTaskPhase(task);
    return title ? `${phase || "unphased"}::${title}` : "";
};

export const keywordMatches = (text: string, keywords: string[]) =>
    keywords.some((keyword) => text.includes(keyword));

export const inferFallbackAgentName = (project: any, message: string) => {
    const text = normalizeTaskText(`${project?.type || ""} ${project?.stack || ""} ${project?.config?.framework || ""} ${message}`);
    if (keywordMatches(text, ["ui", "ux", "diseno", "diseño", "visual", "layout"])) return "Isabella Garcia";
    if (keywordMatches(text, ["frontend", "next", "react", "landing", "page", "componente", "component"])) return "Maya Patel";
    if (keywordMatches(text, ["backend", "api", "endpoint", "server", "servicio"])) return "Ethan Walker";
    if (keywordMatches(text, ["db", "database", "sql", "schema", "migration"])) return "Sophia Chen";
    if (keywordMatches(text, ["deploy", "docker", "runtime", "preview", "infra", "devops"])) return "Benjamin Carter";
    if (keywordMatches(text, ["qa", "test", "bug", "error", "fix", "corregir"])) return "Lucas White";
    return "James Wilson";
};

export const taskRequiresArtifactEvidence = (task: any) => {
    const phase = getTaskPhase(task);
    if (["analysis", "validation", "release"].includes(phase)) return false;

    const text = normalizeTaskText(`${task.title || ""} ${task.description || ""}`);
    const excludes = ["validacion", "validation", "review", "revis", "qa", "test", "testing", "document", "docs", "deploy", "release", "preview", "verificar", "verify", "analiz"];
    if (excludes.some((keyword) => text.includes(keyword))) return false;

    return ["implement", "crear", "build", "fix", "correg", "ajust", "update", "refactor", "agreg", "add", "landing", "pagina", "page", "component", "frontend", "backend", "diseno", "astro", "next"]
        .some((keyword) => text.includes(keyword));
};

export const taskRequiresPreviewEvidence = (task: any, project: any) => {
    const framework = String(project?.config?.framework || project?.stack || "").toLowerCase();
    const projectType = String(project?.type || project?.config?.type || "").toLowerCase();
    const text = `${task.title || ""} ${task.description || ""}`.toLowerCase();
    const webProject = projectType.includes("landing") || framework.includes("next") || framework.includes("astro") || framework.includes("react");
    if (!webProject) return false;

    return ["validacion", "validación", "cierre", "preview", "renderiza", "deploy", "qa", "review"]
        .some((keyword) => text.includes(keyword));
};

export const executeStructuredToolCall = async (call: { server: string; tool: string; args: any }) => {
    if (call.server === "automation") {
        if (call.tool === "ahk_run") {
            return {
                content: [{ type: "text", text: await automationService.runAhk(String(call.args?.code || "")) }],
                isError: false
            };
        }

        if (call.tool === "screenshot") {
            return {
                content: [{ type: "text", text: await automationService.quickAction.takeScreenshot() }],
                isError: false
            };
        }
    }

    return mcpService.callTool(call.server, call.tool, call.args || {});
};
