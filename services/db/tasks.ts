import crypto from "crypto";
import { db, markChange } from "./shared";
import { normalizeTask } from "./normalizers";

export const taskDb = {
  getSystemEvents: (projectId: string) => db.query("SELECT * FROM system_events WHERE project_id = ? ORDER BY id ASC").all(projectId) as any[],
  logSystemEvent: (projectId: string, message: string, type: string = 'info') => {
    db.query("INSERT INTO system_events (project_id, message, type, timestamp) VALUES (?, ?, ?, ?)").run(projectId, message, type, new Date().toISOString());
    markChange();
  },
  updateTask: (taskId: string, updates: any) => {
    const allowed = ['status', 'assigned_agent_id', 'result', 'dependencies', 'priority', 'model_used', 'blocker_type', 'blocker_summary', 'blocker_source_agent_id', 'blocker_created_at', 'blocker_resolved_at', 'execution_stage', 'execution_attempts', 'last_heartbeat_at'];
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) {
        let value = updates[key];
        if (typeof value === 'object') value = JSON.stringify(value);
        db.query(`UPDATE tasks SET ${key} = ?, updated_at = ? WHERE id = ?`).run(value, new Date().toISOString(), taskId);
      }
    }
    markChange();
  },
  getTasksByProject: (projectId: string) => (db.query(`SELECT t.*, a.name as agent_name, a.role as agent_role FROM tasks t LEFT JOIN agent_registry a ON t.assigned_agent_id = a.id WHERE t.project_id = ? ORDER BY t.priority DESC, t.created_at ASC`).all(projectId) as any[]).map(normalizeTask),
  getTaskById: (taskId: string) => {
    const row = db.query(`SELECT t.*, a.name as agent_name, a.role as agent_role FROM tasks t LEFT JOIN agent_registry a ON t.assigned_agent_id = a.id WHERE t.id = ?`).get(taskId) as any;
    return row ? normalizeTask(row) : null;
  },
  setTaskBlocked: (taskId: string, data: { status: 'blocked' | 'awaiting_user' | 'awaiting_peer_review' | 'awaiting_dependency'; blocker_type: string; blocker_summary: string; blocker_source_agent_id?: string | null }) => {
    db.query(`UPDATE tasks SET status = ?, blocker_type = ?, blocker_summary = ?, blocker_source_agent_id = ?, blocker_created_at = ?, blocker_resolved_at = NULL, updated_at = ? WHERE id = ?`).run(data.status, data.blocker_type, data.blocker_summary, data.blocker_source_agent_id || null, new Date().toISOString(), new Date().toISOString(), taskId);
    markChange();
  },
  resolveTaskBlocker: (taskId: string, nextStatus: string = 'running') => {
    db.query(`UPDATE tasks SET status = ?, blocker_resolved_at = ?, updated_at = ? WHERE id = ?`).run(nextStatus, new Date().toISOString(), new Date().toISOString(), taskId);
    markChange();
  },
  retryTask: (taskId: string) => {
    db.query(`UPDATE tasks SET status = 'pending', execution_stage = NULL, blocker_type = NULL, blocker_summary = NULL, blocker_source_agent_id = NULL, blocker_created_at = NULL, blocker_resolved_at = NULL, updated_at = ? WHERE id = ?`).run(new Date().toISOString(), taskId);
    markChange();
  },
  clearSpecialistReviewsByProject: (projectId: string) => {
    db.query("DELETE FROM project_specialist_reviews WHERE project_id = ?").run(projectId);
    markChange();
  },
  upsertSpecialistReview: (projectId: string, agentId: string, review: any) => {
    const existing = db.query("SELECT id, created_at FROM project_specialist_reviews WHERE project_id = ? AND agent_id = ?").get(projectId, agentId) as any;
    const id = existing?.id || crypto.randomUUID();
    const now = new Date().toISOString();
    db.query(`INSERT OR REPLACE INTO project_specialist_reviews (id, project_id, agent_id, status, participates, reason, phase, tasks_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, projectId, agentId, review.status || 'completed', review.participates ? 1 : 0, review.reason || '', review.phase || 'analysis', JSON.stringify(review.tasks || []), existing?.created_at || now, now);
    markChange();
    return id;
  },
  getSpecialistReviewsByProject: (projectId: string) => {
    const rows = db.query(`SELECT r.*, a.name as agent_name, a.role as agent_role, a.title as agent_title FROM project_specialist_reviews r LEFT JOIN agent_registry a ON r.agent_id = a.id WHERE r.project_id = ? ORDER BY a.name ASC`).all(projectId) as any[];
    return rows.map((row) => {
      let tasks = row.tasks_json;
      if (typeof tasks === 'string') {
        try { tasks = JSON.parse(tasks); } catch { tasks = []; }
      }
      return { ...row, participates: row.participates === 1 || row.participates === true, tasks: tasks || [] };
    });
  },
  getTasksByAgentName: (agentName: string) => db.query(`SELECT t.* FROM tasks t JOIN agent_registry a ON t.assigned_agent_id = a.id WHERE a.name = ? ORDER BY t.updated_at DESC`).all(agentName) as any[],
  addTask: (projectId: string, title: string, description: string, agentId: string | null, dependencies: any[] = [], result: any = null, priority: string = 'medium') => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const priorityNum = priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
    db.query("INSERT INTO tasks (id, project_id, title, description, assigned_agent_id, status, dependencies, result, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, projectId, title, description || '', agentId, 'pending', JSON.stringify(dependencies), result ? JSON.stringify(result) : null, priorityNum, now, now);
    markChange();
    return id;
  },
  clearTasksByProject: (projectId: string) => {
    db.query("DELETE FROM tasks WHERE project_id = ?").run(projectId);
    markChange();
  },
  getProjectState: (projectId: string) => {
    const state = db.query("SELECT * FROM project_state WHERE project_id = ?").get(projectId) as any;
    if (state && typeof state.global_context === 'string') {
      try { state.global_context = JSON.parse(state.global_context); } catch { state.global_context = {}; }
    }
    return state || { project_id: projectId, global_context: {} };
  },
  clearSystemEvents: (projectId: string) => {
    db.query("DELETE FROM system_events WHERE project_id = ?").run(projectId);
    markChange();
  }
};
