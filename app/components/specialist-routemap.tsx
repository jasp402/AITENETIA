'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, MinusCircle, Sparkles } from 'lucide-react';
import { AGENTS } from '@/lib/agents';

type ReviewTask = {
  title: string;
  description: string;
  priority?: string;
  phase?: string;
  dependencies?: string[];
};

type Review = {
  agent_id: string;
  agent_name: string;
  agent_role?: string;
  participates: boolean;
  reason: string;
  phase?: string;
  tasks: ReviewTask[];
};

const phaseOrder = ['analysis', 'design', 'build', 'validation', 'release'];

export function SpecialistRouteMap({ reviews }: { reviews: Review[] }) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const orderedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      if (a.participates !== b.participates) return a.participates ? -1 : 1;
      return (phaseOrder.indexOf(a.phase || 'analysis')) - (phaseOrder.indexOf(b.phase || 'analysis'));
    });
  }, [reviews]);

  return (
    <div className="space-y-4">
      {orderedReviews.map((review) => {
        const agent = AGENTS.find((item: any) => item.name === review.agent_name);
        const isOpen = openIds[review.agent_id] ?? review.participates;

        return (
          <div key={review.agent_id} className="overflow-hidden rounded-[1.75rem] border border-white/8 bg-white/[0.02]">
            <button
              onClick={() => setOpenIds((current) => ({ ...current, [review.agent_id]: !isOpen }))}
              className="flex w-full items-center gap-4 px-6 py-5 text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-2xl">
                {(agent as any)?.emoji || 'AI'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="truncate text-lg font-black tracking-tight text-white">{review.agent_name}</h3>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                    review.participates
                      ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                      : 'border border-amber-300/20 bg-amber-300/10 text-amber-200'
                  }`}>
                    {review.participates ? 'Participating' : 'No Action Needed'}
                  </span>
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
                  {review.agent_role || (agent as any)?.title || 'Specialist'}
                </div>
              </div>
              <div className="hidden text-right md:block">
                <div className="text-lg font-black text-white">{review.tasks?.length || 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">tasks</div>
              </div>
              {isOpen ? <ChevronDown size={18} className="text-white/40" /> : <ChevronRight size={18} className="text-white/40" />}
            </button>

            {isOpen && (
              <div className="border-t border-white/6 px-6 pb-6 pt-5">
                <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Specialist Assessment</div>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">{review.reason}</p>
                </div>

                {review.participates ? (
                  <div className="mt-5 space-y-3">
                    {review.tasks.map((task, index) => (
                      <div key={`${review.agent_id}-${index}`} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-black text-white">{task.title}</div>
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                            {task.phase || review.phase || 'analysis'}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                            {task.priority || 'medium'}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-white/60">{task.description}</p>
                        {(task.dependencies || []).length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(task.dependencies || []).map((dependency) => (
                              <span key={dependency} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                                depends on {dependency}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-4 text-white/45">
                    <MinusCircle size={16} />
                    <span className="text-sm">This specialist reviewed the project and concluded no direct task is required.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
        <div className="flex items-center gap-3 text-primary">
          <Sparkles size={16} />
          <div className="text-[10px] font-black uppercase tracking-[0.3em]">RouteMap Structure</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {phaseOrder.map((phase) => (
            <div key={phase} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{phase}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
