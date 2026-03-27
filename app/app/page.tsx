'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Box, ChevronRight, Filter, Folder, Hand, PauseCircle, PlayCircle, RefreshCcw, ScanSearch, TriangleAlert, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Sidebar } from '@/components/sidebar';
import { PageHeader } from '@/components/page-header';
import { AgentCard } from '@/components/agent-card';
import { KanbanBoard } from '@/components/kanban-board';
import { AgentModal } from '@/components/agent-modal';
import { ProjectCard } from '@/components/project-card';
import { ProjectCards } from '@/components/project-cards';
import { ProjectWizard } from '@/components/project-wizard';
import { SpecialistRouteMapModal } from '@/components/specialist-routemap-modal';
import { DecisionInbox } from '@/components/decision-inbox';
import { AgentInteractionFeed } from '@/components/agent-interaction-feed';
import { ProjectAiPanel } from '@/components/project-ai-panel';
import { ProjectActivityFeed } from '@/components/project-activity-feed';
import { SystemInitOverlay } from '@/components/system-init-overlay';
import { ActivationGate, type ActivationPersistence, type ActivationSurveyAnswers, type SystemReadiness } from '@/components/activation-gate';
import { ProjectContextPanel } from '@/components/project-context-panel';
import { AGENTS } from '@/lib/agents';
import { notifications } from '@/lib/notifications';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AgentsView } from './mission-control/agents-view';
import { FleetView } from './mission-control/fleet-view';
import { OverviewView } from './mission-control/overview-view';
import { ProjectsView } from './mission-control/projects-view';
import { ActionIconButton } from './mission-control/action-icon-button';

type View = 'overview' | 'ia' | 'kanban' | 'fleet' | 'agents' | 'projects';
type OverlayMode = 'prepare' | 'tasks' | null;
type AgentPanelFilter = 'all' | 'awaiting_user' | 'issues' | 'active' | 'idle';
type PreviewStatus = {
  status: 'missing' | 'unavailable' | 'ready' | 'error';
  reachable: boolean;
  checkedAt: string;
  reason: string;
};

type ProjectPromptResponse = {
  analysis: string;
  assignedAgent: {
    id: string;
    name: string;
    role: string;
  };
  task: {
    title: string;
    description: string;
    priority: string;
    phase: string;
  };
  taskId: string;
} | null;

function getApiUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4001`;
  }
  return 'http://localhost:4001';
}

export default function MissionControlPage() {
  const [mounted, setMounted] = useState(false);
  const [activationBootstrapDone, setActivationBootstrapDone] = useState(false);
  const [currentView, setCurrentView] = useState<View>('overview');
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'connecting'>('connecting');
  const [systemReadiness, setSystemReadiness] = useState<SystemReadiness | null>(null);
  const [activationState, setActivationState] = useState<ActivationPersistence | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>(AGENTS);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [projectTasks, setProjectTasks] = useState<Record<string, any[]>>({});
  const [projectReviews, setProjectReviews] = useState<Record<string, any[]>>({});
  const [projectRouteMaps, setProjectRouteMaps] = useState<Record<string, any>>({});
  const [projectDecisionRequests, setProjectDecisionRequests] = useState<Record<string, any[]>>({});
  const [projectAgentInteractions, setProjectAgentInteractions] = useState<Record<string, any[]>>({});
  const [projectInteractionBudgets, setProjectInteractionBudgets] = useState<Record<string, any[]>>({});
  const [projectEvents, setProjectEvents] = useState<Record<string, any[]>>({});
  const [projectThreadMessages, setProjectThreadMessages] = useState<Record<string, any[]>>({});
  const [projectExecutionAudit, setProjectExecutionAudit] = useState<Record<string, any[]>>({});
  const [projectPreviewStatuses, setProjectPreviewStatuses] = useState<Record<string, PreviewStatus>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [overlayProjectId, setOverlayProjectId] = useState<string | null>(null);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>(null);
  const [isRouteMapOpen, setIsRouteMapOpen] = useState(false);
  const [isMaterializingPlan, setIsMaterializingPlan] = useState(false);
  const [highlightedDecisionId, setHighlightedDecisionId] = useState<string | null>(null);
  const [agentPanelFilter, setAgentPanelFilter] = useState<AgentPanelFilter>('all');
  const [isSubmittingProjectPrompt, setIsSubmittingProjectPrompt] = useState(false);
  const [lastProjectPromptResponse, setLastProjectPromptResponse] = useState<ProjectPromptResponse>(null);

  const lastFingerprint = useRef<number>(0);
  const decisionInboxRef = useRef<HTMLDivElement | null>(null);
  const coordinationRef = useRef<HTMLDivElement | null>(null);
  const surfacedNotificationKeys = useRef<Set<string>>(new Set());
  const API_URL = useMemo(() => getApiUrl(), []);
  const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
    fetch(input, {
      credentials: 'include',
      ...init
    });

  const fetchSystemReadiness = async () => {
    try {
      const response = await apiFetch(`${API_URL}/api/v1/system/readiness`);
      if (!response.ok) throw new Error('System readiness unavailable');
      const payload = await response.json() as SystemReadiness;
      setSystemReadiness(payload);
    } catch {
      setSystemReadiness(null);
    }
  };

  const fetchActivationSession = async () => {
    try {
      const response = await apiFetch(`${API_URL}/api/v1/system/activation/session`);
      if (!response.ok) throw new Error('Activation session unavailable');
      const payload = await response.json() as ActivationPersistence;
      if (payload.status === 'validated') {
        const revalidateResponse = await apiFetch(`${API_URL}/api/v1/system/activation/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (revalidateResponse.ok) {
          const revalidated = await revalidateResponse.json() as ActivationPersistence;
          setActivationState(revalidated);
        } else {
          setActivationState({ status: 'locked' });
        }
      } else {
        setActivationState(payload);
      }
    } catch {
      setActivationState({ status: 'locked' });
    } finally {
      setActivationBootstrapDone(true);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchSystemReadiness();
    fetchActivationSession();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const hasOperationalAccess = activationBootstrapDone && activationState?.status === 'validated' && Boolean(activationState.completedAt);
    if (!hasOperationalAccess) return;

    fetchInitialData();

    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`${API_URL}/api/v1/fingerprint`);
        if (res.ok) {
          const { fingerprint } = await res.json() as { fingerprint: number };
          if (fingerprint !== lastFingerprint.current) {
            await fetchInitialData();
            await fetchSystemReadiness();
            await fetchActivationSession();
            lastFingerprint.current = fingerprint;
          }
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch {
        setApiStatus('offline');
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [mounted, activationBootstrapDone, activationState?.status, activationState?.completedAt]);

  useEffect(() => {
    if (!mounted) return;
    fetchSystemReadiness();
  }, [mounted]);

  useEffect(() => {
    setHighlightedDecisionId(null);
  }, [selectedProjectId]);

  useEffect(() => {
    setAgentPanelFilter('all');
    setLastProjectPromptResponse(null);
  }, [selectedProjectId]);

  useEffect(() => {
    Object.entries(projectDecisionRequests).forEach(([projectId, requests]) => {
      requests
        .filter((request: any) => request.status === 'open')
        .forEach((request: any) => {
          const key = `decision:${request.id}`;
          if (surfacedNotificationKeys.current.has(key)) return;
          surfacedNotificationKeys.current.add(key);
          notifications.needsHuman(
            'Intervencion humana requerida',
            `${request.agent_name || 'Un agente'} necesita tu decision para continuar ${request.task_title ? `con "${request.task_title}"` : 'la ejecucion'}.`,
            {
              label: 'Resolver',
              onClick: () => {
                setSelectedProjectId(projectId);
                setSelectedAgent(null);
                setCurrentView('overview');
                setHighlightedDecisionId(request.id);
                setTimeout(() => {
                  decisionInboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
              },
            }
          );
        });
    });

    Object.entries(projectInteractionBudgets).forEach(([projectId, budgets]) => {
      budgets
        .filter((budget: any) => Boolean(budget.user_reset_required))
        .forEach((budget: any) => {
          const key = `budget:${projectId}:${budget.agent_id}`;
          if (surfacedNotificationKeys.current.has(key)) return;
          surfacedNotificationKeys.current.add(key);
          notifications.needsHuman(
            'Agente sin margen de coordinacion',
            `${budget.agent_name || 'Un agente'} agoto sus comodines y necesita una intervencion humana para continuar.`,
            {
              label: 'Revisar',
              onClick: () => {
                setSelectedProjectId(projectId);
                setSelectedAgent(null);
                setCurrentView('overview');
                setTimeout(() => {
                  coordinationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
              },
            }
          );
        });
    });

    Object.entries(projectTasks).forEach(([projectId, tasks]) => {
      tasks
        .filter((task: any) => task.status === 'failed')
        .forEach((task: any) => {
          const key = `failed:${task.id}`;
          if (surfacedNotificationKeys.current.has(key)) return;
          surfacedNotificationKeys.current.add(key);
          notifications.needsHuman(
            'Agente bloqueado por error',
            `${task.title || 'Una tarea'} fallo y requiere revision humana antes de seguir.`,
            {
              label: 'Abrir',
              onClick: () => {
                setSelectedProjectId(projectId);
                setSelectedAgent(null);
                setCurrentView('kanban');
              },
            }
          );
        });
    });
  }, [projectDecisionRequests, projectInteractionBudgets, projectTasks]);

  const fetchInitialData = async () => {
    try {
      const [projRes, agentsRes] = await Promise.all([
        apiFetch(`${API_URL}/api/v1/projects`).catch(() => null),
        apiFetch(`${API_URL}/api/v1/agents`).catch(() => null)
      ]);

      if (!projRes?.ok || !agentsRes?.ok) {
        if (projRes?.status === 401 || agentsRes?.status === 401) {
          setActivationState({ status: 'locked' });
        }
        setApiStatus('offline');
        return;
      }

      setApiStatus('online');
      const projData = await projRes.json() as any[];
      const agentsData = await agentsRes.json() as any[];

      const enrichedAgents = agentsData
        .map((apiAgent: any) => {
          const localAgent = AGENTS.find((a: any) =>
            a.name.toLowerCase().includes(apiAgent.name.toLowerCase()) ||
            apiAgent.name.toLowerCase().includes(a.name.toLowerCase()) ||
            (a.title && apiAgent.name.toLowerCase().includes(a.title.toLowerCase()))
          );

          if (!localAgent) return null;

          return {
            ...apiAgent,
            ...localAgent,
            id: apiAgent.id || localAgent.id,
            role: apiAgent.role || localAgent.title,
            status: apiAgent.status || localAgent.status || 'idle',
            progress: apiAgent.progress ?? localAgent.progress ?? 0,
            currentTaskId: apiAgent.currentTaskId,
            currentTaskName: apiAgent.currentTaskName,
            tags: localAgent.tags || apiAgent.tags || [],
          };
        })
        .filter(Boolean);

      const taskMap: Record<string, any[]> = {};
      const reviewMap: Record<string, any[]> = {};
      const routeMapMap: Record<string, any> = {};
      const decisionMap: Record<string, any[]> = {};
      const interactionMap: Record<string, any[]> = {};
      const budgetMap: Record<string, any[]> = {};
      const eventMap: Record<string, any[]> = {};
      const threadMap: Record<string, any[]> = {};
      const executionAuditMap: Record<string, any[]> = {};
      const previewStatusMap: Record<string, PreviewStatus> = {};
      const allTasksList: any[] = [];

      for (const p of projData) {
        try {
          const [tRes, rRes, rmRes, dRes, iRes, bRes, eRes, psRes, thRes, xaRes] = await Promise.all([
            apiFetch(`${API_URL}/api/v1/tasks/${p.id}`),
            apiFetch(`${API_URL}/api/v1/projects/${p.id}/specialist-reviews`),
            apiFetch(`${API_URL}/api/v1/projects/${p.id}/routemap`),
            apiFetch(`${API_URL}/api/v1/projects/${p.id}/decision-requests`),
            apiFetch(`${API_URL}/api/v1/projects/${p.id}/agent-interactions`),
            apiFetch(`${API_URL}/api/v1/projects/${p.id}/interaction-budgets`),
            apiFetch(`${API_URL}/api/v1/projects/${p.id}/events`),
            apiFetch(`${API_URL}/api/v1/projects/${p.id}/preview-status`),
            apiFetch(`${API_URL}/api/v1/projects/${p.id}/thread-messages`),
            apiFetch(`${API_URL}/api/v1/projects/${p.id}/execution-audit`)
          ]);
          if (tRes.ok) {
            const tData = await tRes.json() as any[];
            taskMap[p.id] = tData;
            allTasksList.push(...tData);
          }
          if (rRes.ok) {
            reviewMap[p.id] = await rRes.json() as any[];
          }
          if (rmRes.ok) {
            routeMapMap[p.id] = await rmRes.json();
          }
          if (dRes.ok) {
            decisionMap[p.id] = await dRes.json() as any[];
          }
          if (iRes.ok) {
            interactionMap[p.id] = await iRes.json() as any[];
          }
          if (bRes.ok) {
            budgetMap[p.id] = await bRes.json() as any[];
          }
          if (eRes.ok) {
            eventMap[p.id] = await eRes.json() as any[];
          }
          if (psRes.ok) {
            previewStatusMap[p.id] = await psRes.json() as PreviewStatus;
          }
          if (thRes.ok) {
            threadMap[p.id] = await thRes.json() as any[];
          }
          if (xaRes.ok) {
            executionAuditMap[p.id] = await xaRes.json() as any[];
          }
        } catch {
          // ignore per-project failures
        }
      }

      setProjects(projData);
      setAgents(enrichedAgents);
      setProjectTasks(taskMap);
      setProjectReviews(reviewMap);
      setProjectRouteMaps(routeMapMap);
      setProjectDecisionRequests(decisionMap);
      setProjectAgentInteractions(interactionMap);
      setProjectInteractionBudgets(budgetMap);
      setProjectEvents(eventMap);
      setProjectThreadMessages(threadMap);
      setProjectExecutionAudit(executionAuditMap);
      setProjectPreviewStatuses(previewStatusMap);
      setAllTasks(allTasksList);
      setSelectedProjectId((current) => {
        if (projData.length === 0) return null;
        if (current && projData.some((project: any) => project.id === current)) return current;
        return projData[0].id;
      });
    } catch {
      setApiStatus('offline');
    }
  };

  const handleCreateProject = async (data: any) => {
    try {
      const res = await apiFetch(`${API_URL}/api/v1/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          config: JSON.stringify(data.config)
        })
      });

      const responseData = await res.json().catch(() => null) as { id?: string; error?: string } | null;
      if (!res.ok) {
        throw new Error(responseData?.error || 'No se pudo crear el proyecto.');
      }
      if (!responseData?.id) {
        throw new Error('La API no devolvio el identificador del proyecto.');
      }

      setSelectedProjectId(responseData.id);
      await fetchInitialData();
      setOverlayProjectId(responseData.id);
      setOverlayMode('prepare');

      const prepareRes = await apiFetch(`${API_URL}/api/v1/projects/${responseData.id}/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!prepareRes.ok) {
        const preparePayload = await prepareRes.json().catch(() => null) as { error?: string } | null;
        throw new Error(preparePayload?.error || 'El proyecto fue creado, pero no se pudo iniciar la preparacion del entorno.');
      }
      await fetchInitialData();
    } catch (e) {
      console.error(e);
      notifications.error(
        'No se pudo crear el proyecto',
        e instanceof Error ? e.message : 'La solicitud de creacion no pudo completarse.'
      );
      setOverlayMode(null);
      setOverlayProjectId(null);
    }
  };

  const handlePrepareProject = async (projectId: string, goal: string) => {
    try {
      setSelectedProjectId(projectId);
      setOverlayProjectId(projectId);
      setOverlayMode('prepare');
      await apiFetch(`${API_URL}/api/v1/projects/${projectId}/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });
    } catch (e) {
      console.error(e);
      setOverlayMode(null);
      setOverlayProjectId(null);
    }
  };

  const handleGenerateTasks = async (projectId: string, goal: string) => {
    try {
      setSelectedProjectId(projectId);
      setIsRouteMapOpen(true);
      const project = projects.find((item) => item.id === projectId);
      if (project?.status === 'route_map_ready') {
        await fetchInitialData();
        return;
      }
      await apiFetch(`${API_URL}/api/v1/projects/${projectId}/generate-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });
    } catch (e) {
      console.error(e);
      setOverlayMode(null);
      setOverlayProjectId(null);
    }
  };

  const handleConfirmRouteMap = async (projectId: string) => {
    try {
      setIsMaterializingPlan(true);
      await apiFetch(`${API_URL}/api/v1/projects/${projectId}/materialize-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      setIsRouteMapOpen(false);
      await fetchInitialData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsMaterializingPlan(false);
    }
  };

  const handleAnswerDecision = async (requestId: string, answer: string) => {
    try {
      await apiFetch(`${API_URL}/api/v1/decision-requests/${requestId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userResponse: answer })
      });
      setHighlightedDecisionId(null);
      notifications.success('Decision registrada', 'El agente recibio tu respuesta y puede continuar su flujo.', { label: 'Leido' });
      await fetchInitialData();
    } catch (e) {
      console.error(e);
      notifications.error('No se pudo registrar la decision', e instanceof Error ? e.message : 'La respuesta no pudo enviarse.', { label: 'Leido' });
    }
  };

  const handleResetBudget = async (agentId: string) => {
    if (!selectedProject) return;
    try {
      await apiFetch(`${API_URL}/api/v1/projects/${selectedProject.id}/interaction-budgets/${agentId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      notifications.success('Comodines reiniciados', 'El agente puede volver a coordinar con el equipo.', { label: 'Leido' });
      await fetchInitialData();
    } catch (e) {
      console.error(e);
      notifications.error('No se pudo reiniciar el presupuesto', e instanceof Error ? e.message : 'La accion no pudo completarse.', { label: 'Leido' });
    }
  };

  const handleRetryTask = async (taskId: string) => {
    try {
      const res = await apiFetch(`${API_URL}/api/v1/tasks/${taskId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const fallbackMessage = res.status === 404
          ? 'El backend activo no reconoce la accion de reintento. Reinicia el servidor para cargar la ruta nueva.'
          : 'No se pudo reintentar la tarea.';
        throw new Error(payload?.error || fallbackMessage);
      }
      notifications.success(
        'Reintento programado',
        'La tarea entro de nuevo en cola. El orquestador procesara otro intento y el agente retomara ese trabajo.',
        { label: 'Entendido' }
      );
      await fetchInitialData();
    } catch (e) {
      console.error(e);
      notifications.error(
        'No se pudo programar el reintento',
        e instanceof Error ? e.message : 'No se pudo reintentar la tarea.',
        { label: 'Entendido' }
      );
    }
  };

  const handleReviewTasks = () => {
    setCurrentView('kanban');
    notifications.success('Vista de tareas abierta', 'Ahora ves el tablero para revisar el estado y detalle de las tareas del proyecto.', { label: 'Entendido' });
  };

  const handleActivationValidated = async (nextState: ActivationPersistence) => {
    setActivationState(nextState);
    await fetchSystemReadiness();
  };

  const handleActivationCompleted = async (survey: ActivationSurveyAnswers) => {
    const response = await apiFetch(`${API_URL}/api/v1/system/activation/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ survey })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || 'No se pudo completar el onboarding de seguridad.');
    }

    const payload = await response.json() as ActivationPersistence;
    setActivationState(payload);
    await fetchActivationSession();
    await fetchSystemReadiness();
    await fetchInitialData();
  };

  const handleSubmitProjectPrompt = async (message: string) => {
    if (!selectedProject) return false;

    try {
      setIsSubmittingProjectPrompt(true);
      const res = await apiFetch(`${API_URL}/api/v1/projects/${selectedProject.id}/user-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const fallbackMessage = res.status === 404
          ? 'El backend activo no reconoce aun la ruta de project prompt. Reinicia el servidor para cargar la version nueva.'
          : 'No se pudo procesar la solicitud para el proyecto.';
        throw new Error(payload?.error || fallbackMessage);
      }

      setLastProjectPromptResponse(payload?.result || null);
      notifications.success(
        'Solicitud analizada',
        `Se designo a ${payload?.result?.assignedAgent?.name || 'un especialista'} y ya se creo una tarea para atender el pedido.`,
        { label: 'Entendido' }
      );
      await fetchInitialData();
      return true;
    } catch (e) {
      console.error(e);
      notifications.error(
        'No se pudo procesar la solicitud',
        e instanceof Error ? e.message : 'La instruccion no pudo convertirse en trabajo ejecutable.',
        { label: 'Entendido' }
      );
      return false;
    } finally {
      setIsSubmittingProjectPrompt(false);
    }
  };

  const handleRetryProjectTasks = async () => {
    if (!selectedProject) return;

    const failedTasks = selectedProjectTasks.filter((task) => task.status === 'failed');
    if (failedTasks.length === 0) {
      notifications.warning('Sin tareas para reintentar', 'Este proyecto no tiene tareas fallidas en este momento.', { label: 'Entendido' });
      return;
    }

    const results = await Promise.allSettled(
      failedTasks.map((task) =>
        apiFetch(`${API_URL}/api/v1/tasks/${task.id}/retry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );

    const succeeded = results.filter((result) => result.status === 'fulfilled' && result.value.ok).length;
    const failed = results.length - succeeded;

    if (succeeded > 0) {
      notifications.success(
        'Reintentos programados',
        failed === 0
          ? `${succeeded} tareas fallidas entraron de nuevo en cola para otro intento.`
          : `${succeeded} tareas entraron en cola, pero ${failed} no pudieron reintentarse.`,
        { label: 'Entendido' }
      );
      await fetchInitialData();
      return;
    }

    notifications.error('No se pudieron reintentar tareas', 'El backend rechazo el reintento masivo o las tareas ya cambiaron de estado.', { label: 'Entendido' });
  };

  const handleResumePausedTasks = async () => {
    if (!selectedProject) return;

    const pausedTasks = selectedProjectTasks.filter((task) => ['blocked', 'awaiting_dependency', 'awaiting_peer_review'].includes(task.status));
    if (pausedTasks.length === 0) {
      notifications.warning('Sin tareas pausadas', 'No hay tareas pausadas por bloqueos tecnicos o dependencias para reanudar.', { label: 'Entendido' });
      return;
    }

    const results = await Promise.allSettled(
      pausedTasks.map((task) =>
        apiFetch(`${API_URL}/api/v1/tasks/${task.id}/resume`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );

    const succeeded = results.filter((result) => result.status === 'fulfilled' && result.value.ok).length;
    const failed = results.length - succeeded;

    if (succeeded > 0) {
      notifications.success(
        'Reanudacion programada',
        failed === 0
          ? `${succeeded} tareas pausadas fueron reactivadas y volveran a procesarse en cola.`
          : `${succeeded} tareas pausadas fueron reactivadas, pero ${failed} no pudieron reanudarse.`,
        { label: 'Entendido' }
      );
      await fetchInitialData();
      return;
    }

    notifications.error('No se pudieron reanudar tareas', 'Las tareas pausadas no pudieron volver a cola desde la interfaz.', { label: 'Entendido' });
  };

  const handleOpenDecisionForTask = (taskId: string) => {
    if (!selectedProject) return;
    const request = selectedProjectDecisionRequests.find((item: any) => item.status === 'open' && item.task_id === taskId);
    setSelectedAgent(null);
    setCurrentView('overview');
    setHighlightedDecisionId(request?.id || null);
    setTimeout(() => {
      decisionInboxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleOpenCoordination = () => {
    setSelectedAgent(null);
    setCurrentView('overview');
    setTimeout(() => {
      coordinationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleOpenPreview = () => {
    if (!selectedProject?.preview_url) return;
    window.open(selectedProject.preview_url, '_blank', 'noopener,noreferrer');
  };

  const handleStartProject = async (projectId: string) => {
    try {
      const res = await apiFetch(`${API_URL}/api/v1/projects/${projectId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo iniciar el runtime del proyecto.');
      }
      notifications.success('Runtime iniciando', 'El entorno del proyecto esta levantando contenedor y preparando la vista previa.', { label: 'Leido' });
      await fetchInitialData();
    } catch (e) {
      console.error(e);
      notifications.error('No se pudo iniciar el proyecto', e instanceof Error ? e.message : 'No se pudo iniciar el runtime del proyecto.', { label: 'Leido' });
    }
  };

  const handleLaunchApp = async (projectId: string) => {
    try {
      const res = await apiFetch(`${API_URL}/api/v1/projects/${projectId}/launch-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || payload?.success === false) {
        throw new Error(payload?.reason || payload?.error || 'No se pudo lanzar la app del proyecto.');
      }
      notifications.success('App lanzada', 'La aplicacion del proyecto recibio la orden de arranque.', { label: 'Leido' });
      await fetchInitialData();
    } catch (e) {
      console.error(e);
      notifications.error('No se pudo lanzar la app', e instanceof Error ? e.message : 'No se pudo lanzar la app del proyecto.', { label: 'Leido' });
    }
  };

  const handleStopProject = async (projectId: string) => {
    try {
      await apiFetch(`${API_URL}/api/v1/projects/${projectId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      await fetchInitialData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await apiFetch(`${API_URL}/api/v1/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
      await fetchInitialData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOverlayComplete = async () => {
    setOverlayMode(null);
    setOverlayProjectId(null);
    await fetchInitialData();
    setCurrentView('overview');
  };

  const header = useMemo(() => {
    switch (currentView) {
      case 'overview': return { title: 'Operational Overview', subtitle: 'Project context, environment state and active specialists' };
      case 'ia': return { title: 'Project IA', subtitle: 'Project prompt, routing and execution context for new instructions' };
      case 'kanban': return { title: 'A2A Workflow', subtitle: 'Task synchronization and execution by status' };
      case 'fleet': return { title: 'Fleet View', subtitle: 'Global list of agents and their current assignments' };
      case 'agents': return { title: 'Specialist Registry', subtitle: 'Agents filtered by the selected project' };
      case 'projects': return { title: 'Project Repository', subtitle: 'Registered workspaces and environment readiness' };
      default: return { title: 'Mission Control', subtitle: 'Core System Initialization' };
    }
  }, [currentView]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;
  const selectedProjectTasks = selectedProject ? (projectTasks[selectedProject.id] || []) : [];
  const selectedProjectReviews = selectedProject ? (projectReviews[selectedProject.id] || []) : [];
  const selectedProjectRouteMap = selectedProject ? (projectRouteMaps[selectedProject.id] || null) : null;
  const selectedProjectDecisionRequests = selectedProject ? (projectDecisionRequests[selectedProject.id] || []) : [];
  const selectedProjectAgentInteractions = selectedProject ? (projectAgentInteractions[selectedProject.id] || []) : [];
  const selectedProjectInteractionBudgets = selectedProject ? (projectInteractionBudgets[selectedProject.id] || []) : [];
  const selectedProjectEvents = selectedProject ? (projectEvents[selectedProject.id] || []) : [];
  const selectedProjectThread = selectedProject ? (projectThreadMessages[selectedProject.id] || []) : [];
  const selectedProjectExecutionAudit = selectedProject ? (projectExecutionAudit[selectedProject.id] || []) : [];
  const selectedProjectPreviewStatus = selectedProject ? projectPreviewStatuses[selectedProject.id] : null;
  const selectedProjectTasksByAgent = selectedProjectTasks.reduce((acc: Record<string, any[]>, task: any) => {
    if (!task.assigned_agent_id) return acc;
    if (!acc[task.assigned_agent_id]) acc[task.assigned_agent_id] = [];
    const bucket = acc[task.assigned_agent_id];
    if (bucket) bucket.push(task);
    return acc;
  }, {} as Record<string, any[]>);

  const activeAgentsForProject = useMemo(() => {
    if (!selectedProject) return [];

    const priorityForAgent = (agent: any) => {
      switch (agent.visualState) {
        case 'awaiting_user':
          return 0;
        case 'delivery_pending':
          return 1;
        case 'active':
          return 2;
        case 'awaiting_peer_review':
          return 3;
        case 'blocked':
        case 'awaiting_dependency':
          return 4;
        case 'busy':
          return 5;
        case 'idle':
          return 6;
        default:
          return 7;
      }
    };

    return agents
        .filter((agent) => selectedProjectTasksByAgent[agent.id]?.length)
        .map((agent) => {
          const tasks = selectedProjectTasksByAgent[agent.id] || [];
          const runningTask = tasks.find((task) => task.status === 'running' || task.status === 'active');
          const completedCount = tasks.filter((task) => task.status === 'completed').length;
          const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
          const hasFailures = tasks.some((task) => task.status === 'failed');
          const hasRunning = tasks.some((task) => task.status === 'running' || task.status === 'active');
          const hasBlocked = tasks.some((task) => ['blocked', 'awaiting_user', 'awaiting_peer_review', 'awaiting_dependency'].includes(task.status));
          const needsUser = tasks.some((task) => task.status === 'awaiting_user');
          const needsPeer = tasks.some((task) => task.status === 'awaiting_peer_review');
          const blockedByDependency = tasks.some((task) => task.status === 'awaiting_dependency' || task.status === 'blocked');
          const deliveryPending = selectedProject?.status === 'delivery_pending'
            && selectedProject?.environment_details?.deliveryReady === false
            && !hasFailures
            && !hasRunning
            && !hasBlocked
            && completedCount === tasks.length
            && tasks.length > 0;
          const lastUpdatedAt = tasks.reduce((latest: number, task: any) => {
            const value = task.updated_at ? new Date(task.updated_at).getTime() : 0;
            return value > latest ? value : latest;
          }, 0);
          const visualState = needsUser
            ? 'awaiting_user'
            : deliveryPending
              ? 'delivery_pending'
            : hasRunning
              ? 'active'
              : needsPeer
                ? 'awaiting_peer_review'
                : blockedByDependency
                  ? (tasks.some((task) => task.status === 'awaiting_dependency') ? 'awaiting_dependency' : 'blocked')
                  : completedCount === tasks.length && tasks.length > 0
                    ? 'idle'
                    : 'busy';
          const presenceLabel = needsUser
            ? 'Waiting for user decision'
            : deliveryPending
              ? `Delivery blocked: ${selectedProject?.environment_details?.deliveryReason || 'final verification still pending'}`
            : needsPeer
              ? 'Waiting for specialist review'
              : blockedByDependency
                ? 'Resolving blockers'
                : hasRunning
                  ? 'Working on active task'
                  : completedCount === tasks.length && tasks.length > 0
                    ? 'Deliverable completed'
                    : 'Reviewing queue';

          return {
            ...agent,
            role: agent.role || agent.title,
            status: hasFailures || deliveryPending ? 'error' : hasBlocked ? 'busy' : hasRunning ? 'active' : completedCount === tasks.length ? 'idle' : 'busy',
            progress,
            currentTaskId: runningTask?.id || tasks[0]?.id,
            currentTaskName: deliveryPending
              ? (selectedProject?.environment_details?.deliveryReason || 'Validacion final pendiente')
              : (runningTask?.title || tasks[0]?.title || 'Sin tarea asignada'),
            presenceLabel,
            projectTaskCount: tasks.length,
            visualState,
            lastUpdatedAt,
          };
        })
        .sort((left, right) => {
          const priorityDelta = priorityForAgent(left) - priorityForAgent(right);
          if (priorityDelta !== 0) return priorityDelta;
          if (right.lastUpdatedAt !== left.lastUpdatedAt) return right.lastUpdatedAt - left.lastUpdatedAt;
          if (right.progress !== left.progress) return right.progress - left.progress;
          return left.name.localeCompare(right.name);
        });
  }, [selectedProject, agents, selectedProjectTasksByAgent]);

  const agentFilterOptions = useMemo(() => {
    const counters = activeAgentsForProject.reduce((acc, agent: any) => {
      acc.all += 1;
      if (agent.visualState === 'awaiting_user') acc.awaiting_user += 1;
      if (agent.status === 'error' || ['blocked', 'awaiting_dependency', 'delivery_pending'].includes(agent.visualState)) acc.issues += 1;
      if (['active', 'busy', 'awaiting_peer_review'].includes(agent.visualState)) acc.active += 1;
      if (agent.visualState === 'idle') acc.idle += 1;
      return acc;
    }, {
      all: 0,
      awaiting_user: 0,
      issues: 0,
      active: 0,
      idle: 0,
    });

    return [
      { id: 'all' as const, label: 'Todos', hint: 'Vista completa', icon: Filter, count: counters.all },
      { id: 'awaiting_user' as const, label: 'Piden señal', hint: 'Esperan tu decisión', icon: Hand, count: counters.awaiting_user },
      { id: 'issues' as const, label: 'Con fricción', hint: 'Errores o bloqueos', icon: TriangleAlert, count: counters.issues },
      { id: 'active' as const, label: 'En marcha', hint: 'Trabajando ahora', icon: Activity, count: counters.active },
      { id: 'idle' as const, label: 'En pausa', hint: 'Sin movimiento', icon: PauseCircle, count: counters.idle },
    ];
  }, [activeAgentsForProject]);

  const filteredAgentsForProject = useMemo(() => {
    switch (agentPanelFilter) {
      case 'awaiting_user':
        return activeAgentsForProject.filter((agent: any) => agent.visualState === 'awaiting_user');
      case 'issues':
        return activeAgentsForProject.filter((agent: any) => agent.status === 'error' || ['blocked', 'awaiting_dependency', 'delivery_pending'].includes(agent.visualState));
      case 'active':
        return activeAgentsForProject.filter((agent: any) => ['active', 'busy', 'awaiting_peer_review'].includes(agent.visualState));
      case 'idle':
        return activeAgentsForProject.filter((agent: any) => agent.visualState === 'idle');
      default:
        return activeAgentsForProject;
    }
  }, [activeAgentsForProject, agentPanelFilter]);

  const selectedAgentTasks = selectedAgent ? (selectedProjectTasksByAgent[selectedAgent.id] || []) : [];

  const fleetRows = useMemo(() => {
    return agents
      .map((agent) => {
        const agentTasks = allTasks.filter((task) => task.assigned_agent_id === agent.id);
        if (agentTasks.length === 0) return null;
        const runningTask = agentTasks.find((task) => task.status === 'running' || task.status === 'active');
        const latestTask = runningTask || agentTasks[0];
        const project = projects.find((item) => item.id === latestTask.project_id);
        return {
          ...agent,
          currentProjectName: project?.name || 'Unknown Project',
          currentTaskName: latestTask.title,
          currentTaskStatus: latestTask.status,
          pendingCount: agentTasks.filter((task) => task.status === 'pending').length,
          runningCount: agentTasks.filter((task) => task.status === 'running' || task.status === 'active').length,
          completedCount: agentTasks.filter((task) => task.status === 'completed').length,
          blockedCount: agentTasks.filter((task) => ['blocked', 'awaiting_user', 'awaiting_peer_review', 'awaiting_dependency'].includes(task.status)).length,
          tasks: agentTasks,
          project,
        };
      })
      .filter(Boolean);
  }, [agents, allTasks, projects]);

  if (!mounted) return null;

  const projectGoal = selectedProject?.goal || selectedProject?.config?.goal || `Desarrollar ${selectedProject?.name || 'proyecto'}`;
  const isEnvironmentReady = selectedProject?.environment_status === 'ready';
  const isPreparing = selectedProject?.environment_status === 'preparing';
  const isGenerating = selectedProject?.status === 'analyzing_specialists' || selectedProject?.status === 'generating_tasks';
  const isAnalyzingSpecialists = selectedProject?.status === 'analyzing_specialists';
  const isRouteMapReady = selectedProject?.status === 'route_map_ready';
  const isRuntimeRunning = selectedProject?.runtime_status === 'running';
  const launchCommand = selectedProject?.environment_details?.launchCommand || null;
  const canLaunchApp = Boolean(isRuntimeRunning && launchCommand);
  const deliveryReady = selectedProject?.environment_details?.deliveryReady !== false;
  const deliveryReason = selectedProject?.environment_details?.deliveryReason || null;
  const docketLabel = isRuntimeRunning
    ? 'On'
    : selectedProject?.runtime_status === 'starting'
      ? 'Starting'
      : selectedProject?.runtime_status === 'error'
        ? 'Attention'
        : 'Off';
  const previewLabel = selectedProjectPreviewStatus?.status === 'ready'
    ? 'Ready'
    : isRuntimeRunning
      ? 'Unavailable'
      : 'Pending';
  const isPreviewReady = selectedProjectPreviewStatus?.status === 'ready';
  const previewToneClass = isPreviewReady
    ? 'text-emerald-300'
    : selectedProjectPreviewStatus?.status === 'error'
      ? 'text-amber-200'
      : 'text-white/45';
  const projectCompletedTasks = selectedProjectTasks.filter((task) => task.status === 'completed').length;
  const projectActiveTasks = selectedProjectTasks.filter((task) => task.status === 'running' || task.status === 'active').length;
  const projectBlockedTasks = selectedProjectTasks.filter((task) => ['blocked', 'awaiting_user', 'awaiting_peer_review', 'awaiting_dependency'].includes(task.status)).length;
  const projectFailedTasks = selectedProjectTasks.filter((task) => task.status === 'failed').length;
  const projectPausedTasks = selectedProjectTasks.filter((task) => ['blocked', 'awaiting_dependency', 'awaiting_peer_review'].includes(task.status)).length;
  const rawProjectProgress = selectedProjectTasks.length
    ? Math.round((projectCompletedTasks / selectedProjectTasks.length) * 100)
    : isRouteMapReady
      ? 60
      : isAnalyzingSpecialists
        ? 38
        : isEnvironmentReady
          ? 18
          : isPreparing
            ? 8
            : 0;
  const projectProgress = selectedProject?.status === 'delivery_pending' && selectedProject?.environment_details?.deliveryReady === false
    ? Math.min(rawProjectProgress, 96)
    : rawProjectProgress;
  const isSystemLocked = activationState?.status !== 'validated' || !activationState?.completedAt || Boolean(systemReadiness && systemReadiness.docker.blocking && !systemReadiness.docker.available);

  return (
    <div className="flex h-screen overflow-hidden font-sans text-[#fafafa] selection:bg-primary/20">
      <Sidebar activeView={currentView} onViewChange={setCurrentView} />

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <AnimatePresence>
          {apiStatus === 'offline' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="z-50 flex items-center justify-center gap-2 border-b border-red-500/20 bg-red-500/10 px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.3em] text-red-400"
            >
              <div className="h-1 w-1 animate-ping rounded-full bg-red-500" />
              Backend Offline - Ensure port 4001 is active
            </motion.div>
          )}
        </AnimatePresence>

        <PageHeader
          title={header.title}
          subtitle={header.subtitle}
          onAction={isSystemLocked ? undefined : () => setIsCreateProjectOpen(true)}
          actionLabel="Initialize Project"
        />

        <div className="scrollbar-hide flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {currentView === 'overview' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto grid max-w-[1600px] grid-cols-12 gap-8">
                <div className="col-span-9 space-y-8">
                  {selectedProject ? (
                    <ProjectContextPanel
                      selectedProject={selectedProject}
                      projectGoal={projectGoal}
                      selectedProjectTasks={selectedProjectTasks}
                      selectedProjectReviews={selectedProjectReviews}
                      selectedProjectDecisionRequests={selectedProjectDecisionRequests}
                      activeAgentsForProject={activeAgentsForProject}
                      projectProgress={projectProgress}
                      projectCompletedTasks={projectCompletedTasks}
                      projectActiveTasks={projectActiveTasks}
                      projectBlockedTasks={projectBlockedTasks}
                      docketLabel={docketLabel}
                      previewLabel={previewLabel}
                      previewToneClass={previewToneClass}
                      launchCommand={launchCommand}
                      canLaunchApp={canLaunchApp}
                      deliveryReady={deliveryReady}
                      deliveryReason={deliveryReason}
                      isPreparing={isPreparing}
                      isEnvironmentReady={isEnvironmentReady}
                      isGenerating={isGenerating}
                      isAnalyzingSpecialists={isAnalyzingSpecialists}
                      isRouteMapReady={isRouteMapReady}
                      isRuntimeRunning={isRuntimeRunning}
                      isPreviewReady={isPreviewReady}
                      selectedProjectPreviewStatus={selectedProjectPreviewStatus}
                      threadMessages={selectedProjectThread}
                      executionAudit={selectedProjectExecutionAudit}
                      isSubmittingPrompt={isSubmittingProjectPrompt}
                      lastPromptResponse={lastProjectPromptResponse}
                      onPrepareProject={() => handlePrepareProject(selectedProject.id, projectGoal)}
                      onGenerateTasks={() => handleGenerateTasks(selectedProject.id, projectGoal)}
                      onStartProject={() => handleStartProject(selectedProject.id)}
                      onStopProject={() => handleStopProject(selectedProject.id)}
                      onLaunchApp={() => handleLaunchApp(selectedProject.id)}
                      onOpenPreview={handleOpenPreview}
                      onDeleteProject={() => handleDeleteProject(selectedProject.id)}
                      onOpenRouteMap={() => setIsRouteMapOpen(true)}
                      onSubmitPrompt={handleSubmitProjectPrompt}
                    />
                  ) : (
                    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] text-center">
                      <Folder size={40} className="mb-4 text-white/15" />
                      <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/35">Selecciona un proyecto</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-1">
                    <h2 className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-white/20">
                      <Users size={12} /> {selectedProject ? `Active Specialists · ${selectedProject.name}` : 'Active Specialists Fleet'}
                    </h2>
                    {selectedProject && (
                      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/70">
                        {filteredAgentsForProject.length}/{activeAgentsForProject.length} visibles
                      </div>
                    )}
                  </div>

                  {selectedProject && (
                    <div className="flex flex-wrap items-start justify-between gap-3 px-1">
                      <div className="flex flex-wrap gap-2">
                        {agentFilterOptions.map((filterOption) => {
                          const Icon = filterOption.icon;
                          const active = agentPanelFilter === filterOption.id;
                          return (
                            <button
                              key={filterOption.id}
                              onClick={() => setAgentPanelFilter(filterOption.id)}
                              className={`group inline-flex items-center gap-2 rounded-2xl border px-3 py-2 transition-all ${active ? 'border-primary/35 bg-primary/12 text-white shadow-[0_12px_40px_rgba(14,165,233,0.12)]' : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.05]'}`}
                            >
                              <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${active ? 'border-primary/30 bg-primary/18 text-primary' : 'border-white/10 bg-white/[0.04] text-white/45 group-hover:text-white/70'}`}>
                                <Icon size={14} />
                              </span>
                              <span className="text-left">
                                <span className="block text-[10px] font-black uppercase tracking-[0.22em]">{filterOption.label}</span>
                                <span className="mt-0.5 block text-[10px] font-medium tracking-[0.04em] text-white/38">{filterOption.hint}</span>
                              </span>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${active ? 'bg-primary/18 text-primary' : 'bg-white/[0.04] text-white/45'}`}>
                                {filterOption.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          <ActionIconButton
                            label="Revisar tareas"
                            onClick={handleReviewTasks}
                            icon={ScanSearch}
                            disabled={!selectedProjectTasks.length}
                            badge={selectedProjectTasks.length}
                          />
                          <ActionIconButton
                            label="Reintentar tareas"
                            onClick={handleRetryProjectTasks}
                            icon={RefreshCcw}
                            disabled={projectFailedTasks === 0}
                            badge={projectFailedTasks}
                          />
                          <ActionIconButton
                            label="Reanudar tareas en pausa"
                            onClick={handleResumePausedTasks}
                            icon={PlayCircle}
                            disabled={projectPausedTasks === 0}
                            badge={projectPausedTasks}
                          />
                        </div>
                      </TooltipProvider>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAgentsForProject.map((agent) => (
                      <motion.div
                        key={agent.id}
                        layout
                        initial={{ opacity: 0.7, y: 10, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }, duration: 0.28 }}
                        onClick={() => setSelectedAgent(agent)}
                        className="cursor-pointer"
                      >
                        <AgentCard agent={agent} />
                      </motion.div>
                    ))}
                    {selectedProject && filteredAgentsForProject.length === 0 && (
                      <div className="col-span-full flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] text-center">
                        <Users size={40} className="mb-4 text-white/15" />
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/35">Sin coincidencias en la flota</p>
                        <p className="mt-3 max-w-md text-sm text-white/40">
                          Ajusta el filtro o genera más movimiento en el proyecto para ver especialistas en esta banda.
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedProject && (
                    <div className="space-y-6 pt-2">
                      <div ref={decisionInboxRef}>
                        <DecisionInbox
                          requests={selectedProjectDecisionRequests.filter((request: any) => request.status === 'open')}
                          onAnswer={handleAnswerDecision}
                          highlightedRequestId={highlightedDecisionId}
                        />
                      </div>
                      <div ref={coordinationRef}>
                        <AgentInteractionFeed
                          interactions={selectedProjectAgentInteractions}
                          budgets={selectedProjectInteractionBudgets}
                          onResetBudget={handleResetBudget}
                        />
                      </div>
                      <ProjectActivityFeed events={selectedProjectEvents} />
                    </div>
                  )}
              </div>

              <ProjectCards
                projects={projects}
                selectedProjectId={selectedProjectId}
                setSelectedProjectId={setSelectedProjectId}
                projectTasks={projectTasks}
              />
            </motion.div>
          )}

          {currentView === 'kanban' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-[1600px]">
              <KanbanBoard tasks={allTasks} agents={agents} />
            </motion.div>
          )}

          {currentView === 'ia' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ProjectAiPanel
                selectedProject={selectedProject}
                selectedProjectId={selectedProjectId}
                setSelectedProjectId={setSelectedProjectId}
                projectTasks={projectTasks}
                projects={projects}
                selectedProjectTasks={selectedProjectTasks}
                threadMessages={selectedProjectThread}
                executionAudit={selectedProjectExecutionAudit}
                isSubmittingPrompt={isSubmittingProjectPrompt}
                lastPromptResponse={lastProjectPromptResponse}
                onSubmitPrompt={handleSubmitProjectPrompt}
              />
            </motion.div>
          )}

          {currentView === 'fleet' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-[1600px] space-y-4">
                {fleetRows.map((row: any) => (
                  <div
                    key={row.id}
                    onClick={() => {
                      if (row.project?.id) setSelectedProjectId(row.project.id);
                      setSelectedAgent(row);
                    }}
                    className="grid cursor-pointer grid-cols-[1.2fr_1.4fr_1fr_120px_120px_120px] items-center gap-4 rounded-3xl border border-white/8 bg-white/[0.02] px-6 py-5"
                  >
                    <div>
                      <div className="text-sm font-black text-white">{row.name}</div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">{row.role || row.title}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">{row.currentProjectName}</div>
                      <div className="mt-2 text-sm text-white/75">{row.currentTaskName}</div>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">{row.currentTaskStatus}</div>
                    <div className="text-center text-sm font-black text-white">{row.pendingCount}</div>
                    <div className="text-center text-sm font-black text-white">{row.runningCount}</div>
                    <div className="text-center text-sm font-black text-white">{row.completedCount}</div>
                  </div>
                ))}
                {fleetRows.length === 0 && (
                  <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
                    <PlayCircle size={40} className="mb-4 text-white/15" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/35">Sin backlog generado</p>
                  </div>
                )}
              </motion.div>
            )}

            {currentView === 'agents' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto grid max-w-[1600px] grid-cols-6 gap-4">
                {filteredAgentsForProject.map((agent) => (
                  <div key={agent.id} onClick={() => setSelectedAgent(agent)} className="group flex cursor-pointer flex-col items-center gap-4 rounded-md border border-white/[0.05] bg-white/[0.01] p-8 transition-all hover:border-primary/30">
                    <div className="text-4xl opacity-40 grayscale transition-opacity group-hover:opacity-100 group-hover:grayscale-0">{agent.avatar || agent.emoji || '🤖'}</div>
                    <div className="text-center text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/80">{agent.name}</div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/60">{agent.projectTaskCount} tareas</div>
                  </div>
                ))}
              </motion.div>
            )}

            {currentView === 'projects' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project: any) => {
                  const tasks = projectTasks[project.id] || [];
                  const completed = tasks.filter((task) => task.status === 'completed').length;
                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      taskCount={tasks.length}
                      completedCount={completed}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setCurrentView('overview');
                      }}
                      onInitialize={handlePrepareProject}
                    />
                  );
                })}
                {projects.length === 0 && (
                  <div className="col-span-full flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-white/5 opacity-20">
                    <Folder size={48} className="mb-4" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No projects registered</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {selectedAgent && selectedProject && (
          <AgentModal
            isOpen={!!selectedAgent}
            agent={selectedAgent}
            projectName={selectedProject.name}
            tasks={selectedAgentTasks}
            canStartProject={isEnvironmentReady && !isRuntimeRunning}
            canLaunchPreview={canLaunchApp}
            canOpenPreview={Boolean(selectedProject.preview_url)}
            hasDecisionForTask={(taskId: string) => selectedProjectDecisionRequests.some((request: any) => request.status === 'open' && request.task_id === taskId)}
            onStartProject={() => handleStartProject(selectedProject.id)}
            onLaunchPreview={() => handleLaunchApp(selectedProject.id)}
            onOpenPreview={handleOpenPreview}
            onOpenDecision={handleOpenDecisionForTask}
            onOpenCoordination={handleOpenCoordination}
            onResetBudget={handleResetBudget}
            onRetryTask={handleRetryTask}
            onClose={() => setSelectedAgent(null)}
          />
        )}
      </AnimatePresence>

      <ProjectWizard isOpen={isCreateProjectOpen} onClose={() => setIsCreateProjectOpen(false)} onCreate={handleCreateProject} />
      <SystemInitOverlay
        isOpen={!!overlayProjectId && !!overlayMode}
        projectId={overlayProjectId || ''}
        mode={overlayMode || 'prepare'}
        onComplete={handleOverlayComplete}
      />
      <SpecialistRouteMapModal
        isOpen={isRouteMapOpen}
        onClose={() => setIsRouteMapOpen(false)}
        onConfirm={() => selectedProject && handleConfirmRouteMap(selectedProject.id)}
        isAnalyzing={!!selectedProject && selectedProject.status === 'analyzing_specialists'}
        isMaterializing={isMaterializingPlan}
        projectName={selectedProject?.name || 'Project RouteMap'}
        routeMap={selectedProjectRouteMap}
      />
      <ActivationGate
        isOpen={mounted && activationBootstrapDone && isSystemLocked}
        readiness={systemReadiness}
        persistence={activationState}
        onValidated={handleActivationValidated}
        onCompleted={handleActivationCompleted}
      />
    </div>
  );
}
