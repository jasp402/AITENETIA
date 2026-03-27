'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, Route, X } from 'lucide-react';
import { SpecialistReviewProgress } from '@/components/specialist-review-progress';
import { SpecialistRouteMap } from '@/components/specialist-routemap';

type Review = {
  agent_id: string;
  agent_name: string;
  agent_role?: string;
  participates: boolean;
  reason: string;
  phase?: string;
  tasks: any[];
};

type RouteMap = {
  totalSpecialists: number;
  participatingSpecialists: number;
  skippedSpecialists: number;
  totalTasks: number;
  reviews: Review[];
};

export function SpecialistRouteMapModal({
  isOpen,
  onClose,
  onConfirm,
  isAnalyzing,
  isMaterializing,
  projectName,
  routeMap,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isAnalyzing: boolean;
  isMaterializing: boolean;
  projectName: string;
  routeMap: RouteMap | null;
}) {
  if (!isOpen) return null;

  const reviews = routeMap?.reviews || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/90 backdrop-blur-xl"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.2rem] border border-white/8 bg-[#050816]/95 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-6 border-b border-white/6 bg-white/[0.03] p-8">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-primary">Specialist RouteMap</div>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{projectName}</h2>
              <p className="mt-2 text-sm text-white/50">
                {isAnalyzing ? 'Cada especialista esta evaluando si participa y que tareas propone.' : 'Plan consolidado por especialista antes de materializar el backlog.'}
              </p>
            </div>
            <button onClick={onClose} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-white/45 transition-colors hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="scrollbar-hide flex-1 overflow-y-auto p-8">
            {isAnalyzing ? (
              <SpecialistReviewProgress reviews={reviews} totalExpected={14} />
            ) : routeMap ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Reviewed</div>
                    <div className="mt-2 text-2xl font-black text-white">{routeMap.totalSpecialists}</div>
                  </div>
                  <div className="rounded-3xl border border-emerald-400/10 bg-emerald-400/5 p-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/70">Participating</div>
                    <div className="mt-2 text-2xl font-black text-white">{routeMap.participatingSpecialists}</div>
                  </div>
                  <div className="rounded-3xl border border-amber-300/10 bg-amber-300/5 p-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/70">Skipped</div>
                    <div className="mt-2 text-2xl font-black text-white">{routeMap.skippedSpecialists}</div>
                  </div>
                  <div className="rounded-3xl border border-primary/10 bg-primary/5 p-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Proposed Tasks</div>
                    <div className="mt-2 text-2xl font-black text-white">{routeMap.totalTasks}</div>
                  </div>
                </div>

                <SpecialistRouteMap reviews={routeMap.reviews} />
              </div>
            ) : (
              <div className="flex min-h-[380px] items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] text-center">
                <div>
                  <Route size={34} className="mx-auto text-white/15" />
                  <div className="mt-4 text-sm font-black uppercase tracking-[0.3em] text-white/35">RouteMap pending</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-white/6 bg-white/[0.03] p-6">
            <div className="text-xs text-white/40">
              {isAnalyzing
                ? 'Waiting for all specialists to finish their review.'
                : 'Confirm the RouteMap to transform these specialist proposals into executable tasks.'}
            </div>
            {!isAnalyzing && (
              <button
                onClick={onConfirm}
                disabled={isMaterializing || !routeMap}
                className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-primary transition-all disabled:opacity-40"
              >
                {isMaterializing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {isMaterializing ? 'Materializing...' : 'Confirm Plan'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
