"use client";

import { PlayCircle } from "lucide-react";
import { motion } from "framer-motion";

export function FleetView({
  fleetRows,
  setSelectedProjectId,
  setSelectedAgent,
}: {
  fleetRows: any[];
  setSelectedProjectId: (projectId: string) => void;
  setSelectedAgent: (agent: any) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-[1600px] space-y-4">
      {fleetRows.map((row: any) => (
        <div
          key={row.id}
          onClick={() => {
            if (row.project?.id) setSelectedProjectId(row.project.id);
            setSelectedAgent(row);
          }}
          className="grid cursor-pointer grid-cols-[1.2fr_1.4fr_1fr_120px_120px_120px] items-center gap-4 rounded-3xl border border-white/8 bg-white/[0.02] px-6 py-5"
        >
          <div>
            <div className="text-sm font-black text-white">{row.name}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">{row.role || row.title}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">{row.currentProjectName}</div>
            <div className="mt-2 text-sm text-white/75">{row.currentTaskName}</div>
          </div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">{row.currentTaskStatus}</div>
          <div className="text-center text-sm font-black text-white">{row.pendingCount}</div>
          <div className="text-center text-sm font-black text-white">{row.runningCount}</div>
          <div className="text-center text-sm font-black text-white">{row.completedCount}</div>
        </div>
      ))}
      {fleetRows.length === 0 && (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
          <PlayCircle size={40} className="mb-4 text-white/15" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/35">Sin backlog generado</p>
        </div>
      )}
    </motion.div>
  );
}
