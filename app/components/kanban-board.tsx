'use client';

import { motion } from 'framer-motion';
import { 
  CheckCircle2, Clock, Loader2, AlertCircle, 
  Cpu, User, Activity, ArrowRight
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked' | 'awaiting_user' | 'awaiting_peer_review' | 'awaiting_dependency';
  assigned_agent_id: string;
  agent_name?: string;
  model_used?: string;
}

interface KanbanBoardProps {
  tasks: Task[];
  agents: any[];
}

export function KanbanBoard({ tasks, agents }: KanbanBoardProps) {
  const statuses = [
    { id: 'pending', label: 'PLANNING', icon: Clock, color: 'text-purple-400', borderColor: 'border-purple-500/50', accentColor: 'bg-purple-500' },
    { id: 'running', label: 'IN PROGRESS', icon: Loader2, color: 'text-blue-400', borderColor: 'border-blue-500/50', accentColor: 'bg-blue-500' },
    { id: 'blocked', label: 'BLOCKED', icon: AlertCircle, color: 'text-orange-300', borderColor: 'border-orange-500/50', accentColor: 'bg-orange-500' },
    { id: 'awaiting_user', label: 'AWAITING USER', icon: Cpu, color: 'text-fuchsia-300', borderColor: 'border-fuchsia-500/50', accentColor: 'bg-fuchsia-500' },
    { id: 'completed', label: 'DEPLOYED', icon: CheckCircle2, color: 'text-teal-400', borderColor: 'border-teal-500/50', accentColor: 'bg-teal-500' },
    { id: 'failed', label: 'CRITICAL', icon: AlertCircle, color: 'text-red-400', borderColor: 'border-red-500/50', accentColor: 'bg-red-500' },
  ];

  return (
    <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide min-h-[600px]">
      {statuses.map((status) => (
        <div key={status.id} className="flex-1 min-w-[320px] flex flex-col group/column">
          {/* Column Header Minimal */}
          <div className={`flex items-center justify-between mb-4 px-3 py-2 border-t-2 rounded-t-sm transition-all duration-300 bg-white/[0.01] ${status.borderColor}`}>
            <div className="flex items-center gap-2.5">
              <status.icon size={14} className={`${status.color} ${status.id === 'running' ? 'animate-spin' : ''}`} />
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                {status.label}
              </h3>
            </div>
            <span className="text-[10px] font-bold bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05] text-white/30">
              {tasks.filter(t =>
                status.id === 'blocked'
                  ? t.status === 'blocked' || t.status === 'awaiting_dependency' || t.status === 'awaiting_peer_review'
                  : t.status === status.id
              ).length}
            </span>
          </div>

          {/* Column Body Technical */}
          <div className="flex-1 space-y-4 p-2 rounded-b-md bg-white/[0.005] border-x border-b border-white/[0.03] min-h-[500px]">
            {tasks.filter(t =>
              status.id === 'blocked'
                ? t.status === 'blocked' || t.status === 'awaiting_dependency' || t.status === 'awaiting_peer_review'
                : t.status === status.id
            ).map((task) => (
              <motion.div
                layout
                key={task.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 border border-white/[0.05] bg-[#121214] hover:bg-[#18181b] relative group rounded-xl transition-all duration-300 shadow-sm"
              >
                {/* Title */}
                <h4 className="text-[12px] font-semibold text-white/90 leading-snug mb-4 group-hover:text-primary transition-colors">
                  {task.title}
                </h4>

                {/* Action Indicator Box (Style from image) */}
                <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between group/action cursor-pointer hover:bg-white/[0.06] transition-all">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${status.accentColor} opacity-60`} />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-tight group-hover/action:text-white/60">
                      {status.id === 'running' ? 'Continue planning' : 'Review Task'}
                    </span>
                  </div>
                </div>

                {/* Footer Minimal */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.03]">
                   <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                         <div className={`w-1.5 h-1.5 rounded-full ${status.accentColor}`} />
                         <span className="text-[9px] font-bold text-white/30 uppercase">
                           {status.id === 'failed' ? 'Urgent' : status.id === 'running' ? 'High' : 'Normal'}
                         </span>
                      </div>
                      <span className="text-[9px] font-medium text-white/15">about 1 month ago</span>
                   </div>
                   
                   <div className="flex items-center gap-2">
                      {task.agent_name && (
                        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/[0.05]">
                          <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">{task.agent_name}</span>
                        </div>
                      )}
                   </div>
                </div>

                {/* Processing Indicator */}
                {status.id === 'running' && (
                   <div className="absolute bottom-0 left-0 h-[1px] bg-primary/40 w-full overflow-hidden rounded-b-xl">
                      <motion.div 
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      />
                   </div>
                )}
              </motion.div>
            ))}

            {tasks.filter(t =>
              status.id === 'blocked'
                ? t.status === 'blocked' || t.status === 'awaiting_dependency' || t.status === 'awaiting_peer_review'
                : t.status === status.id
            ).length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-[0.02] pt-10">
                 <Activity size={32} />
                 <span className="text-[8px] font-bold uppercase tracking-[0.4em] mt-3">Static</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
