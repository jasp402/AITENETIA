'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Star, Users, TrendingUp } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  downloads: number;
  rating: number;
  icon: string;
  price: 'free' | 'paid';
  installed: boolean;
}

const mockSkills: Skill[] = [
  {
    id: '1',
    name: 'Data Analysis Pro',
    description: 'Advanced data analysis with AI insights',
    category: 'Analytics',
    downloads: 12500,
    rating: 4.8,
    icon: '📊',
    price: 'free',
    installed: false,
  },
  {
    id: '2',
    name: 'Code Generator',
    description: 'Generate code from natural language descriptions',
    category: 'Development',
    downloads: 8900,
    rating: 4.6,
    icon: '⚙️',
    price: 'free',
    installed: true,
  },
  {
    id: '3',
    name: 'Report Builder',
    description: 'Create beautiful automated reports with templates',
    category: 'Reporting',
    downloads: 5600,
    rating: 4.7,
    icon: '📋',
    price: 'paid',
    installed: false,
  },
  {
    id: '4',
    name: 'API Integrator',
    description: 'Connect and integrate any REST API seamlessly',
    category: 'Integration',
    downloads: 7200,
    rating: 4.9,
    icon: '🔗',
    price: 'free',
    installed: true,
  },
  {
    id: '5',
    name: 'ML Pipeline',
    description: 'Build and deploy machine learning pipelines',
    category: 'AI/ML',
    downloads: 3400,
    rating: 4.5,
    icon: '🤖',
    price: 'paid',
    installed: false,
  },
  {
    id: '6',
    name: 'Task Scheduler',
    description: 'Schedule and automate recurring tasks',
    category: 'Automation',
    downloads: 9800,
    rating: 4.4,
    icon: '⏰',
    price: 'free',
    installed: false,
  },
];

interface SkillsMarketplaceProps {
  onInstall?: (skillId: string) => void;
}

export function SkillsMarketplace({ onInstall }: SkillsMarketplaceProps) {
  const [installedSkills, setInstalledSkills] = useState<string[]>(
    mockSkills.filter((s) => s.installed).map((s) => s.id)
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...new Set(mockSkills.map((s) => s.category))];

  const filteredSkills = selectedCategory === 'All'
    ? mockSkills
    : mockSkills.filter((s) => s.category === selectedCategory);

  const handleInstall = (skillId: string) => {
    if (installedSkills.includes(skillId)) {
      setInstalledSkills(installedSkills.filter((id) => id !== skillId));
    } else {
      setInstalledSkills([...installedSkills, skillId]);
    }
    onInstall?.(skillId);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <div className="w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-3xl font-bold text-white mb-2">Skills Marketplace</h2>
        <p className="text-[#8b8ba3]">Discover and install powerful skills to enhance your agents</p>
      </motion.div>

      {/* Category Filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8 flex gap-2 overflow-x-auto pb-2"
      >
        {categories.map((category) => (
          <motion.button
            key={category}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-semibold ${
              selectedCategory === category
                ? 'bg-[#00d9ff] text-[#0f0f1e]'
                : 'bg-[#2a2a3e] text-[#e8e9f3] hover:bg-[#3a3a4e]'
            }`}
          >
            {category}
          </motion.button>
        ))}
      </motion.div>

      {/* Skills Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredSkills.map((skill) => (
          <motion.div
            key={skill.id}
            variants={itemVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="rounded-xl border border-[#2a2a3e] bg-[#1a1a2e]/80 backdrop-blur-md p-6 shadow-lg hover:border-[#00d9ff]/50 transition-colors group"
          >
            {/* Skill Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#00d9ff] to-[#00ff88] flex items-center justify-center text-3xl flex-shrink-0">
                  {skill.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-1">{skill.name}</h3>
                  <span className="inline-block px-3 py-1 rounded-full bg-[#6a5acd]/20 text-[#6a5acd] text-xs font-semibold">
                    {skill.category}
                  </span>
                </div>
              </div>
              {skill.price === 'paid' && (
                <span className="px-2 py-1 rounded bg-[#ff6b9d]/20 text-[#ff6b9d] text-xs font-semibold">
                  Pro
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-[#8b8ba3] text-sm mb-4">{skill.description}</p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Download size={16} className="text-[#00d9ff]" />
                <div>
                  <p className="text-xs text-[#8b8ba3]">Downloads</p>
                  <p className="text-sm font-bold text-white">{(skill.downloads / 1000).toFixed(1)}k</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-[#ffa500]" />
                <div>
                  <p className="text-xs text-[#8b8ba3]">Rating</p>
                  <p className="text-sm font-bold text-white">{skill.rating}</p>
                </div>
              </div>
            </div>

            {/* Install Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleInstall(skill.id)}
              className={`w-full py-2 rounded-lg font-semibold text-sm transition-all ${
                installedSkills.includes(skill.id)
                  ? 'bg-[#00ff88] text-[#0f0f1e] hover:bg-[#00ff88]/80'
                  : 'bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff] hover:bg-[#00d9ff]/30'
              }`}
            >
              {installedSkills.includes(skill.id) ? 'Installed ✓' : 'Install'}
            </motion.button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
