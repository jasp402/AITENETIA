'use client';

import {
  LayoutDashboard, Kanban, Users, Folder,
  Settings, Activity, Shield, Cpu, Command
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: any) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Control' },
    { id: 'ia', icon: Cpu, label: 'IA' },
    { id: 'kanban', icon: Kanban, label: 'Workflow' },
    { id: 'fleet', icon: Activity, label: 'Fleet' },
    { id: 'agents', icon: Users, label: 'Specialists' },
    { id: 'projects', icon: Folder, label: 'Projects' },
  ];

  return (
    <aside className="w-20 h-screen flex flex-col items-center py-8 border-r border-white/[0.05] bg-black/40 backdrop-blur-3xl relative z-50">
      <div className="mb-10">
         <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all hover:scale-105 active:scale-95 cursor-pointer">
            <Command size={20} className="text-white" />
         </div>
      </div>

      <nav className="flex-1 flex flex-col gap-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className="group relative flex flex-col items-center gap-1 transition-all"
          >
            <div className={`p-3.5 rounded-md transition-all duration-200 ${
              activeView === item.id 
              ? 'bg-white/[0.05] text-primary border border-white/[0.05]' 
              : 'text-white/20 hover:text-white/60 hover:bg-white/[0.02]'
            }`}>
              <item.icon size={18} strokeWidth={activeView === item.id ? 2.5 : 2} />
            </div>
            <span className={`text-[7px] font-bold uppercase tracking-[0.2em] transition-opacity duration-200 ${
              activeView === item.id ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-40'
            }`}>
              {item.label}
            </span>
            
            {activeView === item.id && (
              <motion.div 
                layoutId="sidebar-active"
                className="absolute -left-10 w-[2px] h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"
              />
            )}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-4 pb-4 opacity-30 hover:opacity-100 transition-opacity">
         <button className="p-3 rounded-md text-white/40 hover:text-white hover:bg-white/[0.02] transition-all">
            <Shield size={16} />
         </button>
         <button className="p-3 rounded-md text-white/40 hover:text-white hover:bg-white/[0.02] transition-all">
            <Settings size={16} />
         </button>
      </div>
    </aside>
  );
}
