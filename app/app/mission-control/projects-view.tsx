"use client";

import { Folder } from "lucide-react";
import { motion } from "framer-motion";
import { ProjectCard } from "@/components/project-card";

export function ProjectsView({
  projects,
  projectTasks,
  setSelectedProjectId,
  setCurrentView,
  handlePrepareProject,
}: {
  projects: any[];
  projectTasks: Record<string, any[]>;
  setSelectedProjectId: (projectId: string) => void;
  setCurrentView: (view: "overview") => void;
  handlePrepareProject: (projectId: string, goal: string) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project: any) => {
        const tasks = projectTasks[project.id] || [];
        const completed = tasks.filter((task) => task.status === "completed").length;
        return (
          <ProjectCard
            key={project.id}
            project={project}
            taskCount={tasks.length}
            completedCount={completed}
            onClick={() => {
              setSelectedProjectId(project.id);
              setCurrentView("overview");
            }}
            onInitialize={handlePrepareProject}
          />
        );
      })}
      {projects.length === 0 && (
        <div className="col-span-full flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-white/5 opacity-20">
          <Folder size={48} className="mb-4" />
          <p className="text-[10px] font-bold uppercase tracking-widest">No projects registered</p>
        </div>
      )}
    </motion.div>
  );
}
