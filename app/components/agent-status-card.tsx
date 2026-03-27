'use client';

import { motion } from 'framer-motion';
import {
  Cpu, Code, Layout, Server, Database, Zap,
  Shield, Search, FlaskConical, Terminal,
  Layers, Eye, Crown, Award, Lock, Palette,
  Globe, GitBranch, FileText, Cloud, Bot,
  Activity, Gauge, Key, Users, ClipboardList,
  AlertTriangle, Monitor, RefreshCcw, BarChart3,
  TestTube, Target, Plug, Bug, type LucideIcon
} from 'lucide-react';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    capabilities: string[];
  };
  status?: 'idle' | 'running' | 'busy' | 'error' | 'activo';
  progress?: number;
}

// Color de acento único por tipo de agente
const getAgentAccent = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('senior') || n.includes('developer'))  return '#67e8f9'; // cyan
  if (n.includes('reviewer'))                            return '#c4b5fd'; // violet
  if (n.includes('frontend'))                            return '#93c5fd'; // blue
  if (n.includes('backend'))                             return '#6ee7b7'; // emerald
  if (n.includes('architect'))                           return '#fcd34d'; // amber
  if (n.includes('database'))                            return '#f9a8d4'; // pink
  if (n.includes('devops'))                              return '#86efac'; // green
  if (n.includes('security'))                            return '#fda4af'; // rose
  if (n.includes('qa'))                                  return '#fdba74'; // orange
  return '#a5b4fc';                                                        // indigo fallback
};

const getAgentIcon = (name: string) => {
  const n = name.toLowerCase();
  const cls = 'text-white/50';
  if (n.includes('senior') || n.includes('developer')) return <Code size={15} className={cls} />;
  if (n.includes('reviewer'))  return <Search size={15} className={cls} />;
  if (n.includes('frontend'))  return <Layout size={15} className={cls} />;
  if (n.includes('backend'))   return <Server size={15} className={cls} />;
  if (n.includes('architect')) return <Cpu size={15} className={cls} />;
  if (n.includes('database'))  return <Database size={15} className={cls} />;
  if (n.includes('devops'))    return <Zap size={15} className={cls} />;
  if (n.includes('security'))  return <Shield size={15} className={cls} />;
  if (n.includes('qa'))        return <FlaskConical size={15} className={cls} />;
  return <Terminal size={15} className={cls} />;
};

// Mapa de capability → icono + label legible
const CAPABILITY_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  architecture:      { icon: Layers,        label: 'Architecture' },
  review:            { icon: Eye,           label: 'Review' },
  leadership:        { icon: Crown,         label: 'Leadership' },
  quality:           { icon: Award,         label: 'Quality' },
  security:          { icon: Shield,        label: 'Security' },
  best_practices:    { icon: FileText,      label: 'Best Practices' },
  react:             { icon: Code,          label: 'React' },
  vue:               { icon: Code,          label: 'Vue' },
  styling:           { icon: Palette,       label: 'Styling' },
  ui_ux:             { icon: Layout,        label: 'UI/UX' },
  node:              { icon: Server,        label: 'Node.js' },
  apis:              { icon: Plug,          label: 'APIs' },
  server_logic:      { icon: Cpu,           label: 'Server Logic' },
  patterns:          { icon: Layers,        label: 'Patterns' },
  strategy:          { icon: Target,        label: 'Strategy' },
  scalability:       { icon: BarChart3,     label: 'Scalability' },
  rest:              { icon: Globe,         label: 'REST' },
  graphql:           { icon: GitBranch,     label: 'GraphQL' },
  documentation:     { icon: FileText,      label: 'Documentation' },
  sql:               { icon: Database,      label: 'SQL' },
  no_sql:            { icon: Database,      label: 'NoSQL' },
  indexing:          { icon: Search,        label: 'Indexing' },
  modeling:          { icon: Layers,        label: 'Modeling' },
  docker:            { icon: Monitor,       label: 'Docker' },
  ci_cd:             { icon: RefreshCcw,    label: 'CI/CD' },
  cloud:             { icon: Cloud,         label: 'Cloud' },
  automation:        { icon: Bot,           label: 'Automation' },
  monitoring:        { icon: Activity,      label: 'Monitoring' },
  speed:             { icon: Gauge,         label: 'Speed' },
  load_testing:      { icon: BarChart3,     label: 'Load Testing' },
  pentest:           { icon: Bug,           label: 'Pentest' },
  encryption:        { icon: Lock,          label: 'Encryption' },
  auth:              { icon: Key,           label: 'Auth' },
  mentoring:         { icon: Users,         label: 'Mentoring' },
  planning:          { icon: ClipboardList, label: 'Planning' },
  risk_management:   { icon: AlertTriangle, label: 'Risk Mgmt' },
  frontend:          { icon: Layout,        label: 'Frontend' },
  backend:           { icon: Server,        label: 'Backend' },
  full_lifecycle:    { icon: RefreshCcw,    label: 'Full Lifecycle' },
  test_plans:        { icon: ClipboardList, label: 'Test Plans' },
  coverage:          { icon: BarChart3,     label: 'Coverage' },
  quality_metrics:   { icon: BarChart3,     label: 'Quality Metrics' },
  playwright:        { icon: TestTube,      label: 'Playwright' },
  jest:              { icon: FlaskConical,  label: 'Jest' },
  automation_scripts:{ icon: Terminal,      label: 'Automation Scripts' },
};

export function AgentStatusCard({ agent, status = 'idle', progress = 0 }: AgentCardProps) {
  // Normalizar estados (backend usa 'activo' para 'running')
  const isRunning = status === 'running' || status === 'activo';
  const isBusy    = status === 'busy' || status === 'error';
  const accent    = getAgentAccent(agent.name);

  const dotClass = isRunning
    ? 'bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6),0_0_0_2px_rgba(34,197,94,0.15)]'
    : isBusy
    ? 'bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.6),0_0_0_2px_rgba(249,115,22,0.15)]'
    : 'bg-white/15 shadow-[0_0_0_2px_rgba(255,255,255,0.05)]';

  const statusColor = isRunning ? '#86efac' : isBusy ? '#fda4af' : undefined;

  return (
    <div className="
      relative overflow-hidden rounded-2xl p-[18px] pb-4
      border border-white/[0.09]
      shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-1px_0_rgba(0,0,0,0.4),0_12px_40px_rgba(0,0,0,0.5)]
      backdrop-blur-[20px]
      transition-all duration-300
      hover:border-white/20
    "
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >

      {/* Frosted glow — pseudo ::before */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -40, right: -40,
          width: 100, height: 100,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
        }}
      />

      {/* Card header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Icon */}
        <div className="
          w-[34px] h-[34px] rounded-[9px] shrink-0
          flex items-center justify-center
          bg-white/[0.06] border border-white/10
          shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
        ">
          {getAgentIcon(agent.name)}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <h3 className="
            text-[13px] font-bold tracking-[0.02em]
            text-white/90 mb-1 truncate
          ">
            {agent.name}
          </h3>
          <p className="
            text-[10px] font-semibold uppercase
            tracking-[0.1em] leading-[1.5]
          "
            style={{ color: accent }}
          >
            {agent.role}
          </p>
        </div>

        {/* Status dot */}
        <div className={`w-[7px] h-[7px] rounded-full shrink-0 mt-1 ${dotClass}`} />
      </div>

      {/* Status + progress */}
      <div className="mb-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: statusColor ?? 'rgba(255,255,255,0.3)' }}
          >
            {status}
          </span>
          <span
            className="text-[10px] font-semibold tracking-[0.05em]"
            style={{ color: statusColor ?? 'rgba(255,255,255,0.25)' }}
          >
            {progress}%
          </span>
        </div>
        <div className="h-[2px] w-full bg-white/[0.07] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1 }}
            className="h-full rounded-full"
            style={{
              background: isRunning
                ? 'linear-gradient(90deg, #22c55e, #86efac)'
                : isBusy
                ? 'linear-gradient(90deg, #f97316, #fda4af)'
                : accent,
            }}
          />
        </div>
      </div>

      {/* Capability icons */}
      <div className="flex items-center gap-1.5">
        {(Array.isArray(agent.capabilities) ? agent.capabilities : []).slice(0, 5).map((cap) => {
          const entry = CAPABILITY_ICONS[cap];
          const IconComp = entry?.icon ?? Terminal;
          const label = entry?.label ?? cap;
          return (
            <div
              key={cap}
              title={label}
              className="
                w-[26px] h-[26px] rounded-[6px]
                flex items-center justify-center
                bg-white/[0.04] border border-white/10
                text-white/30 cursor-default
                transition-colors duration-150
                hover:border-white/20 hover:text-white/55
              "
            >
              <IconComp size={12} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
