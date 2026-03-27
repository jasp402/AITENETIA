'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layout, Folder, Sparkles, Terminal } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: { name: string; path: string; stack: string; goal: string }) => void;
}

export function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    stack: 'Next.js, Bun, SQLite',
    goal: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-2xl glass-card overflow-hidden z-10 p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                  <Layout size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Iniciar Nuevo Proyecto</h2>
                  <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold opacity-50">Configurar Orquestación</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-primary tracking-widest ml-1">Nombre del Proyecto</label>
                  <div className="relative">
                     <Folder className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                     <input
                       type="text"
                       required
                       value={formData.name}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}
                       placeholder="ej: Nexus E-commerce"
                       className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-all"
                     />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-primary tracking-widest ml-1">Path de Trabajo</label>
                  <div className="relative">
                     <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                     <input
                       type="text"
                       required
                       value={formData.path}
                       onChange={(e) => setFormData({...formData, path: e.target.value})}
                       placeholder="./projects/nexus"
                       className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-all"
                     />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-primary tracking-widest ml-1">Tecnologías (Stack)</label>
                <input
                  type="text"
                  value={formData.stack}
                  onChange={(e) => setFormData({...formData, stack: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-primary tracking-widest ml-1">Objetivo del Proyecto (Meta del Orquestador)</label>
                <textarea
                  required
                  rows={4}
                  value={formData.goal}
                  onChange={(e) => setFormData({...formData, goal: e.target.value})}
                  placeholder="Describe qué quieres que los agentes construyan..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-all resize-none"
                />
              </div>

              <div className="pt-4 flex gap-4">
                 <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all border border-white/5"
                 >
                   Cancelar
                 </button>
                 <button 
                  type="submit"
                  className="flex-3 py-4 rounded-2xl bg-primary text-background font-black flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform neon-glow"
                 >
                   <Sparkles size={20} />
                   Lanzar Orquestación
                 </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
