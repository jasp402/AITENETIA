import { Box, ChevronRight } from 'lucide-react';

interface ProjectCardsProps {
  projects: any[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  projectTasks: Record<string, any[]>;
}

const GRADIENTS = [
  { gradient: 'from-[#fb923c] to-[#a855f7]', colors: { start: '#fb923c', end: '#a855f7' } },
  { gradient: 'from-[#22d3ee] to-[#3b82f6]', colors: { start: '#22d3ee', end: '#3b82f6' } },
  { gradient: 'from-[#34d399] to-[#14b8a6]', colors: { start: '#34d399', end: '#14b8a6' } },
  { gradient: 'from-[#f472b6] to-[#f43f5e]', colors: { start: '#f472b6', end: '#f43f5e' } },
  { gradient: 'from-[#facc15] to-[#f97316]', colors: { start: '#facc15', end: '#f97316' } },
  { gradient: 'from-[#818cf8] to-[#8b5cf6]', colors: { start: '#818cf8', end: '#8b5cf6' } },
  { gradient: 'from-[#60a5fa] to-[#6366f1]', colors: { start: '#60a5fa', end: '#6366f1' } },
  { gradient: 'from-[#2dd4bf] to-[#06b6d4]', colors: { start: '#2dd4bf', end: '#06b6d4' } },
  { gradient: 'from-[#fb7185] to-[#ef4444]', colors: { start: '#fb7185', end: '#ef4444' } },
];

const DEFAULT_GRADIENT = { gradient: 'from-[#fb923c] to-[#a855f7]', colors: { start: '#fb923c', end: '#a855f7' } };

export function ProjectCards({
  projects,
  selectedProjectId,
  setSelectedProjectId,
  projectTasks,
}: ProjectCardsProps) {
  return (
    <div className="col-span-3 w-full shrink-0">
      <header className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Box className="h-4.5 w-4.5 text-white/30" />
          <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/30">
            Project Fleet
          </h2>
        </div>
        <span className="text-[11px] font-bold text-white/30">{projects.length}</span>
      </header>

      <div className="flex flex-col gap-2.5">
        {projects.map((project, index) => {
          const isSelected = selectedProjectId === project.id;
          const styling = GRADIENTS[index % GRADIENTS.length] ?? DEFAULT_GRADIENT;
          const type = project.stack || project.config?.framework || 'CUSTOM';
          
          const tasks = projectTasks[project.id] || [];
          const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
          const rawProgress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
          const progress = project.status === 'delivery_pending' && project.environment_details?.deliveryReady === false
            ? Math.min(rawProgress, 96)
            : rawProgress;
          const shortId = String(index + 1).padStart(2, '0');

          return (
            <div 
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={`group relative flex cursor-pointer items-stretch gap-4 rounded-xl border transition-all duration-300 p-[1px] ${
                isSelected 
                  ? 'bg-gradient-to-br' 
                  : 'border-white/5 bg-transparent hover:border-white/10'
              }`}
              style={isSelected ? { 
                backgroundImage: `linear-gradient(to bottom right, ${styling.colors.start}, ${styling.colors.end})` 
              } : {}}
            >
              <div className={`flex w-full items-stretch gap-4 rounded-[11px] bg-[#0f0e1a] p-3.5 transition-all ${
                isSelected ? 'bg-opacity-90' : 'bg-opacity-100 group-hover:bg-white/[0.03]'
              }`}>
                {/* Folder SVG Thumbnail */}
                <div className="relative w-20 shrink-0 self-stretch">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full drop-shadow-lg transition-all duration-500">
                    <defs>
                      <linearGradient id={`grad-${project.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={styling.colors.start} />
                        <stop offset="100%" stopColor={styling.colors.end} />
                      </linearGradient>
                    </defs>
                    {/* Background with gradient */}
                    <rect width="100" height="100" rx="16" fill={`url(#grad-${project.id})`} />
                    {/* Folder foreground shape (dark) */}
                    <path 
                      d={isSelected 
                        ? "M0 45 C 0 35, 4 35, 10 35 L 38 35 C 48 35, 50 45, 58 45 L 92 45 C 100 45, 100 52, 100 59 L 100 92 C 100 100, 92 100, 85 100 L 15 100 C 5 100, 0 95, 0 85 Z"
                        : "M0 25 C 0 15, 4 15, 10 15 L 38 15 C 48 15, 50 25, 58 25 L 92 25 C 100 25, 100 32, 100 39 L 100 92 C 100 100, 92 100, 85 100 L 15 100 C 5 100, 0 95, 0 85 Z"
                      }
                      fill="#0f0e1a" 
                      className="transition-all duration-500 ease-in-out"
                    />
                    {/* Text inside SVG */}
                    <text x="12" y="72" className="fill-white/90 text-[10px] font-black tracking-tighter">{shortId}</text>
                    <text x="12" y="88" className="fill-white/30 text-[6px] font-bold uppercase tracking-widest">{type.split(' ')[0]}</text>
                  </svg>
                </div>

                <div className="flex flex-1 flex-col justify-between py-1">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-0.5">
                      <h3 className={`text-[11px] font-bold tracking-wider uppercase transition-colors ${
                        isSelected ? 'text-white' : 'text-white/80'
                      }`}>
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className={`h-1 w-1 rounded-full bg-gradient-to-r ${styling.gradient} opacity-60`} />
                        <span className="text-[9px] font-bold tracking-wider text-white/20 uppercase">
                          {type}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`h-3.5 w-3.5 transition-all ${
                      isSelected ? 'translate-x-0.5 text-white/50' : 'text-white/10 group-hover:translate-x-0.5 group-hover:text-white/30'
                    }`} />
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[8px] font-bold tracking-wider text-white/20 uppercase">
                          <span>Progress</span>
                          <span className={isSelected ? 'text-white/60' : 'text-white/40'}>{progress}%</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                          <div 
                        className={`h-full bg-gradient-to-r transition-all duration-500 ${project.status === 'delivery_pending' ? 'from-[#f59e0b] to-[#fde68a]' : styling.gradient}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
