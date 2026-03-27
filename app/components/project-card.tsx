'use client';

import { motion } from 'framer-motion';
import { Box, ChevronRight, Server, Zap, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    stack?: string;
    status: string;
    environment_status?: string;
    runtime_status?: string;
    assigned_port?: number;
    preview_url?: string;
    goal?: string;
    config?: any;
  };
  taskCount: number;
  completedCount: number;
  onClick: () => void;
  onInitialize: (projectId: string, goal: string) => void;
}

export function ProjectCard({ project, taskCount, completedCount, onClick, onInitialize }: ProjectCardProps) {
  const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
  const isReady = project.environment_status === 'ready';
  const isPreparing = project.environment_status === 'preparing';
  const hasFailed = project.environment_status === 'failed';

  const badge = isPreparing
    ? { label: 'Preparing', className: 'text-blue-300 border-blue-400/20 bg-blue-400/10', icon: Loader2 }
    : isReady
      ? { label: 'Environment Ready', className: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/10', icon: CheckCircle2 }
      : hasFailed
        ? { label: 'Environment Failed', className: 'text-red-300 border-red-400/20 bg-red-400/10', icon: AlertCircle }
        : { label: 'Registered', className: 'text-white/40 border-white/10 bg-white/5', icon: Box };
  const BadgeIcon = badge.icon;

  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.3 } }}
      onClick={onClick}
      className="glass-card group cursor-pointer rounded-[2rem] border-white/5 bg-white/[0.01] p-8"
    >
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className={`rounded-2xl p-4 transition-all ${isReady ? 'bg-primary/20 text-primary shadow-neon' : 'bg-white/5 text-white/20'}`}>
          <Box size={28} />
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${badge.className}`}>
          <BadgeIcon size={12} className={isPreparing ? 'animate-spin' : ''} />
          {badge.label}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="mb-1 text-2xl font-black uppercase italic tracking-tighter text-white transition-colors group-hover:text-primary">
            {project.name}
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/20">
            {project.stack || 'Multi-Agent Framework'}
          </p>
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-white/45">
            {project.goal || project.config?.goal || 'Proyecto registrado en el orquestador.'}
          </p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">
            runtime {project.runtime_status || 'stopped'} | preview {project.preview_url ? 'available' : 'pending'}
          </p>
        </div>

        {isReady && taskCount > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/20">
              <span>Task Progress</span>
              <span className="text-white/40">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/5 bg-white/5 p-[1px]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full rounded-full bg-primary neon-glow"
              />
            </div>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation();
              const config = typeof project.config === 'string' ? JSON.parse(project.config) : (project.config || {});
              onInitialize(project.id, config.goal || project.goal || `Desarrollar ${project.name}`);
            }}
            disabled={isPreparing}
            className="group/btn flex w-full items-center justify-center gap-3 rounded-xl border border-primary/20 bg-primary/10 py-4 text-primary transition-all disabled:opacity-50"
          >
            {isPreparing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="animate-pulse" />}
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">
              {isReady ? 'Open Project' : 'Prepare Environment'}
            </span>
          </motion.button>
        )}

        <div className="flex items-center justify-between border-t border-white/5 pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-white/40">
              <Zap size={12} className="text-primary/50" /> {taskCount} Tasks
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-white/40">
              <Server size={12} className="text-blue-400/50" /> Docker-VM
            </div>
          </div>
          <ChevronRight size={16} className="text-white/10 transition-all group-hover:translate-x-1 group-hover:text-primary" />
        </div>
      </div>
    </motion.div>
  );
}
