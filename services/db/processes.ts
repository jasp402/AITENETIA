import crypto from "crypto";
import { db, markChange } from "./shared";

export const processDb = {
  addProcess: (projectId: string, type: string, command: string, pid: number, port: number | null) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.query(`INSERT INTO processes (id, project_id, type, command, pid, port, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, projectId, type, command, pid, port, 'running', now, now);
    markChange();
    return id;
  },
  updateProcess: (processId: string, updates: any) => {
    const allowed = ['status', 'last_output', 'pid'];
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) db.query(`UPDATE processes SET ${key} = ?, updated_at = ? WHERE id = ?`).run(updates[key], new Date().toISOString(), processId);
    }
    markChange();
  },
  getProcessesByProject: (projectId: string) => db.query("SELECT * FROM processes WHERE project_id = ?").all(projectId) as any[],
  getProcessById: (processId: string) => db.query("SELECT * FROM processes WHERE id = ?").get(processId) as any,
  getRunningProcesses: () => db.query("SELECT * FROM processes WHERE status = 'running' ORDER BY updated_at DESC").all() as any[],
  cleanStaleProcesses: () => {
    db.query("UPDATE processes SET status = 'stopped' WHERE status = 'running'").run();
    markChange();
  }
};
