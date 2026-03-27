import { db } from "./shared";

export function initializeSchema() {
  console.log("Initializing Database...");
  const workspaceRoot = process.cwd();

  db.query(`CREATE TABLE IF NOT EXISTS request_logs (request_id TEXT PRIMARY KEY,timestamp TEXT NOT NULL,providers_tried TEXT,final_provider TEXT,stream BOOLEAN,token_estimate INTEGER,total_latency_ms INTEGER,success BOOLEAN,error_details TEXT);`).run();
  db.query(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,name TEXT,channel TEXT,busy_until TEXT,quiet_hours_start TEXT DEFAULT '22:00',quiet_hours_end TEXT DEFAULT '09:00',nudge_delay_hours INTEGER DEFAULT 12,created_at TEXT);`).run();
  db.query(`CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,channel TEXT NOT NULL,updated_at TEXT,last_nudge_at TEXT,FOREIGN KEY(user_id) REFERENCES users(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL,role TEXT NOT NULL,content TEXT NOT NULL,timestamp TEXT,is_analyzed BOOLEAN DEFAULT 0,FOREIGN KEY(conversation_id) REFERENCES conversations(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS memory_rules (id TEXT PRIMARY KEY,type TEXT NOT NULL,content TEXT NOT NULL,is_active BOOLEAN DEFAULT 1,created_at TEXT);`).run();
  db.query(`CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,channel TEXT NOT NULL,message TEXT NOT NULL,execute_at TEXT NOT NULL,is_executed BOOLEAN DEFAULT 0,created_at TEXT,FOREIGN KEY(user_id) REFERENCES users(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS mcp_servers (id TEXT PRIMARY KEY,name TEXT UNIQUE NOT NULL,type TEXT NOT NULL,command TEXT,args TEXT,env TEXT,url TEXT,is_active BOOLEAN DEFAULT 1,created_at TEXT);`).run();
  db.query(`CREATE TABLE IF NOT EXISTS port_blacklist (port INTEGER PRIMARY KEY,reason TEXT,is_active BOOLEAN DEFAULT 1,created_at TEXT,updated_at TEXT,last_checked_at TEXT);`).run();
  db.query(`CREATE TABLE IF NOT EXISTS project_specialist_reviews (id TEXT PRIMARY KEY,project_id TEXT NOT NULL,agent_id TEXT NOT NULL,status TEXT DEFAULT 'pending',participates BOOLEAN DEFAULT 0,reason TEXT,phase TEXT DEFAULT 'analysis',tasks_json TEXT,created_at TEXT,updated_at TEXT,FOREIGN KEY(project_id) REFERENCES projects(id),FOREIGN KEY(agent_id) REFERENCES agent_registry(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS decision_requests (id TEXT PRIMARY KEY,project_id TEXT NOT NULL,task_id TEXT NOT NULL,agent_id TEXT NOT NULL,question TEXT NOT NULL,context TEXT,options_json TEXT,recommended_option TEXT,impact_if_delayed TEXT,status TEXT DEFAULT 'open',user_response TEXT,created_at TEXT,resolved_at TEXT,FOREIGN KEY(project_id) REFERENCES projects(id),FOREIGN KEY(task_id) REFERENCES tasks(id),FOREIGN KEY(agent_id) REFERENCES agent_registry(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS project_thread_messages (id TEXT PRIMARY KEY,project_id TEXT NOT NULL,request_id TEXT,role TEXT NOT NULL,content TEXT NOT NULL,meta_json TEXT,assigned_agent_id TEXT,task_id TEXT,created_at TEXT,FOREIGN KEY(project_id) REFERENCES projects(id),FOREIGN KEY(assigned_agent_id) REFERENCES agent_registry(id),FOREIGN KEY(task_id) REFERENCES tasks(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS agent_interactions (id TEXT PRIMARY KEY,project_id TEXT NOT NULL,task_id TEXT NOT NULL,from_agent_id TEXT NOT NULL,to_agent_id TEXT NOT NULL,type TEXT NOT NULL,message TEXT NOT NULL,response TEXT,status TEXT DEFAULT 'open',round_number INTEGER DEFAULT 1,created_at TEXT,resolved_at TEXT,FOREIGN KEY(project_id) REFERENCES projects(id),FOREIGN KEY(task_id) REFERENCES tasks(id),FOREIGN KEY(from_agent_id) REFERENCES agent_registry(id),FOREIGN KEY(to_agent_id) REFERENCES agent_registry(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS task_execution_checkpoints (id TEXT PRIMARY KEY,task_id TEXT NOT NULL,project_id TEXT NOT NULL,status TEXT DEFAULT 'active',stage TEXT,attempt_count INTEGER DEFAULT 1,conversation_json TEXT,tool_calls_json TEXT,evidence_json TEXT,last_error TEXT,created_at TEXT,updated_at TEXT,FOREIGN KEY(task_id) REFERENCES tasks(id),FOREIGN KEY(project_id) REFERENCES projects(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS task_execution_locks (task_id TEXT PRIMARY KEY,project_id TEXT NOT NULL,owner_token TEXT NOT NULL,lease_expires_at TEXT NOT NULL,created_at TEXT,updated_at TEXT,FOREIGN KEY(task_id) REFERENCES tasks(id),FOREIGN KEY(project_id) REFERENCES projects(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS agent_interaction_budget (project_id TEXT NOT NULL,agent_id TEXT NOT NULL,budget_total INTEGER DEFAULT 3,budget_used INTEGER DEFAULT 0,reset_count INTEGER DEFAULT 0,user_reset_required BOOLEAN DEFAULT 0,high_interaction_flag BOOLEAN DEFAULT 0,updated_at TEXT,PRIMARY KEY(project_id, agent_id),FOREIGN KEY(project_id) REFERENCES projects(id),FOREIGN KEY(agent_id) REFERENCES agent_registry(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,path TEXT NOT NULL,stack TEXT,config TEXT,goal TEXT,type TEXT DEFAULT 'generic',assigned_port INTEGER UNIQUE,container_ip TEXT,preview_url TEXT,runtime_status TEXT DEFAULT 'stopped',runtime_container_name TEXT,environment_status TEXT DEFAULT 'not_prepared',environment_details TEXT,mirror_mode BOOLEAN DEFAULT 0,status TEXT DEFAULT 'idle',is_busy BOOLEAN DEFAULT 0,is_active BOOLEAN DEFAULT 0,created_at TEXT);`).run();
  db.query(`CREATE TABLE IF NOT EXISTS agent_registry (id TEXT PRIMARY KEY,name TEXT UNIQUE NOT NULL,role TEXT,title TEXT,capabilities TEXT,tags TEXT,aiProvider TEXT,aiModel TEXT,colorClass TEXT,progressColor TEXT,avatarUrl TEXT,bannerUrl TEXT,projectCount INTEGER DEFAULT 0,soul TEXT,manual TEXT,status TEXT DEFAULT 'available',created_at TEXT);`).run();
  db.query(`CREATE TABLE IF NOT EXISTS system_events (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL, message TEXT NOT NULL, type TEXT DEFAULT 'info', timestamp TEXT, FOREIGN KEY(project_id) REFERENCES projects(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, assigned_agent_id TEXT, status TEXT DEFAULT 'pending', dependencies TEXT, result TEXT, priority INTEGER DEFAULT 0, model_used TEXT, created_at TEXT, updated_at TEXT, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(assigned_agent_id) REFERENCES agent_registry(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS processes (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, type TEXT NOT NULL, command TEXT NOT NULL, pid INTEGER NOT NULL, port INTEGER, status TEXT DEFAULT 'running', last_output TEXT, created_at TEXT, updated_at TEXT, FOREIGN KEY(project_id) REFERENCES projects(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS project_state (project_id TEXT PRIMARY KEY, global_context TEXT, updated_at TEXT, FOREIGN KEY(project_id) REFERENCES projects(id));`).run();
  db.query(`CREATE TABLE IF NOT EXISTS activation_state (id TEXT PRIMARY KEY,license_id TEXT,customer_name TEXT,activation_key_hash TEXT,activation_status TEXT DEFAULT 'locked',activation_mode TEXT,activated_at TEXT,last_validated_at TEXT,onboarding_completed BOOLEAN DEFAULT 0,survey_json TEXT);`).run();
  db.query(`CREATE TABLE IF NOT EXISTS app_security (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT);`).run();

  const migrations = [
    "ALTER TABLE agent_registry ADD COLUMN title TEXT",
    "ALTER TABLE agent_registry ADD COLUMN tags TEXT",
    "ALTER TABLE agent_registry ADD COLUMN aiProvider TEXT",
    "ALTER TABLE agent_registry ADD COLUMN aiModel TEXT",
    "ALTER TABLE agent_registry ADD COLUMN colorClass TEXT",
    "ALTER TABLE agent_registry ADD COLUMN progressColor TEXT",
    "ALTER TABLE agent_registry ADD COLUMN avatarUrl TEXT",
    "ALTER TABLE agent_registry ADD COLUMN bannerUrl TEXT",
    "ALTER TABLE agent_registry ADD COLUMN projectCount INTEGER DEFAULT 0",
    "ALTER TABLE projects ADD COLUMN goal TEXT",
    "ALTER TABLE projects ADD COLUMN type TEXT DEFAULT 'generic'",
    "ALTER TABLE projects ADD COLUMN assigned_port INTEGER",
    "ALTER TABLE projects ADD COLUMN container_ip TEXT",
    "ALTER TABLE projects ADD COLUMN preview_url TEXT",
    "ALTER TABLE projects ADD COLUMN runtime_status TEXT DEFAULT 'stopped'",
    "ALTER TABLE projects ADD COLUMN runtime_container_name TEXT",
    "ALTER TABLE projects ADD COLUMN environment_status TEXT DEFAULT 'not_prepared'",
    "ALTER TABLE projects ADD COLUMN environment_details TEXT",
    "CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, channel TEXT NOT NULL, updated_at TEXT, last_nudge_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id))",
    "CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, timestamp TEXT, is_analyzed BOOLEAN DEFAULT 0, FOREIGN KEY(conversation_id) REFERENCES conversations(id))",
    "CREATE TABLE IF NOT EXISTS memory_rules (id TEXT PRIMARY KEY, type TEXT NOT NULL, content TEXT NOT NULL, is_active BOOLEAN DEFAULT 1, created_at TEXT)",
    "CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, channel TEXT NOT NULL, message TEXT NOT NULL, execute_at TEXT NOT NULL, is_executed BOOLEAN DEFAULT 0, created_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id))",
    "CREATE TABLE IF NOT EXISTS mcp_servers (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, type TEXT NOT NULL, command TEXT, args TEXT, env TEXT, url TEXT, is_active BOOLEAN DEFAULT 1, created_at TEXT)",
    "ALTER TABLE conversations ADD COLUMN last_nudge_at TEXT",
    "CREATE TABLE IF NOT EXISTS project_specialist_reviews (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, agent_id TEXT NOT NULL, status TEXT DEFAULT 'pending', participates BOOLEAN DEFAULT 0, reason TEXT, phase TEXT DEFAULT 'analysis', tasks_json TEXT, created_at TEXT, updated_at TEXT, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(agent_id) REFERENCES agent_registry(id))",
    "CREATE TABLE IF NOT EXISTS decision_requests (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, agent_id TEXT NOT NULL, question TEXT NOT NULL, context TEXT, options_json TEXT, recommended_option TEXT, impact_if_delayed TEXT, status TEXT DEFAULT 'open', user_response TEXT, created_at TEXT, resolved_at TEXT, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(task_id) REFERENCES tasks(id), FOREIGN KEY(agent_id) REFERENCES agent_registry(id))",
    "CREATE TABLE IF NOT EXISTS project_thread_messages (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, request_id TEXT, role TEXT NOT NULL, content TEXT NOT NULL, meta_json TEXT, assigned_agent_id TEXT, task_id TEXT, created_at TEXT, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(assigned_agent_id) REFERENCES agent_registry(id), FOREIGN KEY(task_id) REFERENCES tasks(id))",
    "CREATE TABLE IF NOT EXISTS agent_interactions (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, task_id TEXT NOT NULL, from_agent_id TEXT NOT NULL, to_agent_id TEXT NOT NULL, type TEXT NOT NULL, message TEXT NOT NULL, response TEXT, status TEXT DEFAULT 'open', round_number INTEGER DEFAULT 1, created_at TEXT, resolved_at TEXT, FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(task_id) REFERENCES tasks(id), FOREIGN KEY(from_agent_id) REFERENCES agent_registry(id), FOREIGN KEY(to_agent_id) REFERENCES agent_registry(id))",
    "CREATE TABLE IF NOT EXISTS task_execution_checkpoints (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, project_id TEXT NOT NULL, status TEXT DEFAULT 'active', stage TEXT, attempt_count INTEGER DEFAULT 1, conversation_json TEXT, tool_calls_json TEXT, evidence_json TEXT, last_error TEXT, created_at TEXT, updated_at TEXT, FOREIGN KEY(task_id) REFERENCES tasks(id), FOREIGN KEY(project_id) REFERENCES projects(id))",
    "CREATE TABLE IF NOT EXISTS task_execution_locks (task_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, owner_token TEXT NOT NULL, lease_expires_at TEXT NOT NULL, created_at TEXT, updated_at TEXT, FOREIGN KEY(task_id) REFERENCES tasks(id), FOREIGN KEY(project_id) REFERENCES projects(id))",
    "CREATE TABLE IF NOT EXISTS agent_interaction_budget (project_id TEXT NOT NULL, agent_id TEXT NOT NULL, budget_total INTEGER DEFAULT 3, budget_used INTEGER DEFAULT 0, reset_count INTEGER DEFAULT 0, user_reset_required BOOLEAN DEFAULT 0, high_interaction_flag BOOLEAN DEFAULT 0, updated_at TEXT, PRIMARY KEY(project_id, agent_id), FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(agent_id) REFERENCES agent_registry(id))",
    "CREATE TABLE IF NOT EXISTS activation_state (id TEXT PRIMARY KEY, license_id TEXT, customer_name TEXT, activation_key_hash TEXT, activation_status TEXT DEFAULT 'locked', activation_mode TEXT, activated_at TEXT, last_validated_at TEXT, onboarding_completed BOOLEAN DEFAULT 0, survey_json TEXT)",
    "CREATE TABLE IF NOT EXISTS app_security (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT)",
    "ALTER TABLE tasks ADD COLUMN model_used TEXT",
    "ALTER TABLE tasks ADD COLUMN blocker_type TEXT",
    "ALTER TABLE tasks ADD COLUMN blocker_summary TEXT",
    "ALTER TABLE tasks ADD COLUMN blocker_source_agent_id TEXT",
    "ALTER TABLE tasks ADD COLUMN blocker_created_at TEXT",
    "ALTER TABLE tasks ADD COLUMN blocker_resolved_at TEXT",
    "ALTER TABLE tasks ADD COLUMN execution_stage TEXT",
    "ALTER TABLE tasks ADD COLUMN execution_attempts INTEGER DEFAULT 0",
    "ALTER TABLE tasks ADD COLUMN last_heartbeat_at TEXT",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_assigned_port ON projects(assigned_port)"
  ];

  for (const migration of migrations) {
    try { db.query(migration).run(); } catch {}
  }

  db.query(
    `INSERT OR IGNORE INTO mcp_servers (id, name, type, command, args, env, url, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "filesystem-default",
    "filesystem",
    "stdio",
    "npx",
    JSON.stringify(["-y", "@modelcontextprotocol/server-filesystem", workspaceRoot]),
    null,
    null,
    1,
    new Date().toISOString()
  );
}
