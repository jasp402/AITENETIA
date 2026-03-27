export const normalizeProject = (project: any) => {
  if (!project) return project;

  let config = project.config;
  if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch { config = {}; }
  }
  if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch { config = {}; }
  }

  let environmentDetails = project.environment_details;
  if (typeof environmentDetails === 'string') {
    try { environmentDetails = JSON.parse(environmentDetails); } catch { environmentDetails = null; }
  }

  return {
    ...project,
    config: config || {},
    goal: project.goal || config?.goal || null,
    type: project.type && project.type !== 'generic' ? project.type : (config?.type || 'generic'),
    environment_details: environmentDetails,
    assigned_port: project.assigned_port ?? null,
    container_ip: project.container_ip ?? null,
    preview_url: project.preview_url ?? null,
    runtime_status: project.runtime_status || 'stopped',
    runtime_container_name: project.runtime_container_name || null
  };
};

export const normalizeTask = (task: any) => {
  if (!task) return task;

  let dependencies = task.dependencies;
  if (typeof dependencies === 'string') {
    try { dependencies = JSON.parse(dependencies); } catch { dependencies = []; }
  }

  let result = task.result;
  if (typeof result === 'string') {
    try { result = JSON.parse(result); } catch {}
  }

  return {
    ...task,
    dependencies: dependencies || [],
    result: result ?? null,
    execution_stage: task.execution_stage || null,
    execution_attempts: Number(task.execution_attempts || 0),
    last_heartbeat_at: task.last_heartbeat_at || null,
    blocker_type: task.blocker_type || null,
    blocker_summary: task.blocker_summary || null,
    blocker_source_agent_id: task.blocker_source_agent_id || null,
    blocker_created_at: task.blocker_created_at || null,
    blocker_resolved_at: task.blocker_resolved_at || null,
  };
};
