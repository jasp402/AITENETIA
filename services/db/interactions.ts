import crypto from "crypto";
import { db, markChange } from "./shared";

export const interactionDb = {
  createDecisionRequest: (data: { project_id: string; task_id: string; agent_id: string; question: string; context?: string; options?: string[]; recommended_option?: string; impact_if_delayed?: string; }) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.query(`INSERT INTO decision_requests (id, project_id, task_id, agent_id, question, context, options_json, recommended_option, impact_if_delayed, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`).run(id, data.project_id, data.task_id, data.agent_id, data.question, data.context || '', JSON.stringify(data.options || []), data.recommended_option || null, data.impact_if_delayed || '', now);
    markChange();
    return id;
  },
  createProjectThreadMessage: (data: { project_id: string; request_id?: string | null; role: 'user' | 'system'; content: string; meta?: any; assigned_agent_id?: string | null; task_id?: string | null; }) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.query(`INSERT INTO project_thread_messages (id, project_id, request_id, role, content, meta_json, assigned_agent_id, task_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, data.project_id, data.request_id || null, data.role, data.content, data.meta ? JSON.stringify(data.meta) : null, data.assigned_agent_id || null, data.task_id || null, now);
    markChange();
    return id;
  },
  getProjectThreadMessages: (projectId: string) => {
    const rows = db.query(`SELECT m.*, a.name as agent_name, a.role as agent_role, t.title as task_title, t.status as task_status FROM project_thread_messages m LEFT JOIN agent_registry a ON m.assigned_agent_id = a.id LEFT JOIN tasks t ON m.task_id = t.id WHERE m.project_id = ? ORDER BY m.created_at ASC`).all(projectId) as any[];
    return rows.map((row) => {
      let meta = row.meta_json;
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch { meta = null; }
      }
      return { ...row, meta: meta || null };
    });
  },
  getDecisionRequestsByProject: (projectId: string) => {
    const rows = db.query(`SELECT d.*, a.name as agent_name, a.role as agent_role, t.title as task_title FROM decision_requests d LEFT JOIN agent_registry a ON d.agent_id = a.id LEFT JOIN tasks t ON d.task_id = t.id WHERE d.project_id = ? ORDER BY d.created_at DESC`).all(projectId) as any[];
    return rows.map((row) => {
      let options = row.options_json;
      if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch { options = []; }
      }
      return { ...row, options: options || [] };
    });
  },
  answerDecisionRequest: (requestId: string, userResponse: string) => {
    db.query(`UPDATE decision_requests SET status = 'answered', user_response = ?, resolved_at = ? WHERE id = ?`).run(userResponse, new Date().toISOString(), requestId);
    markChange();
  },
  getDecisionRequestById: (requestId: string) => {
    const row = db.query("SELECT * FROM decision_requests WHERE id = ?").get(requestId) as any;
    if (!row) return null;
    let options = row.options_json;
    if (typeof options === 'string') {
      try { options = JSON.parse(options); } catch { options = []; }
    }
    return { ...row, options: options || [] };
  },
  ensureInteractionBudget: (projectId: string, agentId: string) => {
    const existing = db.query("SELECT * FROM agent_interaction_budget WHERE project_id = ? AND agent_id = ?").get(projectId, agentId) as any;
    if (existing) return existing;
    const now = new Date().toISOString();
    db.query(`INSERT INTO agent_interaction_budget (project_id, agent_id, budget_total, budget_used, reset_count, user_reset_required, high_interaction_flag, updated_at) VALUES (?, ?, 3, 0, 0, 0, 0, ?)`).run(projectId, agentId, now);
    markChange();
    return db.query("SELECT * FROM agent_interaction_budget WHERE project_id = ? AND agent_id = ?").get(projectId, agentId) as any;
  },
  getInteractionBudget: function (projectId: string, agentId: string) { return interactionDb.ensureInteractionBudget(projectId, agentId); },
  getInteractionBudgetsByProject: (projectId: string) => db.query(`SELECT b.*, a.name as agent_name, a.role as agent_role FROM agent_interaction_budget b LEFT JOIN agent_registry a ON b.agent_id = a.id WHERE b.project_id = ? ORDER BY a.name ASC`).all(projectId) as any[],
  consumeInteractionBudget: (projectId: string, agentId: string) => {
    const current = interactionDb.ensureInteractionBudget(projectId, agentId);
    const nextUsed = Number(current.budget_used || 0) + 1;
    const total = Number(current.budget_total || 3);
    db.query(`UPDATE agent_interaction_budget SET budget_used = ?, user_reset_required = ?, high_interaction_flag = ?, updated_at = ? WHERE project_id = ? AND agent_id = ?`).run(nextUsed, nextUsed >= total ? 1 : 0, nextUsed >= total ? 1 : (current.high_interaction_flag ? 1 : 0), new Date().toISOString(), projectId, agentId);
    markChange();
  },
  resetInteractionBudget: (projectId: string, agentId: string) => {
    const current = interactionDb.ensureInteractionBudget(projectId, agentId);
    db.query(`UPDATE agent_interaction_budget SET budget_used = 0, reset_count = ?, user_reset_required = 0, updated_at = ? WHERE project_id = ? AND agent_id = ?`).run(Number(current.reset_count || 0) + 1, new Date().toISOString(), projectId, agentId);
    markChange();
  },
  createAgentInteraction: (data: { project_id: string; task_id: string; from_agent_id: string; to_agent_id: string; type: 'handoff' | 'consultation' | 'review'; message: string; round_number?: number; status?: string; }) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.query(`INSERT INTO agent_interactions (id, project_id, task_id, from_agent_id, to_agent_id, type, message, status, round_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, data.project_id, data.task_id, data.from_agent_id, data.to_agent_id, data.type, data.message, data.status || 'open', data.round_number || 1, now);
    markChange();
    return id;
  },
  resolveAgentInteraction: (interactionId: string, data: { response: string; status: 'answered' | 'approved' | 'rejected' | 'escalated'; }) => {
    db.query(`UPDATE agent_interactions SET response = ?, status = ?, resolved_at = ? WHERE id = ?`).run(data.response, data.status, new Date().toISOString(), interactionId);
    markChange();
  },
  updateAgentInteractionStatus: (interactionId: string, status: string, response?: string | null) => {
    db.query(`UPDATE agent_interactions SET status = ?, response = COALESCE(?, response) WHERE id = ?`).run(status, response || null, interactionId);
    markChange();
  },
  getAgentInteractionsByProject: (projectId: string) => db.query(`SELECT i.*, fa.name as from_agent_name, ta.name as to_agent_name, t.title as task_title FROM agent_interactions i LEFT JOIN agent_registry fa ON i.from_agent_id = fa.id LEFT JOIN agent_registry ta ON i.to_agent_id = ta.id LEFT JOIN tasks t ON i.task_id = t.id WHERE i.project_id = ? ORDER BY i.created_at DESC`).all(projectId) as any[],
  getAgentInteractionById: (interactionId: string) => db.query("SELECT * FROM agent_interactions WHERE id = ?").get(interactionId) as any,
  getOpenAgentInteractionsByTask: (taskId: string) => db.query("SELECT * FROM agent_interactions WHERE task_id = ? AND status IN ('open', 'requested', 'waiting') ORDER BY created_at DESC").all(taskId) as any[],
  getPendingAgentInteractionsByProject: (projectId: string) => db.query(`SELECT i.*, fa.name as from_agent_name, ta.name as to_agent_name, t.title as task_title FROM agent_interactions i LEFT JOIN agent_registry fa ON i.from_agent_id = fa.id LEFT JOIN agent_registry ta ON i.to_agent_id = ta.id LEFT JOIN tasks t ON i.task_id = t.id WHERE i.project_id = ? AND i.status IN ('requested', 'waiting') ORDER BY i.created_at ASC`).all(projectId) as any[]
};
