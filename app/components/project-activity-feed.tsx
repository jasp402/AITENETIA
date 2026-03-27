'use client';

import { Activity, AlertTriangle, Brain, CheckCircle2, Clock3, GitBranch, PauseCircle, PlayCircle } from 'lucide-react';

interface EventItem {
  id: number;
  message: string;
  type: string;
  timestamp: string;
}

const eventIconMap: Record<string, any> = {
  ai: Brain,
  success: CheckCircle2,
  error: AlertTriangle,
  docker: Activity,
  info: Clock3,
};

export function ProjectActivityFeed({ events }: { events: EventItem[] }) {
  const recent = events.slice(-12).reverse();

  return (
    <div className="space-y-4 rounded-[2rem] border border-white/8 bg-white/[0.02] p-6">
      <div className="flex items-center gap-3">
        <GitBranch size={16} className="text-primary" />
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Activity Feed</div>
      </div>

      {recent.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-5 text-sm text-white/35">
          No activity recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((event) => {
            const Icon = eventIconMap[event.type] || Activity;
            return (
              <div key={event.id} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                <div className="mt-0.5 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                  <Icon size={12} className="text-white/60" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-white/70">{event.message}</p>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">
                    {event.type} · {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
