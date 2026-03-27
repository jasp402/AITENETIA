import crypto from "crypto";
import { db, markChange } from "./shared";

export const executionDb = {
  acquireTaskExecutionLock: (taskId: string, projectId: string, ownerToken: string, leaseMs: number = 120000) => {
    const now = Date.now();
    const existing = db.query("SELECT * FROM task_execution_locks WHERE task_id = ?").get(taskId) as any;
    if (existing && existing.owner_token !== ownerToken) {
      const expiresAt = Date.parse(existing.lease_expires_at || "");
      if (Number.isFinite(expiresAt) && expiresAt > now) return false;
    }
    const nowIso = new Date(now).toISOString();
    const leaseExpiresAt = new Date(now + leaseMs).toISOString();
    db.query(`INSERT OR REPLACE INTO task_execution_locks (task_id, project_id, owner_token, lease_expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM task_execution_locks WHERE task_id = ?), ?), ?)`).run(taskId, projectId, ownerToken, leaseExpiresAt, taskId, nowIso, nowIso);
    markChange();
    return true;
  },
  renewTaskExecutionLock: (taskId: string, ownerToken: string, leaseMs: number = 120000) => {
    const nowIso = new Date().toISOString();
    const leaseExpiresAt = new Date(Date.now() + leaseMs).toISOString();
    const result = db.query(`UPDATE task_execution_locks SET lease_expires_at = ?, updated_at = ? WHERE task_id = ? AND owner_token = ?`).run(leaseExpiresAt, nowIso, taskId, ownerToken);
    markChange();
    return Number(result.changes || 0) > 0;
  },
  releaseTaskExecutionLock: (taskId: string, ownerToken?: string) => {
    if (ownerToken) db.query("DELETE FROM task_execution_locks WHERE task_id = ? AND owner_token = ?").run(taskId, ownerToken);
    else db.query("DELETE FROM task_execution_locks WHERE task_id = ?").run(taskId);
    markChange();
  },
  getTaskExecutionLock: (taskId: string) => db.query("SELECT * FROM task_execution_locks WHERE task_id = ?").get(taskId) as any,
  upsertTaskCheckpoint: (data: { task_id: string; project_id: string; status?: string; stage?: string | null; attempt_count?: number; conversation?: any[]; tool_calls?: any[]; evidence?: any; last_error?: string | null; }) => {
    const existing = db.query("SELECT id, created_at FROM task_execution_checkpoints WHERE task_id = ?").get(data.task_id) as any;
    const now = new Date().toISOString();
    const id = existing?.id || crypto.randomUUID();
    db.query(`INSERT OR REPLACE INTO task_execution_checkpoints (id, task_id, project_id, status, stage, attempt_count, conversation_json, tool_calls_json, evidence_json, last_error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, data.task_id, data.project_id, data.status || 'active', data.stage || null, Number(data.attempt_count || 1), JSON.stringify(data.conversation || []), JSON.stringify(data.tool_calls || []), JSON.stringify(data.evidence || {}), data.last_error || null, existing?.created_at || now, now);
    markChange();
    return id;
  },
  getTaskCheckpoint: (taskId: string) => {
    const row = db.query("SELECT * FROM task_execution_checkpoints WHERE task_id = ?").get(taskId) as any;
    if (!row) return null;
    for (const key of ['conversation_json', 'tool_calls_json', 'evidence_json']) {
      if (typeof row[key] === 'string') {
        try { row[key] = JSON.parse(row[key]); } catch { row[key] = key === 'evidence_json' ? {} : []; }
      }
    }
    return { ...row, conversation: row.conversation_json || [], tool_calls: row.tool_calls_json || [], evidence: row.evidence_json || {} };
  },
  getTaskCheckpointAuditByProject: (projectId: string) => {
    const rows = db.query(`SELECT t.id as task_id,t.title as task_title,t.status as task_status,t.execution_stage,t.execution_attempts,t.last_heartbeat_at,cp.id as checkpoint_id,cp.status as checkpoint_status,cp.stage as checkpoint_stage,cp.attempt_count as checkpoint_attempt_count,cp.evidence_json,cp.last_error,cp.updated_at as checkpoint_updated_at,lk.owner_token,lk.lease_expires_at,lk.updated_at as lock_updated_at,a.name as agent_name FROM tasks t LEFT JOIN task_execution_checkpoints cp ON cp.task_id = t.id LEFT JOIN task_execution_locks lk ON lk.task_id = t.id LEFT JOIN agent_registry a ON t.assigned_agent_id = a.id WHERE t.project_id = ? ORDER BY t.priority DESC, t.created_at ASC`).all(projectId) as any[];
    return rows.map((row) => {
      let evidence = row.evidence_json;
      if (typeof evidence === 'string') {
        try { evidence = JSON.parse(evidence); } catch { evidence = {}; }
      }
      return {
        task_id: row.task_id,
        task_title: row.task_title,
        task_status: row.task_status,
        execution_stage: row.execution_stage || row.checkpoint_stage || null,
        execution_attempts: Number(row.execution_attempts || row.checkpoint_attempt_count || 0),
        last_heartbeat_at: row.last_heartbeat_at || null,
        checkpoint: row.checkpoint_id ? { id: row.checkpoint_id, status: row.checkpoint_status || null, stage: row.checkpoint_stage || null, updated_at: row.checkpoint_updated_at || null, last_error: row.last_error || null, evidence: evidence || {} } : null,
        lock: row.owner_token ? { owner_token: row.owner_token, lease_expires_at: row.lease_expires_at || null, updated_at: row.lock_updated_at || null } : null,
        agent_name: row.agent_name || null
      };
    });
  },
  clearTaskCheckpoint: (taskId: string) => {
    db.query("DELETE FROM task_execution_checkpoints WHERE task_id = ?").run(taskId);
    markChange();
  }
};
