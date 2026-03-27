'use client';

import { Loader2, CheckCircle2, MinusCircle } from 'lucide-react';
import { motion } from 'framer-motion';

type Review = {
  agent_id?: string;
  agent_name?: string;
  agent_role?: string;
  participates?: boolean;
  status?: string;
};

export function SpecialistReviewProgress({
  reviews,
  totalExpected,
}: {
  reviews: Review[];
  totalExpected: number;
}) {
  const completed = reviews.length;

  return (
    <div className="space-y-5 rounded-[2rem] border border-white/8 bg-black/20 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Specialist Analysis</div>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-white">{completed}/{totalExpected} specialists reviewed</h3>
        </div>
        <div className="text-right text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
          Waiting for RouteMap consolidation
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full border border-white/5 bg-white/5 p-[1px]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.round((completed / totalExpected) * 100))}%` }}
          className="h-full rounded-full bg-primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: totalExpected }).map((_, index) => {
          const review = reviews[index];
          const done = !!review;
          const participates = review?.participates;

          return (
            <div key={review?.agent_id || `placeholder-${index}`} className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
              <div>
                <div className="text-sm font-bold text-white">{review?.agent_name || `Specialist ${index + 1}`}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  {review?.agent_role || 'Analyzing'}
                </div>
              </div>
              <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                !done
                  ? 'border border-white/10 bg-white/[0.04] text-white/40'
                  : participates
                    ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                    : 'border border-amber-300/20 bg-amber-300/10 text-amber-200'
              }`}>
                {!done ? <Loader2 size={12} className="animate-spin" /> : participates ? <CheckCircle2 size={12} /> : <MinusCircle size={12} />}
                {!done ? 'Reviewing' : participates ? 'Participates' : 'Skipped'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
