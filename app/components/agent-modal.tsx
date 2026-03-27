'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle2, Clock3, Loader2, AlertCircle, Briefcase, FolderKanban,
  PauseCircle, UserCircle2, GitPullRequestArrow
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'active' | 'blocked' | 'awaiting_user' | 'awaiting_peer_review' | 'awaiting_dependency';
  priority?: number;
  model_used?: string | null;
  blocker_type?: string | null;
  blocker_summary?: string | null;
  result?: {
    error?: string;
    raw?: string;
    output?: string;
  } | null;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  title?: string;
  description?: string;
  emoji?: string;
  avatar?: string;
  currentTaskName?: string;
}

interface AgentModalProps {
  isOpen: boolean;
  agent: Agent | null;
  projectName: string;
  tasks: Task[];
  canStartProject: boolean;
  canLaunchPreview: boolean;
  canOpenPreview: boolean;
  hasDecisionForTask: (taskId: string) => boolean;
  onStartProject: () => void;
  onLaunchPreview: () => void;
  onOpenPreview: () => void;
  onOpenDecision: (taskId: string) => void;
  onOpenCoordination: () => void;
  onResetBudget: (agentId: string) => void;
  onRetryTask: (taskId: string) => void;
  onClose: () => void;
}

const TASK_SECTIONS = [
  { id: 'running', label: 'En Progreso', empty: 'No hay tareas activas.', icon: Loader2, accent: 'text-blue-300' },
  { id: 'pending', label: 'Pendientes', empty: 'No hay tareas pendientes.', icon: Clock3, accent: 'text-amber-300' },
  { id: 'blocked', label: 'Bloqueadas', empty: 'No hay tareas bloqueadas.', icon: PauseCircle, accent: 'text-orange-300' },
  { id: 'awaiting_user', label: 'Esperando Usuario', empty: 'No hay decisiones pendientes del usuario.', icon: UserCircle2, accent: 'text-fuchsia-300' },
  { id: 'awaiting_peer_review', label: 'Peer Review', empty: 'No hay revisiones pendientes.', icon: GitPullRequestArrow, accent: 'text-cyan-300' },
  { id: 'completed', label: 'Completadas', empty: 'No hay tareas completadas.', icon: CheckCircle2, accent: 'text-emerald-300' },
  { id: 'failed', label: 'Fallidas', empty: 'No hay tareas fallidas.', icon: AlertCircle, accent: 'text-red-300' },
] as const;

const STATUS_LABELS: Record<string, string> = {
  running: 'Trabajando',
  active: 'Trabajando',
  pending: 'Pendiente',
  blocked: 'Bloqueada',
  awaiting_user: 'Necesita tu decision',
  awaiting_peer_review: 'Esperando validacion',
  awaiting_dependency: 'Esperando preview',
  completed: 'Completada',
  failed: 'Necesita reintento',
};

export function AgentModal({
  isOpen,
  agent,
  projectName,
  tasks,
  canStartProject,
  canLaunchPreview,
  canOpenPreview,
  hasDecisionForTask,
  onStartProject,
  onLaunchPreview,
  onOpenPreview,
  onOpenDecision,
  onOpenCoordination,
  onResetBudget,
  onRetryTask,
  onClose
}: AgentModalProps) {
  if (!isOpen || !agent) return null;

  const visibleTasks = {
    running: tasks.filter((task) => task.status === 'running' || task.status === 'active'),
    pending: tasks.filter((task) => task.status === 'pending'),
    blocked: tasks.filter((task) => task.status === 'blocked' || task.status === 'awaiting_dependency'),
    awaiting_user: tasks.filter((task) => task.status === 'awaiting_user'),
    awaiting_peer_review: tasks.filter((task) => task.status === 'awaiting_peer_review'),
    completed: tasks.filter((task) => task.status === 'completed'),
    failed: tasks.filter((task) => task.status === 'failed'),
  };

  const totalTasks = tasks.length;
  const currentTask = visibleTasks.running[0] || visibleTasks.awaiting_user[0] || visibleTasks.blocked[0];
  const avatar = agent.avatar || agent.emoji || 'AI';

  const getTaskAction = (task: Task) => {
    if (task.status === 'failed') {
      return {
        label: 'Programar reintento',
        onClick: () => onRetryTask(task.id),
        className: 'border-red-300/20 bg-red-300/10 text-red-100 hover:border-red-300/35'
      };
    }

    if (task.status === 'awaiting_user') {
      if (hasDecisionForTask(task.id)) {
        return {
          label: 'Responder decision',
          onClick: () => onOpenDecision(task.id),
          className: 'border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100 hover:border-fuchsia-300/35'
        };
      }

      if (task.blocker_type === 'interaction_budget_exhausted') {
        return {
          label: 'Autorizar consultas',
          onClick: () => onResetBudget(agent.id),
          className: 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:border-cyan-300/35'
        };
      }
    }

    if (task.status === 'awaiting_peer_review') {
      return {
        label: 'Ver coordinacion',
        onClick: onOpenCoordination,
        className: 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:border-cyan-300/35'
      };
    }

    if (task.status === 'awaiting_dependency') {
      if (canOpenPreview) {
        return {
          label: 'Abrir preview',
          onClick: onOpenPreview,
          className: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:border-emerald-300/35'
        };
      }

      if (canLaunchPreview) {
        return {
          label: 'Lanzar app',
          onClick: onLaunchPreview,
          className: 'border-sky-300/20 bg-sky-300/10 text-sky-100 hover:border-sky-300/35'
        };
      }

      if (canStartProject) {
        return {
          label: 'Iniciar app',
          onClick: onStartProject,
          className: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:border-emerald-300/35'
        };
      }
    }

    return null;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          className="relative z-10 flex h-[84vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0d] shadow-2xl"
        >
          <div className="border-b border-white/10 bg-white/[0.02] px-8 py-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-5xl">
                  {avatar}
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                    Historial Operativo
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight text-white">{agent.name}</h2>
                    <p className="text-sm text-white/50">{agent.role || agent.title}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-white/45">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                      <FolderKanban size={12} className="text-primary" />
                      {projectName}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                      <Briefcase size={12} className="text-primary" />
                      {totalTasks} {totalTasks === 1 ? 'tarea' : 'tareas'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-full p-2 text-white/30 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-[320px_1fr] overflow-hidden">
            <div className="border-r border-white/10 bg-white/[0.02] p-6">
              <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Foco Actual</div>
                <div className="mt-4">
                  <p className="text-sm font-bold text-white">
                    {currentTask?.title || agent.currentTaskName || 'Sin tarea activa'}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-white/55">
                    {currentTask?.blocker_summary || currentTask?.description || agent.description || 'Este agente no tiene ejecucion activa para el proyecto seleccionado.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {TASK_SECTIONS.map((section) => {
                  const count = visibleTasks[section.id].length;
                  const Icon = section.icon;
                  return (
                    <div key={section.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Icon size={15} className={`${section.accent} ${section.id === 'running' ? 'animate-spin' : ''}`} />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-white/65">{section.label}</span>
                      </div>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black text-white/45">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="space-y-8">
                {TASK_SECTIONS.map((section) => {
                  const tasksForSection = visibleTasks[section.id];
                  const Icon = section.icon;

                  return (
                    <section key={section.id} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Icon size={16} className={`${section.accent} ${section.id === 'running' ? 'animate-spin' : ''}`} />
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/80">{section.label}</h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                      </div>

                      {tasksForSection.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-5 text-sm text-white/35">
                          {section.empty}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tasksForSection.map((task) => {
                            const action = getTaskAction(task);
                            return (
                            <div key={task.id} className="rounded-2xl border border-white/8 bg-[#101014] p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
                                    <span>#{task.id.slice(0, 8)}</span>
                                    {task.model_used ? <span>{task.model_used}</span> : null}
                                  </div>
                                  <h4 className="text-sm font-bold text-white">{task.title}</h4>
                                  <p className="mt-1 text-xs leading-relaxed text-white/55">
                                    {task.description || 'Sin descripcion adicional.'}
                                  </p>
                                  {task.blocker_summary ? (
                                    <div className="mt-3 rounded-xl border border-orange-400/15 bg-orange-400/8 px-3 py-2 text-[11px] leading-relaxed text-orange-100/85">
                                      {task.blocker_summary}
                                    </div>
                                  ) : null}
                                  {task.status === 'failed' && task.result?.error ? (
                                    <div className="mt-3 rounded-xl border border-red-400/15 bg-red-400/8 px-3 py-2 text-[11px] leading-relaxed text-red-100/85">
                                      {task.result.error}
                                    </div>
                                  ) : null}
                                  {task.status === 'failed' && !task.result?.error && task.result?.raw ? (
                                    <div className="mt-3 rounded-xl border border-red-400/15 bg-red-400/8 px-3 py-2 text-[11px] leading-relaxed text-red-100/85">
                                      {task.result.raw}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                  <div className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/45">
                                    {STATUS_LABELS[task.status] || task.status}
                                  </div>
                                  {action ? (
                                    <button
                                      type="button"
                                      onClick={action.onClick}
                                      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all ${action.className}`}
                                    >
                                      {action.label}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          )})}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
