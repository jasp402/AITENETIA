'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Badge, TrendingUp, Zap } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category: 'data' | 'ui' | 'integration' | 'optimization';
  level: 'basic' | 'intermediate' | 'advanced';
  agentsUsing: number;
  icon: string;
}

interface SkillsPanelProps {
  skills: Skill[];
}

const categoryColors = {
  data: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  ui: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400' },
  integration: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400' },
  optimization: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
};

const levelColors = {
  basic: 'bg-yellow-500/20 text-yellow-400',
  intermediate: 'bg-blue-500/20 text-blue-400',
  advanced: 'bg-red-500/20 text-red-400',
};

export function SkillsPanel({ skills }: SkillsPanelProps) {
  const byCategory = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    const categoryBucket = acc[skill.category];
    if (categoryBucket) categoryBucket.push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  const categoryLabels = {
    data: 'Procesamiento de Datos',
    ui: 'Diseño UI/UX',
    integration: 'Integraciones',
    optimization: 'Optimización',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="backdrop-blur-md bg-gradient-to-br from-white/5 to-white/2 border border-border/50 rounded-xl p-6"
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-xl">⚡</span>
          Sistema de Skills
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Capacidades especializadas disponibles para los agentes
        </p>
      </div>

      {/* Skills by category */}
      <div className="space-y-6">
        {Object.entries(byCategory).map(([category, categorySkills], catIdx) => {
          const color = categoryColors[category as keyof typeof categoryColors];
          const label = categoryLabels[category as keyof typeof categoryLabels];

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIdx * 0.1 }}
            >
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${color.text}`}>
                <Zap className="w-4 h-4" />
                {label}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence>
                  {categorySkills.map((skill, skillIdx) => (
                    <motion.div
                      key={skill.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: (catIdx * 0.1) + (skillIdx * 0.05) }}
                      whileHover={{
                        scale: 1.02,
                        boxShadow: `0 0 20px ${color.border.split('-')[2]}`,
                      }}
                      className={`backdrop-blur-sm border rounded-lg p-3 transition-all cursor-pointer ${color.bg} ${color.border}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{skill.icon}</span>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-white">
                              {skill.name}
                            </h4>
                          </div>
                        </div>
                      </div>

                      {/* Level badge */}
                      <div className="mb-2">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${levelColors[skill.level]} border border-current/30`}>
                          {skill.level.charAt(0).toUpperCase() + skill.level.slice(1)}
                        </span>
                      </div>

                      {/* Usage info */}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        <span>{skill.agentsUsing} agentes usando</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 p-3 bg-black/20 rounded-lg border border-border/30 backdrop-blur-sm"
      >
        <p className="text-[11px] text-muted-foreground">
          Los <span className="font-semibold">Skills</span> son módulos reutilizables que permiten a los agentes realizar tareas especializadas. Puedes asignar múltiples skills a cada agente para ampliar sus capacidades.
        </p>
      </motion.div>
    </motion.div>
  );
}
