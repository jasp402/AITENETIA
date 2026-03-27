import crypto from "crypto";
import { db, markChange } from "./shared";

export const agentDb = {
  upsertAgent: (agent: any) => {
    const existing = db.query("SELECT id FROM agent_registry WHERE name = ?").get(agent.name) as any;
    const id = existing ? existing.id : crypto.randomUUID();
    db.query(`
      INSERT OR REPLACE INTO agent_registry (
        id, name, role, title, capabilities, tags, aiProvider, aiModel, 
        colorClass, progressColor, avatarUrl, bannerUrl, projectCount, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      agent.name,
      agent.role || '',
      agent.title || '',
      JSON.stringify(agent.capabilities || []),
      JSON.stringify(agent.tags || []),
      agent.aiProvider || '',
      agent.aiModel || '',
      agent.colorClass || '',
      agent.progressColor || '',
      agent.avatarUrl || '',
      agent.bannerUrl || '',
      agent.projectCount || 0,
      existing ? existing.created_at : new Date().toISOString()
    );
    markChange();
  },

  getAgents: () => {
    const agents = db.query("SELECT * FROM agent_registry").all() as any[];
    return agents.map(a => ({
      ...a,
      capabilities: typeof a.capabilities === 'string' ? JSON.parse(a.capabilities) : (a.capabilities || []),
      tags: typeof a.tags === 'string' ? JSON.parse(a.tags) : (a.tags || [])
    }));
  }
};
