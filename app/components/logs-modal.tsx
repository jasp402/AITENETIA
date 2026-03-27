'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, Cpu, Clock, AlertCircle } from 'lucide-react';

interface Log {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface LogsModalProps {
  isOpen: boolean;
  agentName: string;
  logs: Log[];
  onClose: () => void;
}

export function LogsModal({ isOpen, agentName, logs, onClose }: LogsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-end p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/60 backdrop-blur-md"
        />

        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-xl h-full glass-card rounded-[2rem] overflow-hidden flex flex-col border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary neon-glow">
                <Terminal size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight leading-none">{agentName}</h2>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Activity Live Feed</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Logs List */}
          <div className="flex-1 overflow-y-auto p-8 font-mono text-sm space-y-4">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={index}
                  className="group"
                >
                  <div className="flex gap-4">
                    <span className="text-[10px] text-muted-foreground/40 font-bold w-16 pt-1 shrink-0">
                      [{log.timestamp}]
                    </span>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold h-fit shrink-0 ${
                      log.level === 'success' ? 'bg-green-500/10 text-green-400' :
                      log.level === 'error' ? 'bg-destructive/10 text-destructive' :
                      log.level === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-white/5 text-white/50'
                    }`}>
                      {log.level.toUpperCase()}
                    </div>
                    <p className="text-white/80 leading-relaxed group-hover:text-white transition-colors">
                      {log.message}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30">
                <Clock size={48} className="mb-4" />
                <p>No hay actividad registrada aún.</p>
              </div>
            )}
          </div>

          {/* Footer Footer */}
          <div className="p-6 bg-black/20 border-t border-white/5 flex justify-between items-center">
             <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Stream: Connected
             </div>
             <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">
                Limpiar Consola
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
