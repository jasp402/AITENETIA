'use client';

import React from 'react';
import { Bot, Folder, Loader2, SendHorizontal, Sparkles } from 'lucide-react';
import { ProjectCards } from '@/components/project-cards';

type ProjectAiPanelProps = {
  selectedProject: any;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  projectTasks: Record<string, any[]>;
  projects: any[];
  selectedProjectTasks: any[];
  threadMessages?: Array<{
    id: string;
    role: 'user' | 'system';
    content: string;
    created_at: string;
    task_id?: string | null;
    task_title?: string | null;
    task_status?: string | null;
    agent_name?: string | null;
    agent_role?: string | null;
    meta?: any;
  }>;
  executionAudit?: any[];
  isSubmittingPrompt?: boolean;
  lastPromptResponse?: {
    analysis: string;
    assignedAgent: { id: string; name: string; role: string };
    task: { title: string; description: string; priority: string; phase: string };
    taskId: string;
  } | null;
  onSubmitPrompt: (message: string) => Promise<boolean> | boolean;
};

export function ProjectAiPanel({
  selectedProject,
  selectedProjectId,
  setSelectedProjectId,
  projectTasks,
  projects,
  selectedProjectTasks,
  threadMessages = [],
  executionAudit = [],
  isSubmittingPrompt = false,
  lastPromptResponse,
  onSubmitPrompt,
}: ProjectAiPanelProps) {
  const [message, setMessage] = React.useState('');

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-8">
      <div className="col-span-9 space-y-6">
        {selectedProject ? (
          <>
            <div className="rounded-[2rem] border border-white/10 bg-[#161522] p-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Bot size={14} className="text-white/30" />
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">
                      IA Workspace
                    </div>
                  </div>
                  <h2 className="mt-4 text-3xl font-black tracking-tight text-white">{selectedProject.name}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">
                    Envía cambios de alcance, errores, decisiones o nuevas instrucciones para convertirlos en trabajo ejecutable.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-right">
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Tareas</div>
                  <div className="mt-2 text-2xl font-black text-white">{selectedProjectTasks.length}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#161522] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Project Prompt</div>
                  <div className="mt-2 text-lg font-black text-white">Nueva instrucción para el proyecto</div>
                </div>
                <div className="text-[11px] font-medium text-white/35">
                  El sistema analizará la solicitud, elegirá especialista y creará tarea.
                </div>
              </div>

              <div className="mt-5 flex items-end gap-3">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Describe el cambio, bug, ajuste o nueva meta para este proyecto..."
                  className="min-h-[120px] flex-1 rounded-2xl border border-white/8 bg-[#11111b] px-4 py-3 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-white/25 focus:border-primary/30"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const clean = message.trim();
                    if (!clean) return;
                    const ok = await onSubmitPrompt(clean);
                    if (ok) setMessage('');
                  }}
                  disabled={isSubmittingPrompt || !message.trim()}
                  className="flex h-[120px] min-w-[160px] flex-col items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-5 text-[10px] font-black uppercase tracking-[0.2em] text-primary transition-all disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSubmittingPrompt ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
                  {isSubmittingPrompt ? 'Procesando' : 'Enviar'}
                </button>
              </div>
            </div>

            {lastPromptResponse && (
              <div className="rounded-[2rem] border border-emerald-400/12 bg-emerald-400/[0.04] p-6">
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                  <Sparkles size={14} /> Última asignación
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <MiniCard label="Especialista" value={lastPromptResponse.assignedAgent?.name || 'N/A'} />
                  <MiniCard label="Rol" value={lastPromptResponse.assignedAgent?.role || 'N/A'} />
                  <MiniCard label="Fase" value={lastPromptResponse.task?.phase || 'N/A'} />
                </div>
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="text-sm font-black text-white">{lastPromptResponse.task?.title}</div>
                  <div className="mt-2 text-sm leading-relaxed text-white/60">{lastPromptResponse.analysis}</div>
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-white/10 bg-[#161522] p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Project Thread</div>
                <div className="mt-4 space-y-3">
                  {threadMessages.slice(-8).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/6 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
                          {item.role === 'user' ? 'Usuario' : item.agent_name || 'Sistema'}
                        </div>
                        <div className="text-[10px] text-white/25">{new Date(item.created_at).toLocaleString()}</div>
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-white/65">{item.content}</div>
                    </div>
                  ))}
                  {threadMessages.length === 0 && (
                    <EmptyState text="Todavía no hay mensajes del proyecto." />
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-[#161522] p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Execution Audit</div>
                <div className="mt-4 space-y-3">
                  {executionAudit.slice(0, 8).map((entry: any) => (
                    <div key={entry.task_id || entry.id} className="rounded-2xl border border-white/6 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-black text-white">{entry.task_title || 'Task'}</div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">{entry.execution_stage || entry.status || 'unknown'}</div>
                      </div>
                      <div className="mt-2 text-xs text-white/45">
                        Intentos: {entry.attempt_count || 0} · Lease: {entry.has_active_lock ? 'activo' : 'sin lock'}
                      </div>
                    </div>
                  ))}
                  {executionAudit.length === 0 && (
                    <EmptyState text="Todavía no hay auditoría de ejecución para este proyecto." />
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] text-center">
            <Folder size={42} className="mb-4 text-white/15" />
            <div className="text-sm font-black uppercase tracking-[0.3em] text-white/35">Selecciona un proyecto</div>
          </div>
        )}
      </div>

      <ProjectCards
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        projectTasks={projectTasks}
      />
    </div>
  );
}

const MiniCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">{label}</div>
    <div className="mt-2 text-sm font-black text-white">{value}</div>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-2xl border border-dashed border-white/8 bg-black/10 px-4 py-8 text-center text-sm text-white/35">
    {text}
  </div>
);
