"use client";

import { Activity, Filter, Folder, Hand, PauseCircle, PlayCircle, RefreshCcw, ScanSearch, TriangleAlert, Users } from "lucide-react";
import { motion } from "framer-motion";
import { AgentCard } from "@/components/agent-card";
import { AgentInteractionFeed } from "@/components/agent-interaction-feed";
import { DecisionInbox } from "@/components/decision-inbox";
import { ProjectActivityFeed } from "@/components/project-activity-feed";
import { ProjectCards } from "@/components/project-cards";
import { ProjectContextPanel } from "@/components/project-context-panel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ActionIconButton } from "./action-icon-button";

export function OverviewView(props: any) {
  const agentFilterIcons: Record<string, any> = {
    all: Filter,
    awaiting_user: Hand,
    issues: TriangleAlert,
    active: Activity,
    idle: PauseCircle,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto grid max-w-[1600px] grid-cols-12 gap-8">
      <div className="col-span-9 space-y-8">
        {props.selectedProject ? (
          <ProjectContextPanel
            selectedProject={props.selectedProject}
            projectGoal={props.projectGoal}
            selectedProjectTasks={props.selectedProjectTasks}
            selectedProjectReviews={props.selectedProjectReviews}
            selectedProjectDecisionRequests={props.selectedProjectDecisionRequests}
            activeAgentsForProject={props.activeAgentsForProject}
            projectProgress={props.projectProgress}
            projectCompletedTasks={props.projectCompletedTasks}
            projectActiveTasks={props.projectActiveTasks}
            projectBlockedTasks={props.projectBlockedTasks}
            docketLabel={props.docketLabel}
            previewLabel={props.previewLabel}
            previewToneClass={props.previewToneClass}
            launchCommand={props.launchCommand}
            canLaunchApp={props.canLaunchApp}
            deliveryReady={props.deliveryReady}
            deliveryReason={props.deliveryReason}
            isPreparing={props.isPreparing}
            isEnvironmentReady={props.isEnvironmentReady}
            isGenerating={props.isGenerating}
            isAnalyzingSpecialists={props.isAnalyzingSpecialists}
            isRouteMapReady={props.isRouteMapReady}
            isRuntimeRunning={props.isRuntimeRunning}
            isPreviewReady={props.isPreviewReady}
            selectedProjectPreviewStatus={props.selectedProjectPreviewStatus}
            threadMessages={props.selectedProjectThread}
            executionAudit={props.selectedProjectExecutionAudit}
            isSubmittingPrompt={props.isSubmittingProjectPrompt}
            lastPromptResponse={props.lastProjectPromptResponse}
            onPrepareProject={() => props.handlePrepareProject(props.selectedProject.id, props.projectGoal)}
            onGenerateTasks={() => props.handleGenerateTasks(props.selectedProject.id, props.projectGoal)}
            onStartProject={() => props.handleStartProject(props.selectedProject.id)}
            onStopProject={() => props.handleStopProject(props.selectedProject.id)}
            onLaunchApp={() => props.handleLaunchApp(props.selectedProject.id)}
            onOpenPreview={props.handleOpenPreview}
            onDeleteProject={() => props.handleDeleteProject(props.selectedProject.id)}
            onOpenRouteMap={() => props.setIsRouteMapOpen(true)}
            onSubmitPrompt={props.handleSubmitProjectPrompt}
          />
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] text-center">
            <Folder size={40} className="mb-4 text-white/15" />
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/35">Selecciona un proyecto</p>
          </div>
        )}

        <div className="flex items-center justify-between px-1">
          <h2 className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.4em] text-white/20">
            <Users size={12} /> {props.selectedProject ? `Active Specialists · ${props.selectedProject.name}` : "Active Specialists Fleet"}
          </h2>
          {props.selectedProject && (
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/70">
              {props.filteredAgentsForProject.length}/{props.activeAgentsForProject.length} visibles
            </div>
          )}
        </div>

        {props.selectedProject && (
          <div className="flex flex-wrap items-start justify-between gap-3 px-1">
            <div className="flex flex-wrap gap-2">
              {props.agentFilterOptions.map((filterOption: any) => {
                const Icon = agentFilterIcons[filterOption.id];
                const active = props.agentPanelFilter === filterOption.id;
                return (
                  <button
                    key={filterOption.id}
                    onClick={() => props.setAgentPanelFilter(filterOption.id)}
                    className={`group inline-flex items-center gap-2 rounded-2xl border px-3 py-2 transition-all ${active ? "border-primary/35 bg-primary/12 text-white shadow-[0_12px_40px_rgba(14,165,233,0.12)]" : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.05]"}`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${active ? "border-primary/30 bg-primary/18 text-primary" : "border-white/10 bg-white/[0.04] text-white/45 group-hover:text-white/70"}`}>
                      <Icon size={14} />
                    </span>
                    <span className="text-left">
                      <span className="block text-[10px] font-black uppercase tracking-[0.22em]">{filterOption.label}</span>
                      <span className="mt-0.5 block text-[10px] font-medium tracking-[0.04em] text-white/38">{filterOption.hint}</span>
                    </span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${active ? "bg-primary/18 text-primary" : "bg-white/[0.04] text-white/45"}`}>
                      {filterOption.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <TooltipProvider>
              <div className="flex items-center gap-2">
                <ActionIconButton label="Revisar tareas" onClick={props.handleReviewTasks} icon={ScanSearch} disabled={!props.selectedProjectTasks.length} badge={props.selectedProjectTasks.length} />
                <ActionIconButton label="Reintentar tareas" onClick={props.handleRetryProjectTasks} icon={RefreshCcw} disabled={props.projectFailedTasks === 0} badge={props.projectFailedTasks} />
                <ActionIconButton label="Reanudar tareas en pausa" onClick={props.handleResumePausedTasks} icon={PlayCircle} disabled={props.projectPausedTasks === 0} badge={props.projectPausedTasks} />
              </div>
            </TooltipProvider>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {props.filteredAgentsForProject.map((agent: any) => (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0.7, y: 10, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }, duration: 0.28 }}
              onClick={() => props.setSelectedAgent(agent)}
              className="cursor-pointer"
            >
              <AgentCard agent={agent} />
            </motion.div>
          ))}
          {props.selectedProject && props.filteredAgentsForProject.length === 0 && (
            <div className="col-span-full flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] text-center">
              <Users size={40} className="mb-4 text-white/15" />
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/35">Sin coincidencias en la flota</p>
              <p className="mt-3 max-w-md text-sm text-white/40">Ajusta el filtro o genera más movimiento en el proyecto para ver especialistas en esta banda.</p>
            </div>
          )}
        </div>

        {props.selectedProject && (
          <div className="space-y-6 pt-2">
            <div ref={props.decisionInboxRef}>
              <DecisionInbox
                requests={props.selectedProjectDecisionRequests.filter((request: any) => request.status === "open")}
                onAnswer={props.handleAnswerDecision}
                highlightedRequestId={props.highlightedDecisionId}
              />
            </div>
            <div ref={props.coordinationRef}>
              <AgentInteractionFeed
                interactions={props.selectedProjectAgentInteractions}
                budgets={props.selectedProjectInteractionBudgets}
                onResetBudget={props.handleResetBudget}
              />
            </div>
            <ProjectActivityFeed events={props.selectedProjectEvents} />
          </div>
        )}
      </div>

      <ProjectCards
        projects={props.projects}
        selectedProjectId={props.selectedProjectId}
        setSelectedProjectId={props.setSelectedProjectId}
        projectTasks={props.projectTasks}
      />
    </motion.div>
  );
}
