export type View = "overview" | "kanban" | "fleet" | "agents" | "projects";
export type OverlayMode = "prepare" | "tasks" | null;
export type AgentPanelFilter = "all" | "awaiting_user" | "issues" | "active" | "idle";

export type PreviewStatus = {
  status: "missing" | "unavailable" | "ready" | "error";
  reachable: boolean;
  checkedAt: string;
  reason: string;
};

export type ProjectPromptResponse = {
  analysis: string;
  assignedAgent: {
    id: string;
    name: string;
    role: string;
  };
  task: {
    title: string;
    description: string;
    priority: string;
    phase: string;
  };
  taskId: string;
} | null;
