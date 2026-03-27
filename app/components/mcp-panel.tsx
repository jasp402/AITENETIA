'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface MCPContext {
  name: string;
  status: 'connected' | 'disconnected' | 'processing';
  tools: string[];
}

interface MCPPanelProps {
  contexts: MCPContext[];
}

const statusIcons = {
  connected: <CheckCircle className="w-4 h-4 text-accent" />,
  disconnected: <AlertCircle className="w-4 h-4 text-destructive" />,
  processing: <Clock className="w-4 h-4 text-primary animate-spin" />,
};

const statusLabels = {
  connected: 'Conectado',
  disconnected: 'Desconectado',
  processing: 'Procesando',
};

const statusBg = {
  connected: 'bg-accent/20 border-accent/50',
  disconnected: 'bg-destructive/20 border-destructive/50',
  processing: 'bg-primary/20 border-primary/50',
};

export function MCPPanel({ contexts }: MCPPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="backdrop-blur-md bg-gradient-to-br from-white/5 to-white/2 border border-border/50 rounded-xl p-6"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-xl">🧠</span>
          Model Context Protocol (MCP)
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Contextos y herramientas disponibles para los agentes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence mode="wait">
          {contexts.map((context, idx) => (
            <motion.div
              key={context.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02, backdropFilter: 'blur(30px)' }}
              className={`backdrop-blur-sm border rounded-lg p-4 transition-all ${statusBg[context.status]}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white text-sm">{context.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <motion.div
                      animate={{
                        scale: context.status === 'processing' ? [1, 1.2, 1] : 1,
                      }}
                      transition={{
                        repeat: context.status === 'processing' ? Infinity : 0,
                        duration: 1.5,
                      }}
                    >
                      {statusIcons[context.status]}
                    </motion.div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {statusLabels[context.status]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tools list */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">
                  HERRAMIENTAS ({context.tools.length})
                </p>
                <div className="space-y-1">
                  {context.tools.map((tool, toolIdx) => (
                    <motion.div
                      key={tool}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (idx * 0.1) + (toolIdx * 0.05) }}
                      className="flex items-center gap-2 text-[10px] text-muted-foreground bg-black/20 px-2 py-1.5 rounded border border-border/30 backdrop-blur-sm"
                    >
                      <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-1.5 h-1.5 rounded-full bg-primary/70"
                      />
                      <code className="font-mono">{tool}</code>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 p-3 bg-black/20 rounded-lg border border-border/30 backdrop-blur-sm"
      >
        <p className="text-[11px] text-muted-foreground">
          <span className="font-semibold">MCP</span> permite que los agentes accedan a herramientas externas como búsqueda web, acceso a archivos y bases de datos.
        </p>
      </motion.div>
    </motion.div>
  );
}
