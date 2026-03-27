'use client';

import { motion } from 'framer-motion';
import { Command, Plus, Activity, Globe } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function PageHeader({ title, subtitle, onAction, actionLabel }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-40 w-full bg-[#111113]/50 backdrop-blur-[16px] -webkit-backdrop-blur-[16px] border-b border-white/25">
      <div className="px-8 py-10 flex items-end justify-between max-w-[1600px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <div className="flex items-center gap-2 text-primary/60 mb-2">
            <Command size={12} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Aitenetia . Security_Protocol_v2</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tighter text-white uppercase italic">
            {title}
            <span className="text-primary/40">.</span>
          </h1>
          {subtitle && (
            <p className="text-[11px] text-white/20 font-medium uppercase tracking-[0.2em]">
              {subtitle}
            </p>
          )}
        </motion.div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-8 px-6 py-3 rounded-md bg-white/[0.02] border border-white/[0.05]">
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-none">System Status</span>
                <span className="text-[11px] font-bold text-green-500/80 uppercase mt-1 flex items-center gap-1.5">
                   <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" /> Operational
                </span>
             </div>
             <div className="h-6 w-px bg-white/5" />
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-none">A2A Stream</span>
                <span className="text-[11px] font-bold text-white/60 uppercase mt-1 flex items-center gap-1.5">
                   <Activity size={10} className="text-primary" /> Active_Sync
                </span>
             </div>
          </div>

          {onAction && (
            <button 
              onClick={onAction}
              className="px-6 py-3 rounded-md bg-white text-black text-[11px] font-black uppercase tracking-tighter hover:bg-white/90 transition-all shadow-[0_10px_20px_rgba(255,255,255,0.05)] active:scale-95"
            >
              <Plus size={14} className="inline-block mr-2 mt-[-2px]" />
              {actionLabel || 'New Action'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
