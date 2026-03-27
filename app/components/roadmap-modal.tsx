'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Clock, PlayCircle, AlertCircle, ArrowDown, User, Sparkles, Loader2, Terminal } from 'lucide-react';
import { AGENTS } from '@/lib/agents';

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_agent_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'active';
  agent_name?: string;
  agent_role?: string;
}

interface RoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  tasks: Task[];
  onGenerate?: () => void;
  isGenerating?: boolean;
}

const SIMULATION_STEPS = [
  { agent: "System", message: "Iniciando análisis del proyecto...", icon: "⚡" },
  { agent: "System", message: "Procesando archivos de configuración (package.json, tsconfig.json)...", icon: "📁" },
  { agent: "Senior Developer", message: "Analizando arquitectura global y dependencias...", icon: "🐙" },
  { agent: "Software Architect", message: "Definiendo patrones de diseño y estructura de módulos...", icon: "🪼" },
  { agent: "Backend Expert", message: "Diseñando esquemas de datos y endpoints de API...", icon: "🦈" },
  { agent: "Frontend Specialist", message: "Planificando componentes UI y flujo de navegación...", icon: "🐠" },
  { agent: "Database Expert", message: "Optimizando consultas y persistencia...", icon: "🦀" },
  { agent: "QA Lead", message: "Estableciendo estrategia de pruebas y criterios de aceptación...", icon: "🦊" },
  { agent: "Tech Lead", message: "Asignando tareas al equipo especializado...", icon: "🐢" },
  { agent: "System", message: "Generando roadmap de ejecución final...", icon: "✨" },
];

export function RoadmapModal({ isOpen, onClose, projectName, tasks, onGenerate, isGenerating }: RoadmapModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isGenerating) {
      setCurrentStep(0);
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < SIMULATION_STEPS.length - 1) return prev + 1;
          clearInterval(interval);
          return prev;
        });
      }, 2000);
      return () => clearInterval(interval);
    } else if (tasks.length > 0) {
      // Si la generación terminó y ya hay tareas, saltar al final
      setCurrentStep(SIMULATION_STEPS.length - 1);
    }
  }, [isGenerating, tasks.length]);

  const getAgentInfo = (agentId: string, agentName?: string): { name: string, avatar: string, role?: string } => {
    const fromId = AGENTS.find(a => a.id === agentId) as any;
    if (fromId) return { name: fromId.name, avatar: fromId.avatar || fromId.emoji || '🤖', role: fromId.role || fromId.title };
    
    // Fallback search by name (stripping emojis if necessary)
    if (agentName) {
      const fromName = AGENTS.find(a => 
        a.name.toLowerCase().includes(agentName.toLowerCase()) || 
        agentName.toLowerCase().includes(a.name.toLowerCase())
      ) as any;
      if (fromName) return { name: fromName.name, avatar: fromName.avatar || fromName.emoji || '🤖', role: fromName.role || fromName.title };
    }
    
    return { name: agentName || 'Agente IA', avatar: '🤖', role: 'Especialista en IA' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={14} />;
      case 'running': 
      case 'active': return <Loader2 size={14} className="animate-spin" />;
      case 'failed': return <AlertCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  // Group tasks by agent
  const groupedTasks = tasks.reduce((acc, task) => {
    const agentKey = task.agent_name || task.assigned_agent_id;
    if (!acc[agentKey]) acc[agentKey] = [];
    acc[agentKey].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/90 backdrop-blur-xl"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-4xl glass-card overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">{projectName}</h2>
                <p className="text-primary text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Roadmap de Ejecución A2A</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto relative scrollbar-hide">
              {tasks.length === 0 && isGenerating ? (
                <div className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="w-full max-w-lg flex flex-col items-center text-center px-8">
                     {/* Main Progress Indicator */}
                     <div className="relative mb-12">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                        <div className="relative p-6 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
                           <Loader2 size={48} className="text-primary animate-spin" />
                        </div>
                        <div className="absolute -top-1 -right-1">
                           <Sparkles size={20} className="text-primary animate-bounce" />
                        </div>
                     </div>

                     <div className="space-y-4 max-w-sm">
                        <h3 className="text-2xl font-black text-white tracking-tight uppercase">Analizando Proyecto</h3>
                        <div className="h-1 w-24 bg-primary/20 mx-auto rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ x: "-100%" }}
                             animate={{ x: "100%" }}
                             transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                             className="h-full w-1/2 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                           />
                        </div>
                        
                        <AnimatePresence mode="wait">
                          <motion.p 
                            key={currentStep}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-sm text-primary font-bold tracking-wide italic"
                          >
                            {SIMULATION_STEPS[currentStep]?.message}
                          </motion.p>
                        </AnimatePresence>
                        
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium opacity-50">
                           LA IA ESTÁ PLANIFICANDO LAS TAREAS DEL EQUIPO
                        </p>
                     </div>
                  </div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="py-20 text-center text-muted-foreground">
                     <Clock size={48} className="mx-auto mb-4 opacity-10" />
                     <p className="text-sm">No se han generado tareas. Haz clic en el botón para comenzar el análisis.</p>
                  </div>
                </div>
              ) : (
                <div className="p-8 space-y-12 pb-24">
                  {isGenerating && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-primary/10 border border-primary/20 p-4 rounded-2xl mb-8 flex items-center gap-3"
                    >
                      <Loader2 size={16} className="text-primary animate-spin" />
                      <span className="text-xs font-bold text-primary uppercase tracking-widest">
                        Analizando... {tasks.length} tareas identificadas hasta ahora
                      </span>
                    </motion.div>
                  )}

                  {Object.entries(groupedTasks).map(([agentKey, agentTasks], groupIndex) => {
                    const representativeTask = agentTasks[0];
                    if (!representativeTask) return null;
                    const agent = getAgentInfo(representativeTask.assigned_agent_id, representativeTask.agent_name);
                    
                    return (
                      <div key={agentKey} className="space-y-6">
                        {/* Agent Group Header */}
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl glass border border-white/10 flex items-center justify-center text-2xl">
                            {agent.avatar}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white leading-tight">{agent.name}</h3>
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest">
                              {representativeTask.agent_role || agent.role || 'Especialista en IA'}
                            </p>
                          </div>
                          <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            {agentTasks.length} {agentTasks.length === 1 ? 'Tarea' : 'Tareas'}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 pl-4 border-l-2 border-white/5 ml-6">
                          {agentTasks.map((task, taskIndex) => (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: (groupIndex * 0.1) + (taskIndex * 0.05) }}
                              className="glass-card p-5 group flex items-start justify-between hover:border-primary/30 transition-all duration-300"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground font-mono">#{task.id.slice(0, 8)}</span>
                                </div>
                                <h4 className="text-white font-bold text-sm tracking-tight">{task.title}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">{task.description}</p>
                              </div>
                              
                              <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0 ml-4 ${
                                task.status === 'completed' ? 'bg-green-400/10 text-green-400' : 
                                (task.status === 'running' || task.status === 'active') ? 'bg-primary/10 text-primary animate-pulse' : 
                                task.status === 'failed' ? 'bg-red-400/10 text-red-400' :
                                'bg-white/5 text-muted-foreground'
                              }`}>
                                {getStatusIcon(task.status)}
                                {task.status}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full bg-green-400" /> Completed
                  </div>
                  <div className="flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full bg-primary" /> Active
                  </div>
               </div>
               <button 
                  onClick={onGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {isGenerating ? (
                    <Loader2 size={16} className="animate-spin text-primary" />
                  ) : (
                    <Sparkles size={16} className="text-primary" />
                  )}
                  {isGenerating ? "Analizando..." : "Analizar Proyecto"}
               </button>
            </div>
          </motion.div>
        </div>
    </AnimatePresence>
  );
}
