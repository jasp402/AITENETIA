'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { 
  Clock, 
  Layers, 
  Eye, 
  Award, 
  Star, 
  Code2, 
  Workflow, 
  CheckCircle2,
  Code,
  Search,
  Layout,
  Server,
  Cpu,
  Database,
  Zap,
  Shield,
  FlaskConical,
  Terminal,
  Users,
  Activity,
  Wrench
} from 'lucide-react';

export type AgentStatus = 'idle' | 'active' | 'busy' | 'activo' | 'pausa' | 'error';

const scoutBadgeMap: Record<string, { icon: LucideIcon; color: string; bgColor: string; category: string }> = {
  // Technical / Stack (Blue)
  'React': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'Node.js': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'Go': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'PostgreSQL': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'Redis': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'Microservices': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'Cloud Native': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'OpenAPI': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'GraphQL': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'SQL': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'NoSQL': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'K8s': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'Terraform': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'AWS': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'TypeScript': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'Next.js': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'Prisma': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'Playwright': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },
  'Jest': { icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-400/10', category: 'tech' },

  // Oversight / Quality (Purple)
  'Review': { icon: Eye, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', category: 'quality' },
  'Quality': { icon: Eye, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', category: 'quality' },
  'Security': { icon: Eye, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', category: 'quality' },
  'Best Practices': { icon: Eye, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', category: 'quality' },
  'Docs': { icon: Eye, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', category: 'quality' },
  'API Ref': { icon: Eye, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', category: 'quality' },
  'Guides': { icon: Eye, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', category: 'quality' },
  'E2E': { icon: Eye, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', category: 'quality' },
  'Unit Tests': { icon: Eye, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', category: 'quality' },
  'Coverage': { icon: Eye, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', category: 'quality' },

  // Strategy / Leadership (Yellow)
  'Architecture': { icon: Award, color: 'text-amber-400', bgColor: 'bg-amber-400/10', category: 'strategy' },
  'Leadership': { icon: Award, color: 'text-amber-400', bgColor: 'bg-amber-400/10', category: 'strategy' },
  'Strategy': { icon: Award, color: 'text-amber-400', bgColor: 'bg-amber-400/10', category: 'strategy' },
  'Mentoring': { icon: Award, color: 'text-amber-400', bgColor: 'bg-amber-400/10', category: 'strategy' },
  'Roadmap': { icon: Award, color: 'text-amber-400', bgColor: 'bg-amber-400/10', category: 'strategy' },
  'Scalability': { icon: Award, color: 'text-amber-400', bgColor: 'bg-amber-400/10', category: 'strategy' },
};

// Mapa de iconos por ID de agente para resolver el icono de Lucide
const agentIconMap: Record<string, LucideIcon> = {
  'senior-dev': Code,
  'code-reviewer': Search,
  'frontend-spec': Layout,
  'backend-expert': Server,
  'soft-arch': Cpu,
  'api-designer': Terminal,
  'db-expert': Database,
  'devops-expert': Zap,
  'perf-guru': Activity,
  'security-exp': Shield,
  'tech-lead': Users,
  'fullstack-dev': Layers,
  'qa-lead': FlaskConical,
  'qa-auto-dev': Wrench,
};

export interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    role: string;
    title?: string;
    avatar?: string;
    emoji?: string;
    description: string;
    status: AgentStatus;
    progress: number;
    tags: string[];
    capabilities?: string[];
    colorClass?: string;
    progressColor?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    projectCount?: number;
    lastTaskTime?: string;
    lastTaskDate?: string;
    aiProvider?: string;
    aiModel?: string;
    aiLogoUrl?: string;
    currentTaskId?: string;
    currentTaskName?: string;
    presenceLabel?: string;
    visualState?: 'awaiting_user' | 'active' | 'awaiting_peer_review' | 'blocked' | 'awaiting_dependency' | 'delivery_pending' | 'busy' | 'idle';
    icon?: LucideIcon;
  };
  onToggle?: () => void;
  onDelete?: () => void;
  onViewLogs?: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onToggle,
  onDelete,
  onViewLogs,
}) => {
  const {
    name = 'Unknown Agent',
    title = 'Specialist',
    emoji = '🤖',
    description = '',
    status = 'idle',
    progress = 0,
    tags = [],
    capabilities = [],
    colorClass = 'text-cyan-300',
    progressColor = '#67e8f9',
    avatarUrl,
    bannerUrl,
    projectCount = 0,
    lastTaskTime = 'Never',
    lastTaskDate = 'None',
    aiProvider = 'Aitenetia',
    aiModel = 'Default',
    aiLogoUrl,
    currentTaskId,
    currentTaskName,
    presenceLabel,
    visualState = 'idle',
  } = agent;

  const displayTags = (tags && tags.length > 0) ? tags : (capabilities || []);

  // Resolver el ícono de Lucide para este agente
  const Icon: LucideIcon = agent.icon || agentIconMap[agent.id] || Code2;

  const statusColors: Record<string, string> = {
    idle: 'bg-white/15 shadow-[0_0_0_2px_rgba(255,255,255,0.05)]',
    activo: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6),0_0_0_2px_rgba(34,197,94,0.15)]',
    active: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6),0_0_0_2px_rgba(34,197,94,0.15)]',
    busy: 'bg-orange-500 shadow-[0_0_8_rgba(249,115,22,0.6),0_0_0_2px_rgba(249,115,22,0.15)]',
    pausa: 'bg-orange-500 shadow-[0_0_8_rgba(249,115,22,0.6),0_0_0_2px_rgba(249,115,22,0.15)]',
    error: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6),0_0_0_2px_rgba(239,68,68,0.15)]',
  };

  const statusLabel = status;
  const pulseStates = new Set(['active', 'awaiting_user', 'awaiting_peer_review', 'blocked', 'awaiting_dependency', 'delivery_pending']);
  const glowMap: Record<string, string> = {
    active: 'rgba(56,189,248,0.28)',
    awaiting_user: 'rgba(251,191,36,0.32)',
    awaiting_peer_review: 'rgba(34,211,238,0.28)',
    blocked: 'rgba(248,113,113,0.26)',
    awaiting_dependency: 'rgba(251,146,60,0.26)',
    delivery_pending: 'rgba(248,113,113,0.32)',
    busy: 'rgba(244,114,182,0.18)',
    idle: 'rgba(255,255,255,0.06)',
  };
  const borderMap: Record<string, string> = {
    active: 'border-sky-300/30',
    awaiting_user: 'border-amber-300/30',
    awaiting_peer_review: 'border-cyan-300/30',
    blocked: 'border-red-300/25',
    awaiting_dependency: 'border-orange-300/25',
    delivery_pending: 'border-red-300/30',
    busy: 'border-fuchsia-300/15',
    idle: 'border-white/10',
  };
  const glowColor = glowMap[visualState] || glowMap.idle;
  const borderClass = borderMap[visualState] || borderMap.idle;

  return (
    <motion.div
      className={`agent-card group relative flex flex-col overflow-hidden rounded-2xl border bg-[#1a192b] shadow-2xl transition-all hover:border-white/20 ${borderClass}`}
      animate={pulseStates.has(visualState)
        ? {
            boxShadow: [
              `0 0 0 1px ${glowColor}, 0 18px 40px rgba(0,0,0,0.35)`,
              `0 0 0 1px ${glowColor}, 0 0 28px ${glowColor}, 0 22px 48px rgba(0,0,0,0.42)`,
              `0 0 0 1px ${glowColor}, 0 18px 40px rgba(0,0,0,0.35)`,
            ],
          }
        : {
            boxShadow: `0 18px 40px rgba(0,0,0,0.32)`,
          }}
      transition={pulseStates.has(visualState)
        ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
        : { duration: 0.35 }}
    >
      {pulseStates.has(visualState) && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl"
          animate={{ opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: `radial-gradient(circle at 50% 0%, ${glowColor}, transparent 60%)`,
          }}
        />
      )}
      {/* Header Banner */}
      <div className="relative h-24 w-full overflow-hidden">
        <img 
          src={bannerUrl || `https://picsum.photos/seed/${name}/400/100`} 
          alt="banner" 
          className="h-full w-full object-cover opacity-60 transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a192b] to-transparent" />
        
        {/* Project Count Indicator */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 backdrop-blur-md">
          <div className="h-1 w-1 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
          <span className="text-[9px] font-bold tracking-wider text-white/80 uppercase">
            {projectCount} Projects
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative px-5 pt-0 pb-5">
        {/* Avatar & Name/Badges - Overlapping Banner */}
        <div className="relative -mt-10 mb-3 flex items-end justify-between">
          {/* Left Side: Avatar */}
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-4 border-[#1a192b] bg-[#2a293b] shadow-xl">
            <img 
              src={avatarUrl || `https://picsum.photos/seed/${name}-avatar/150/150`} 
              alt={name} 
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Right Side: Name above Badges - Left Aligned within this column */}
          <div className="flex flex-col items-start gap-2">
            <span className="text-[18px] font-bold tracking-tight text-white leading-none">{name}</span>
            <div className="flex items-center gap-2">
              {/* AI Engine Badge */}
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 shadow-inner backdrop-blur-md transition-colors hover:bg-white/10">
                {aiLogoUrl && (
                  <img 
                    src={aiLogoUrl} 
                    alt={aiProvider} 
                    className="h-4 w-4 object-contain opacity-80"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black tracking-tight text-white/70 leading-none">{aiProvider}</span>
                  <span className="text-[7px] font-light tracking-tighter text-white/30 leading-none mt-0.5">{aiModel}</span>
                </div>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 shadow-inner backdrop-blur-md">
                <Icon className="h-3.5 w-3.5 text-white/50" />
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[14px] font-bold tracking-wide text-white/90">
              {title} <span className="text-sm">{emoji}</span>
            </h3>
            <div className={`h-[7px] w-[7px] rounded-full ${statusColors[status] || statusColors.idle}`} />
          </div>
          <p className={`mt-0.5 text-[10px] font-semibold leading-relaxed tracking-wider uppercase line-clamp-2 h-[3.2em] ${colorClass}`}>
            {description || agent.role}
          </p>
        </div>

        {/* Status & Progress */}
        <div className="mb-1.5 flex items-center justify-between">
          <span className={`text-[10px] font-bold tracking-[0.15em] uppercase ${status === 'idle' ? 'text-white/30' : colorClass}`}>
            {statusLabel}
          </span>
          <span className="text-[10px] font-bold tracking-wider text-white/25">
            {progress}%
          </span>
        </div>

        <div className="mb-3 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
          <div 
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${progress}%`, 
              background: progressColor 
            }} 
          />
        </div>

        {/* Current Task Info */}
        <div className="mb-4 flex items-center gap-2 text-[9px] font-medium tracking-tight text-white/40 whitespace-nowrap overflow-hidden">
          <span className="shrink-0 font-bold text-white/20">{currentTaskId || 'TASK'}</span>
          <span className="h-2.5 w-[1px] shrink-0 bg-white/10" />
          <span className="truncate">{currentTaskName || 'Sin tarea asignada'}</span>
        </div>

        <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
          {presenceLabel || 'Standing by'}
        </div>

        {/* Tags & Last Task */}
        <div className="mt-auto flex items-center justify-between gap-4 border-t border-white/5 pt-4">
          <div className="flex items-center gap-2">
            {displayTags.slice(0, 3).map((tag: string) => {
              const badge = scoutBadgeMap[tag] || { icon: Star, color: 'text-white/40', bgColor: 'bg-white/5' };
              const IconComponent = badge.icon;
              return (
                <div key={tag} className="group/badge relative">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full border border-white/10 ${badge.bgColor} transition-all duration-300 hover:scale-110 hover:border-white/30 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]`}>
                    <IconComponent className={`h-3.5 w-3.5 ${badge.color}`} />
                  </div>
                  
                  {/* Badge Tooltip */}
                  <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 pointer-events-none opacity-0 group-hover/badge:opacity-100 transition-opacity duration-200 z-20">
                    <div className="rounded-md bg-black/95 px-2 py-1 text-[9px] font-bold text-white shadow-2xl backdrop-blur-md whitespace-nowrap border border-white/10">
                      {tag}
                    </div>
                    <div className="absolute top-full left-1/2 -mt-1 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-black/95 border-r border-b border-white/10" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Last Task Indicator */}
          <div className="group/tooltip relative flex shrink-0 items-center gap-1.5 text-white/20 transition-colors hover:text-white/40">
            <span className="whitespace-nowrap text-[9px] font-bold tracking-tight">
              <span className="mr-1.5 text-[8px] font-medium opacity-40">{lastTaskDate}</span>
              {lastTaskTime}
            </span>
            <Clock className="h-3 w-3" />
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200">
              <div className="rounded-md bg-black/90 px-2 py-1 text-[9px] font-semibold text-white shadow-2xl backdrop-blur-md whitespace-nowrap border border-white/10">
                Last Task executed
              </div>
              {/* Tooltip Arrow */}
              <div className="absolute top-full right-2 -mt-1 h-2 w-2 rotate-45 bg-black/90 border-r border-b border-white/10" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
