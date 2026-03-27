'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Code, X, Save, Shield, Zap } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  soul?: string;
  manual?: string;
}

interface AgentEditorProps {
  agent: Agent;
  onSave: (agent: Agent) => void;
  onClose: () => void;
}

export function AgentPsychosis({ agent, onSave, onClose }: AgentEditorProps) {
  const [editedSoul, setEditedSoul] = useState(agent.soul || '');
  const [editedManual, setEditedManual] = useState(agent.manual || '');
  const [activeTab, setActiveTab] = useState<'soul' | 'manual'>('soul');

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl h-[70vh] bg-[#09090b] border border-white/[0.05] rounded-lg overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header Compacto */}
        <div className="h-14 border-b border-white/[0.05] flex items-center justify-between px-6 bg-white/[0.01]">
           <div className="flex items-center gap-4">
              <div className="text-primary/60"><Brain size={18} /></div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-tight">{agent.name}</h2>
                <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Neural Configuration</p>
              </div>
           </div>
           <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
              <X size={18} />
           </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
           {/* Navigation Tabs */}
           <div className="w-48 border-r border-white/[0.05] bg-black/20 p-3 space-y-1">
              <button 
                onClick={() => setActiveTab('soul')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-bold transition-all ${activeTab === 'soul' ? 'bg-white/5 text-primary' : 'text-white/30 hover:bg-white/[0.02]'}`}
              >
                <Shield size={12} /> Personality
              </button>
              <button 
                onClick={() => setActiveTab('manual')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-bold transition-all ${activeTab === 'manual' ? 'bg-white/5 text-primary' : 'text-white/30 hover:bg-white/[0.02]'}`}
              >
                <Code size={12} /> Tech Manual
              </button>
           </div>

           {/* Editor Area */}
           <div className="flex-1 p-6 bg-[#050505] flex flex-col">
              <textarea 
                value={activeTab === 'soul' ? editedSoul : editedManual}
                onChange={(e) => activeTab === 'soul' ? setEditedSoul(e.target.value) : setEditedManual(e.target.value)}
                className="flex-1 w-full bg-transparent border-none focus:ring-0 text-white/70 font-mono text-[12px] leading-relaxed resize-none scrollbar-hide"
                placeholder={activeTab === 'soul' ? "// Define the 'soul' logic..." : "// Technical guidelines..."}
              />
           </div>
        </div>

        {/* Action Bar */}
        <div className="h-14 border-t border-white/[0.05] bg-white/[0.01] flex items-center justify-between px-6">
           <span className="text-[9px] font-bold text-white/20 uppercase">Last sync: Stable</span>
           <button 
             onClick={() => onSave({ ...agent, soul: editedSoul, manual: editedManual })}
             className="flex items-center gap-2 px-4 py-2 rounded-md bg-white text-black font-bold text-[10px] uppercase hover:bg-white/90 transition-colors"
           >
              <Save size={12} /> Update Consciousness
           </button>
        </div>
      </motion.div>
    </div>
  );
}
