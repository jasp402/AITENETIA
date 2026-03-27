'use client';

import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface DashboardHeaderProps {
  totalAgents: number;
  activeAgents: number;
  completedAgents: number;
  totalSkills: number;
  onAddAgent?: () => void;
}

export function DashboardHeader({
  totalAgents,
  activeAgents,
  completedAgents,
  totalSkills,
  onAddAgent,
}: DashboardHeaderProps) {
  const stats = [
    {
      label: 'Total Meeseeks',
      value: totalAgents,
      icon: '🤖',
      color: '#00d9ff',
    },
    {
      label: 'Activos',
      value: activeAgents,
      status: 'working',
      icon: '✓',
      color: '#00ff88',
    },
    {
      label: 'Completados',
      value: completedAgents,
      status: 'completed',
      icon: `${completedAgents}`,
      color: '#6a5acd',
    },
    {
      label: 'Skills',
      value: totalSkills,
      icon: '⚡',
      color: '#ffa500',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const generalProgress = Math.round((completedAgents / totalAgents) * 100) || 0;

  return (
    <motion.div 
      className="border-b border-border/20 bg-gradient-to-r from-background/80 to-background/40 backdrop-blur-md sticky top-0 z-20 p-6 md:p-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Monitoreo en tiempo real de tus agentes IA</p>
        </div>
        {onAddAgent && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddAgent}
            className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 rounded-lg font-semibold transition-colors backdrop-blur-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Agente</span>
          </motion.button>
        )}
      </div>

      {/* Stats Grid */}
      <motion.div 
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        variants={containerVariants}
      >
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -4, backdropFilter: 'blur(30px)' }}
            className="rounded-lg border border-border/30 bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-md p-4 transition-all"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{
                  backgroundColor: stat.color + '30',
                  color: stat.color,
                }}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{stat.label}</p>
                <p className="text-white font-bold text-xl">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Progress Bar */}
      <motion.div 
        variants={itemVariants}
        className="mt-4 rounded-lg border border-border/30 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-md p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold text-sm">AVANCE GENERAL</h3>
          <motion.span
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-primary font-bold text-sm"
          >
            {generalProgress}%
          </motion.span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${generalProgress}%` }}
            transition={{ duration: 1.5, delay: 0.2, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary via-secondary to-accent shadow-lg shadow-primary/50"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
