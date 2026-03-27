import crypto from "crypto";
import { db, markChange } from "./shared";
import { normalizeProject } from "./normalizers";

export const projectDb = {
  addProject: (name: string, path: string, stack?: string, configOrDevCommand: any = {}, legacyAgentCommand?: string) => {
    const config = typeof configOrDevCommand === 'object' && !Array.isArray(configOrDevCommand)
      ? configOrDevCommand
      : { devCommand: typeof configOrDevCommand === 'string' ? configOrDevCommand : '', agentCommand: legacyAgentCommand || '' };
    const existing = db.query("SELECT id FROM projects WHERE name = ?").get(name) as { id: string } | null;
    const id = existing ? existing.id : crypto.randomUUID();
    db.query(`
      INSERT OR REPLACE INTO projects (
        id, name, path, stack, config, goal, type, assigned_port, container_ip, preview_url, runtime_status, runtime_container_name, environment_status, environment_details, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, path, stack || null, JSON.stringify(config), config.goal || '', config.type || 'generic',
      existing ? (db.query("SELECT assigned_port FROM projects WHERE id = ?").get(id) as any)?.assigned_port || null : null,
      existing ? (db.query("SELECT container_ip FROM projects WHERE id = ?").get(id) as any)?.container_ip || null : null,
      existing ? (db.query("SELECT preview_url FROM projects WHERE id = ?").get(id) as any)?.preview_url || null : null,
      existing ? (db.query("SELECT runtime_status FROM projects WHERE id = ?").get(id) as any)?.runtime_status || 'stopped' : 'stopped',
      existing ? (db.query("SELECT runtime_container_name FROM projects WHERE id = ?").get(id) as any)?.runtime_container_name || null : null,
      existing ? (db.query("SELECT environment_status FROM projects WHERE id = ?").get(id) as any)?.environment_status || 'not_prepared' : 'not_prepared',
      existing ? (db.query("SELECT environment_details FROM projects WHERE id = ?").get(id) as any)?.environment_details || null : null,
      existing ? (db.query("SELECT status FROM projects WHERE id = ?").get(id) as any)?.status || 'registered' : 'registered',
      new Date().toISOString()
    );
    markChange();
    return id;
  },

  getProjects: () => (db.query("SELECT * FROM projects ORDER BY created_at DESC").all() as any[]).map(normalizeProject),
  getProjectById: (projectId: string) => {
    const project = db.query("SELECT * FROM projects WHERE id = ?").get(projectId) as any;
    return project ? normalizeProject(project) : null;
  },
  setActiveProject: (name: string) => {
    db.query("UPDATE projects SET is_active = 0").run();
    const result = db.query("UPDATE projects SET is_active = 1 WHERE name = ?").run(name);
    markChange();
    return result.changes > 0;
  },
  getActiveProject: () => db.query("SELECT * FROM projects WHERE is_active = 1").get() as any,
  updateProjectStatus: (projectId: string, status: string) => {
    db.query("UPDATE projects SET status = ? WHERE id = ?").run(status, projectId);
    markChange();
  },
  updateProject: (projectId: string, updates: any) => {
    const allowed = ['stack', 'config', 'goal', 'type', 'assigned_port', 'container_ip', 'preview_url', 'runtime_status', 'runtime_container_name', 'environment_status', 'environment_details', 'status', 'is_busy', 'is_active'];
    for (const key of Object.keys(updates)) {
      if (!allowed.includes(key)) continue;
      let value = updates[key];
      if (key === 'config' || key === 'environment_details') value = value == null ? null : JSON.stringify(value);
      db.query(`UPDATE projects SET ${key} = ? WHERE id = ?`).run(value, projectId);
    }
    markChange();
  },
  getReservedPorts: () => db.query("SELECT assigned_port FROM projects WHERE assigned_port IS NOT NULL ORDER BY assigned_port ASC").all() as { assigned_port: number }[],
  getBlacklistedPorts: () => db.query("SELECT port FROM port_blacklist WHERE is_active = 1 ORDER BY port ASC").all() as { port: number }[],
  blacklistPort: (port: number, reason: string) => {
    const now = new Date().toISOString();
    db.query(`INSERT INTO port_blacklist (port, reason, is_active, created_at, updated_at, last_checked_at) VALUES (?, ?, 1, ?, ?, ?) ON CONFLICT(port) DO UPDATE SET reason = excluded.reason, is_active = 1, updated_at = excluded.updated_at, last_checked_at = excluded.last_checked_at`).run(port, reason, now, now, now);
    markChange();
  },
  releaseBlacklistedPort: (port: number) => {
    db.query("UPDATE port_blacklist SET is_active = 0, updated_at = ?, last_checked_at = ? WHERE port = ?").run(new Date().toISOString(), new Date().toISOString(), port);
    markChange();
  },
  touchBlacklistedPort: (port: number) => {
    db.query("UPDATE port_blacklist SET updated_at = ?, last_checked_at = ? WHERE port = ?").run(new Date().toISOString(), new Date().toISOString(), port);
    markChange();
  },
  setAssignedPort: (projectId: string, port: number | null) => {
    const previewUrl = port == null ? null : `http://127.0.0.1:${port}`;
    db.query("UPDATE projects SET assigned_port = ?, preview_url = ? WHERE id = ?").run(port, previewUrl, projectId);
    markChange();
  },
  clearAssignedPort: (projectId: string) => {
    db.query("UPDATE projects SET assigned_port = NULL, preview_url = NULL WHERE id = ?").run(projectId);
    markChange();
  },
  reserveProjectPort: (projectId: string, startPort: number = 6000) => {
    const existing = db.query("SELECT assigned_port FROM projects WHERE id = ?").get(projectId) as any;
    if (existing?.assigned_port) return existing.assigned_port as number;
    const reserved = new Set((db.query("SELECT assigned_port FROM projects WHERE assigned_port IS NOT NULL").all() as any[]).map((row: any) => Number(row.assigned_port)).filter((value: number) => Number.isFinite(value)));
    let candidate = startPort;
    while (reserved.has(candidate)) candidate += 1;
    db.query("UPDATE projects SET assigned_port = ?, preview_url = ? WHERE id = ?").run(candidate, `http://127.0.0.1:${candidate}`, projectId);
    markChange();
    return candidate;
  },
  isProjectBusy: (projectId: string): boolean => {
    const project = db.query("SELECT is_busy FROM projects WHERE id = ?").get(projectId) as any;
    return project?.is_busy === 1;
  },
  setProjectBusy: (projectId: string, busy: boolean) => {
    db.query("UPDATE projects SET is_busy = ? WHERE id = ?").run(busy ? 1 : 0, projectId);
    markChange();
  },
  setMirrorMode: (projectId: string, mirrorMode: boolean) => {
    db.query("UPDATE projects SET mirror_mode = ? WHERE id = ?").run(mirrorMode ? 1 : 0, projectId);
    markChange();
  },
  deleteProject: (name: string) => {
    const project = db.query("SELECT id FROM projects WHERE name = ?").get(name) as any;
    if (!project) return false;
    db.query("DELETE FROM system_events WHERE project_id = ?").run(project.id);
    db.query("DELETE FROM task_execution_checkpoints WHERE project_id = ?").run(project.id);
    db.query("DELETE FROM task_execution_locks WHERE project_id = ?").run(project.id);
    db.query("DELETE FROM tasks WHERE project_id = ?").run(project.id);
    db.query("DELETE FROM processes WHERE project_id = ?").run(project.id);
    db.query("DELETE FROM project_specialist_reviews WHERE project_id = ?").run(project.id);
    db.query("DELETE FROM project_thread_messages WHERE project_id = ?").run(project.id);
    db.query("DELETE FROM project_state WHERE project_id = ?").run(project.id);
    db.query("DELETE FROM projects WHERE id = ?").run(project.id);
    markChange();
    return true;
  },
  deleteProjectById: (projectId: string) => {
    const project = db.query("SELECT id FROM projects WHERE id = ?").get(projectId) as any;
    if (!project) return false;
    db.query("DELETE FROM system_events WHERE project_id = ?").run(projectId);
    db.query("DELETE FROM task_execution_checkpoints WHERE project_id = ?").run(projectId);
    db.query("DELETE FROM task_execution_locks WHERE project_id = ?").run(projectId);
    db.query("DELETE FROM tasks WHERE project_id = ?").run(projectId);
    db.query("DELETE FROM processes WHERE project_id = ?").run(projectId);
    db.query("DELETE FROM project_specialist_reviews WHERE project_id = ?").run(projectId);
    db.query("DELETE FROM project_thread_messages WHERE project_id = ?").run(projectId);
    db.query("DELETE FROM project_state WHERE project_id = ?").run(projectId);
    db.query("DELETE FROM projects WHERE id = ?").run(projectId);
    markChange();
    return true;
  }
};
