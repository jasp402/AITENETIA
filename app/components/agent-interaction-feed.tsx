'use client';

import { ArrowRightLeft, CheckCircle2, CornerDownRight, GitPullRequestArrow, MessageSquareMore, RotateCcw } from 'lucide-react';

interface Interaction {
  id: string;
  type: 'handoff' | 'consultation' | 'review';
  status: string;
  from_agent_name?: string;
  to_agent_name?: string;
  task_title?: string;
  message: string;
  response?: string | null;
}

interface Budget {
  agent_id: string;
  agent_name?: string;
  budget_total: number;
  budget_used: number;
  user_reset_required: number | boolean;
}

export function AgentInteractionFeed({
  interactions,
  budgets,
  onResetBudget,
}: {
  interactions: Interaction[];
  budgets: Budget[];
  onResetBudget: (agentId: string) => void;
}) {
  return (
    <div className="space-y-5 rounded-[2rem] border border-white/8 bg-white/[0.02] p-6">
      <div className="flex items-center gap-3">
        <ArrowRightLeft size={16} className="text-cyan-300" />
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200">Agent Coordination</div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {budgets.map((budget) => (
          <div key={budget.agent_id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-white">{budget.agent_name || budget.agent_id}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  Consultations {budget.budget_used}/{budget.budget_total}
                </div>
              </div>
              <button
                onClick={() => onResetBudget(budget.agent_id)}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full border border-white/6 bg-white/5 p-[1px]">
              <div
                className={`h-full rounded-full ${budget.budget_used >= budget.budget_total ? 'bg-red-400' : 'bg-cyan-400'}`}
                style={{ width: `${Math.min(100, Math.round((budget.budget_used / budget.budget_total) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {interactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-5 text-sm text-white/35">
            No interactions have been recorded yet.
          </div>
        ) : (
          interactions.map((interaction) => {
            const Icon = interaction.type === 'handoff' ? CornerDownRight : interaction.type === 'consultation' ? MessageSquareMore : GitPullRequestArrow;
            return (
              <div key={interaction.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                      <Icon size={12} className="text-cyan-300" />
                      {interaction.type}
                      <span>{interaction.from_agent_name} {'->'} {interaction.to_agent_name}</span>
                    </div>
                    <div className="mt-2 text-sm font-black text-white">{interaction.task_title || 'Task interaction'}</div>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{interaction.message}</p>
                    {interaction.response ? (
                      <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/8 px-3 py-2 text-[11px] leading-relaxed text-emerald-100/85">
                        {interaction.response}
                      </div>
                    ) : null}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                    <CheckCircle2 size={12} />
                    {interaction.status}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
