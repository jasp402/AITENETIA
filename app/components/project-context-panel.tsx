'use client';

import React from 'react';
import {
  Sparkles,
  Wand2,
  Play,
  Square,
  ExternalLink,
  Trash2,
  Command,
  Folder,
  Loader2,
  SendHorizontal,
} from 'lucide-react';

type ProjectContextPanelProps = {
  selectedProject: any;
  projectGoal: string;
  selectedProjectTasks: any[];
  selectedProjectReviews: any[];
  selectedProjectDecisionRequests: any[];
  activeAgentsForProject: any[];
  projectProgress: number;
  projectCompletedTasks: number;
  projectActiveTasks: number;
  projectBlockedTasks: number;
  docketLabel: string;
  previewLabel: string;
  previewToneClass: string;
  launchCommand: string | null;
  canLaunchApp: boolean;
  deliveryReady: boolean;
  deliveryReason: string | null;
  isPreparing: boolean;
  isEnvironmentReady: boolean;
  isGenerating: boolean;
  isAnalyzingSpecialists: boolean;
  isRouteMapReady: boolean;
  isRuntimeRunning: boolean;
  isPreviewReady: boolean;
  selectedProjectPreviewStatus?: { reason?: string; status?: string } | null;
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
  onPrepareProject: () => void;
  onGenerateTasks: () => void;
  onStartProject: () => void;
  onStopProject: () => void;
  onLaunchApp: () => void;
  onOpenPreview: () => void;
  onDeleteProject: () => void;
  onOpenRouteMap: () => void;
  onSubmitPrompt: (message: string) => Promise<boolean> | boolean;
};

export const ProjectContextPanel: React.FC<ProjectContextPanelProps> = ({
  selectedProject,
  projectGoal,
  selectedProjectTasks,
  selectedProjectReviews,
  selectedProjectDecisionRequests,
  activeAgentsForProject,
  projectProgress,
  projectCompletedTasks,
  projectActiveTasks,
  projectBlockedTasks,
  docketLabel,
  previewLabel,
  launchCommand,
  canLaunchApp,
  deliveryReady,
  isPreparing,
  isEnvironmentReady,
  isGenerating,
  isAnalyzingSpecialists,
  isRouteMapReady,
  isRuntimeRunning,
  isPreviewReady,
  selectedProjectPreviewStatus,
  threadMessages = [],
  executionAudit = [],
  isSubmittingPrompt = false,
  lastPromptResponse,
  onPrepareProject,
  onGenerateTasks,
  onStartProject,
  onStopProject,
  onLaunchApp,
  onOpenPreview,
  onDeleteProject,
  onOpenRouteMap,
  onSubmitPrompt,
}) => {
  if (!selectedProject) return null;

  const previewUnavailable = !isPreviewReady;
  const previewStateLabel = isPreviewReady ? 'Ready' : isRuntimeRunning ? 'Unavailable' : 'Pending';
  const previewStateColor = isPreviewReady ? 'text-emerald-300' : 'text-yellow-400';
  const livePreviewPill = deliveryReady ? 'Preview ready' : 'Delivery pending';
  const livePreviewPillClass = deliveryReady
    ? 'bg-emerald-400/10 text-emerald-300'
    : 'bg-yellow-400/10 text-yellow-400';
  const previewDescription = isPreviewReady
    ? 'The preview is renderable and ready for review.'
    : isRuntimeRunning
      ? (selectedProjectPreviewStatus?.reason || 'The Docket is on, but there is no web service responding on the preview route.')
      : 'Start the Docket and wait for a renderable service before opening the preview.';
  const assignedAgents = activeAgentsForProject.length.toString();
  const progressGradient = selectedProject?.status === 'delivery_pending'
    ? 'from-indigo-500 via-purple-500 to-emerald-400'
    : 'from-indigo-500 via-sky-500 to-emerald-400';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-white/20">
          <Folder size={12} /> Project Context
        </h2>
      </div>

      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#1a192b] p-8 shadow-2xl transition-all hover:border-white/20">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-10 transition-opacity group-hover:opacity-15"
          style={{
            background: 'linear-gradient(to bottom, rgba(99,102,241,0.45), transparent)',
          }}
        />

        <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-black tracking-tight text-white">
              {selectedProject.name.toLowerCase()}
            </h1>
            <p className="mt-5 max-w-2xl text-[13px] leading-relaxed text-white/40">
              {projectGoal}
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <Badge label={(selectedProject.type || selectedProject.stack || selectedProject.config?.framework || 'custom').toLowerCase()} />
              <Badge label={`Environment: ${selectedProject.environment_status || 'not_prepared'}`} />
              <Badge label={`Docket: ${docketLabel}`} />
              <Badge label={`Preview: ${previewLabel}`} />
              <Badge label={`Tasks: ${selectedProjectTasks.length}`} />
              <Badge label={`Reviews: ${selectedProjectReviews.length}/14`} />
              <Badge label={`Decisions: ${selectedProjectDecisionRequests.filter((request: any) => request.status === 'open').length}`} />
            </div>
          </div>

          <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] lg:w-[400px]">
            <div className="flex-1 p-6">
              <header className="mb-6 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Preview Surface</span>
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${previewStateColor}`}>{previewStateLabel}</span>
              </header>

              {isPreviewReady && selectedProject.preview_url ? (
                <div className="overflow-hidden rounded-xl border border-white/5 bg-black/20">
                  <div className="origin-top-left scale-[0.52]" style={{ width: '192%', height: '192%' }}>
                    <iframe
                      title={`${selectedProject.name} preview thumbnail`}
                      src={selectedProject.preview_url}
                      className="h-[420px] w-full border-0 bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.03] text-white/20">
                    <ExternalLink className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-black text-white">
                    {previewUnavailable ? 'No renderable preview yet' : 'Preview ready'}
                  </h3>
                  <p className="mt-2 max-w-[200px] text-[10px] leading-relaxed text-white/30">
                    {previewDescription}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 bg-white/[0.02] px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">Live Preview</span>
                  <div className={`h-1.5 w-1.5 rounded-full ${isPreviewReady ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'animate-pulse bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)]'}`} />
                </div>
                <span className={`rounded-lg px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider ${livePreviewPillClass}`}>
                  {livePreviewPill}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <ActionButton
            icon={Sparkles}
            label={isPreparing ? 'Preparando...' : 'Preparar Ambiente'}
            primary
            onClick={onPrepareProject}
            disabled={isPreparing}
          />
          <ActionButton
            icon={Wand2}
            label={isAnalyzingSpecialists ? 'Analizando...' : isRouteMapReady ? 'Ver RouteMap' : 'Generar Tareas'}
            primary
            onClick={isRouteMapReady ? onOpenRouteMap : onGenerateTasks}
            disabled={!isEnvironmentReady || (isGenerating && !isRouteMapReady)}
          />
          <ActionButton
            icon={Play}
            label="Start"
            color="text-white/20"
            onClick={onStartProject}
            disabled={!isEnvironmentReady || isRuntimeRunning}
          />
          <ActionButton
            icon={Square}
            label="Stop"
            color="text-yellow-400"
            onClick={onStopProject}
            disabled={!isRuntimeRunning}
          />
          <ActionButton
            icon={Command}
            label={launchCommand ? 'Launch App' : 'No App Command'}
            color={launchCommand ? 'text-sky-300' : 'text-white/20'}
            onClick={onLaunchApp}
            disabled={!canLaunchApp}
          />
          <ActionButton
            icon={ExternalLink}
            label="Preview"
            color="text-white"
            onClick={onOpenPreview}
            disabled={!selectedProject.preview_url}
          />
          <ActionButton
            icon={Trash2}
            label="Delete"
            color="text-rose-400"
            onClick={onDeleteProject}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">Project Progress</span>
              <span className="text-3xl font-black text-white">{projectProgress}%</span>
            </div>
            <div className="flex gap-6">
              <MiniStat label="Completed" value={String(projectCompletedTasks)} color="text-emerald-400" />
              <MiniStat label="Active" value={String(projectActiveTasks)} color="text-blue-400" />
              <MiniStat label="Blocked" value={String(projectBlockedTasks)} color="text-yellow-400" />
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full bg-gradient-to-r ${progressGradient} transition-all duration-1000`}
              style={{ width: `${Math.max(projectProgress, 4)}%` }}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Environment" value={selectedProject.environment_status || 'not_prepared'} />
          <StatCard label="Runtime" value={docketLabel} />
          <StatCard label="Preview Status" value={previewLabel} highlight={previewUnavailable} />
          <StatCard label="Assigned Agents" value={assignedAgents} />
        </div>

      </div>
    </div>
  );
};

const Badge = ({ label }: { label: string }) => (
  <span className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2 text-[10px] font-bold text-white/50">
    {label}
  </span>
);

const MiniStat = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="flex flex-col items-end gap-0.5">
    <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">{label}</span>
    <span className={`text-lg font-black ${color}`}>{value}</span>
  </div>
);

const ActionButton = ({
  icon: Icon,
  label,
  primary,
  color = 'text-white/40',
  full = false,
  onClick,
  disabled,
}: {
  icon: any;
  label: string;
  primary?: boolean;
  color?: string;
  full?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 py-5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
      full ? 'sm:col-span-2' : ''
    } ${
      primary
        ? 'border-indigo-500/20 bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20'
        : 'bg-white/[0.02] hover:bg-white/[0.05]'
    }`}
  >
    <Icon className={`h-6 w-6 transition-colors ${primary ? 'text-indigo-400' : color} group-hover:opacity-100`} />
    <span className={`px-2 text-center text-[8px] font-bold uppercase tracking-[0.15em] ${primary ? 'text-indigo-300' : color}`}>
      {label}
    </span>
  </button>
);

const StatCard = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04]">
    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">
      {label}
    </span>
    <div className={`mt-3 truncate text-xl font-black tracking-tight ${highlight ? 'text-yellow-400' : 'text-white/90'}`}>
      {value}
    </div>
  </div>
);

const AuditMini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-white/6 bg-black/20 px-3 py-2">
    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/22">{label}</div>
    <div className="mt-1 text-xs font-black text-white/80">{value}</div>
  </div>
);

const PromptDock = ({
  threadMessages,
  executionAudit,
  isSubmitting,
  lastResponse,
  onSubmit,
}: {
  threadMessages: Array<{
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
  executionAudit: any[];
  isSubmitting: boolean;
  lastResponse?: {
    analysis: string;
    assignedAgent: { id: string; name: string; role: string };
    task: { title: string; description: string; priority: string; phase: string };
    taskId: string;
  } | null;
  onSubmit: (message: string) => Promise<boolean> | boolean;
}) => {
  const [message, setMessage] = React.useState('');

  return (
    <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">Project Prompt</div>
            <div className="mt-1 text-sm font-black text-white">Reporta cambios, errores o nuevo alcance para el equipo</div>
          </div>
          <div className="text-[10px] font-semibold text-white/35">
            El sistema analizara la solicitud, asignara responsable y creara una tarea.
          </div>
        </div>

        <div className="flex items-end gap-3">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Describe el cambio de alcance, el error encontrado o la nueva instruccion para el equipo..."
            className="min-h-[86px] flex-1 rounded-2xl border border-white/8 bg-[#131321] px-4 py-3 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-white/25 focus:border-primary/30"
          />
          <button
            type="button"
            onClick={async () => {
              const clean = message.trim();
              if (!clean) return;
              const ok = await onSubmit(clean);
              if (ok) setMessage('');
            }}
            disabled={isSubmitting || !message.trim()}
            className="flex h-[86px] min-w-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
            {isSubmitting ? 'Procesando' : 'Enviar'}
          </button>
        </div>

        {threadMessages.length > 0 ? (
          <div className="space-y-3 rounded-2xl border border-white/6 bg-black/20 p-3">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Project Thread</div>
            {threadMessages.slice(-6).map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border px-4 py-3 ${
                  item.role === 'user'
                    ? 'ml-auto max-w-[88%] border-white/8 bg-white/[0.04]'
                    : 'mr-auto max-w-[92%] border-primary/12 bg-primary/6'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                  <span>{item.role === 'user' ? 'You' : 'System'}</span>
                  {item.agent_name ? <span>{item.agent_name}</span> : null}
                  {item.task_status ? (
                    <span className="rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1 text-white/40">
                      {item.task_status}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/72">{item.content}</p>
                {item.task_title ? (
                  <div className="mt-3 rounded-xl border border-white/6 bg-black/20 px-3 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Linked task</div>
                    <div className="mt-1 text-xs font-black text-white">{item.task_title}</div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {executionAudit.length > 0 ? (
          <div className="space-y-3 rounded-2xl border border-white/6 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Execution Audit</div>
              <div className="text-[10px] font-semibold text-white/35">
                {executionAudit.filter((item: any) => item.lock).length} leases · {executionAudit.filter((item: any) => item.checkpoint?.last_error).length} errores
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {executionAudit.slice(0, 6).map((item: any) => {
                const evidence = item.checkpoint?.evidence || {};
                const verifiedFiles = Array.isArray(evidence.verified_files) ? evidence.verified_files : [];
                const stage = item.execution_stage || item.checkpoint?.stage || 'pending';
                const lastError = item.checkpoint?.last_error || null;
                const leaseActive = !!item.lock?.lease_expires_at && new Date(item.lock.lease_expires_at).getTime() > Date.now();

                return (
                  <div key={item.task_id} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                      <span>{item.agent_name || 'Agent'}</span>
                      <span className="rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1 text-white/40">{item.task_status}</span>
                      <span className="rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1 text-white/40">{stage}</span>
                      {leaseActive ? (
                        <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-300">lease</span>
                      ) : null}
                    </div>

                    <div className="mt-3 text-sm font-black text-white">{item.task_title}</div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                      <AuditMini label="Attempts" value={String(item.execution_attempts || 0)} />
                      <AuditMini label="Evidence" value={String(verifiedFiles.length)} />
                      <AuditMini
                        label="Heartbeat"
                        value={item.last_heartbeat_at ? new Date(item.last_heartbeat_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                      />
                    </div>

                    {evidence.report_summary ? (
                      <p className="mt-3 text-xs leading-relaxed text-white/55">{String(evidence.report_summary)}</p>
                    ) : null}

                    {verifiedFiles.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {verifiedFiles.slice(0, 3).map((file: string) => (
                          <span key={file} className="rounded-lg border border-sky-400/10 bg-sky-400/10 px-2 py-1 text-[10px] font-semibold text-sky-200">
                            {file}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {lastError ? (
                      <div className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/8 px-3 py-2 text-xs leading-relaxed text-rose-200">
                        {lastError}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {lastResponse ? (
          <div className="rounded-2xl border border-primary/12 bg-primary/6 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/80">Analisis</span>
              <span className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
                {lastResponse.assignedAgent.name}
              </span>
              <span className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
                {lastResponse.task.priority}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{lastResponse.analysis}</p>
            <div className="mt-4 rounded-xl border border-white/6 bg-black/20 p-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">Nueva tarea creada</div>
              <div className="mt-2 text-sm font-black text-white">{lastResponse.task.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-white/45">{lastResponse.task.description}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
