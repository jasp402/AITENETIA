"use client";

import { motion } from "framer-motion";

export function AgentsView({
  filteredAgentsForProject,
  setSelectedAgent,
}: {
  filteredAgentsForProject: any[];
  setSelectedAgent: (agent: any) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto grid max-w-[1600px] grid-cols-6 gap-4">
      {filteredAgentsForProject.map((agent) => (
        <div key={agent.id} onClick={() => setSelectedAgent(agent)} className="group flex cursor-pointer flex-col items-center gap-4 rounded-md border border-white/[0.05] bg-white/[0.01] p-8 transition-all hover:border-primary/30">
          <div className="text-4xl opacity-40 grayscale transition-opacity group-hover:opacity-100 group-hover:grayscale-0">{agent.avatar || agent.emoji || "🤖"}</div>
          <div className="text-center text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/80">{agent.name}</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/60">{agent.projectTaskCount} tareas</div>
        </div>
      ))}
    </motion.div>
  );
}
