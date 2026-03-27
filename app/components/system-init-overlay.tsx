'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Loader2, Box, Sparkles } from 'lucide-react';

interface SystemEvent {
  id: number;
  message: string;
  type: 'info' | 'docker' | 'ai' | 'success' | 'error';
  timestamp: string;
}

interface SystemInitOverlayProps {
  isOpen: boolean;
  projectId: string;
  mode?: 'prepare' | 'tasks';
  onComplete: () => void;
}

export function SystemInitOverlay({ isOpen, projectId, mode = 'prepare', onComplete }: SystemInitOverlayProps) {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4001').replace('localhost', '127.0.0.1');

  useEffect(() => {
    let interval: any;
    let finished = false;

    if (isOpen && projectId) {
      interval = setInterval(async () => {
        try {
          const [eventsRes, projectRes] = await Promise.all([
            fetch(`${API_URL}/api/v1/projects/${projectId}/events`),
            fetch(`${API_URL}/api/v1/projects/${projectId}`)
          ]);

          const data = await eventsRes.json() as SystemEvent[];
          const project = await projectRes.json() as { environment_status?: string; status?: string };
          setEvents(data);

          const isDone = mode === 'prepare'
            ? project.environment_status === 'ready' || project.environment_status === 'failed'
            : project.status === 'active' || project.status === 'environment_ready';

          if (isDone && !finished) {
            finished = true;
            setTimeout(() => onComplete(), 1200);
          }
        } catch {
          // ignore polling errors
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [API_URL, isOpen, mode, onComplete, projectId]);

  if (!isOpen) return null;

  const title = mode === 'prepare' ? 'Environment_Preparation' : 'Task_Generation';
  const subtitle = mode === 'prepare' ? 'Booting_Docker_Runtime' : 'Planning_Agent_Workflow';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-2xl">
      <div className="w-full max-w-2xl px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-3xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-black">
                <Cpu size={40} className="animate-pulse text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold uppercase italic tracking-tighter text-white">{title}</h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.4em] text-white/20">{subtitle}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-white/[0.05] bg-black/40 shadow-2xl">
            <div className="flex h-8 items-center justify-between border-b border-white/[0.05] bg-white/[0.02] px-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500/50" />
                <div className="h-2 w-2 rounded-full bg-yellow-500/50" />
                <div className="h-2 w-2 rounded-full bg-green-500/50" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Core_Log_Stream</span>
            </div>

            <div className="scrollbar-hide h-64 space-y-2 overflow-y-auto p-6 font-mono text-[11px]">
              {events.length === 0 && (
                <div className="flex items-center gap-2 italic text-white/20">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Waiting for system handshake...</span>
                </div>
              )}
              {events.map((event) => (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={event.id} className="flex gap-3">
                  <span className="shrink-0 text-white/10">[{new Date(event.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                  <span
                    className={
                      event.type === 'docker'
                        ? 'text-blue-400'
                        : event.type === 'ai'
                          ? 'text-primary'
                          : event.type === 'success'
                            ? 'text-green-400'
                            : event.type === 'error'
                              ? 'text-red-400'
                              : 'text-white/40'
                    }
                  >
                    {event.message}
                  </span>
                </motion.div>
              ))}
              <div className="flex items-center gap-2 pt-2 text-primary animate-pulse">
                <span className="h-3 w-1 bg-primary" />
                <span className="italic">Processing_Request...</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/10">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Box size={10} /> Sandboxing: Active</span>
              <span className="flex items-center gap-1.5"><Sparkles size={10} /> Neural_Planning: On</span>
            </div>
            <span>Build_v2.1.0</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
