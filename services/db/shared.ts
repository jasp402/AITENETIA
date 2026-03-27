import { Database } from "bun:sqlite";

export const db = new Database("bun-ai-api.sqlite", { create: true });

db.query("PRAGMA journal_mode = WAL;").run();
db.query("PRAGMA busy_timeout = 5000;").run();

let globalLastUpdate = Date.now();

export const markChange = () => {
  globalLastUpdate = Date.now();
};

export const getGlobalFingerprint = () => globalLastUpdate;
