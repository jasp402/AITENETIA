import { AGENT_ROLES } from "../core/agents";
import { initializeSchema } from "./db/schema";
import { getGlobalFingerprint } from "./db/shared";
import { normalizeProject, normalizeTask } from "./db/normalizers";
import { agentDb } from "./db/agents";
import { projectDb } from "./db/projects";
import { processDb } from "./db/processes";
import { taskDb } from "./db/tasks";
import { interactionDb } from "./db/interactions";
import { executionDb } from "./db/execution";
import { activationDb } from "./db/activation";

export function initializeDatabase() {
  initializeSchema();
  console.log("Seeding agents...");
  for (const agent of AGENT_ROLES) {
    agentDb.upsertAgent(agent);
  }
  console.log("Database initialized and agents synchronized.");
}

export const dbService = {
  getGlobalFingerprint,
  normalizeProject,
  normalizeTask,
  ...agentDb,
  ...projectDb,
  ...processDb,
  ...taskDb,
  ...interactionDb,
  ...executionDb,
  ...activationDb
};
