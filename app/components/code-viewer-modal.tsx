'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, File, Folder, Terminal, Eye, Loader2, Copy, Check, Globe } from 'lucide-react';

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export function CodeViewerModal({ isOpen, onClose, projectId, projectName }: CodeViewerModalProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'code' | 'logs'>('code');
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

  useEffect(() => {
    if (isOpen && projectId) {
      fetchFileList();
      const logInterval = setInterval(fetchLogs, 3000);
      return () => clearInterval(logInterval);
    }
  }, [isOpen, projectId]);

  const fetchFileList = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/projects/${projectId}/files`);
      const data = await res.json();
      setFiles(data);
    } catch (e) { /* ignore */ }
  };

  const fetchFileContent = async (path: string) => {
    setIsLoading(true);
    setSelectedFile(path);
    try {
      const res = await fetch(`${API_URL}/api/v1/projects/${projectId}/read/${encodeURIComponent(path)}`);
      const data = await res.json();
      setFileContent(data.content || '');
    } catch (e) {
      setFileContent('// Error loading file content');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/projects/${projectId}/logs`);
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (e) { /* ignore */ }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl h-[80vh] bg-[#09090b] border border-white/[0.05] rounded-lg overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header Compacto */}
        <div className="h-12 border-b border-white/[0.05] flex items-center justify-between px-4 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="text-white/40"><Globe size={14} /></div>
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-tight">{projectName}</span>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-[10px] text-white/30 uppercase font-medium">Source Viewer</span>
          </div>

          <div className="flex bg-white/[0.03] p-0.5 rounded-md border border-white/[0.05]">
              <button 
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 rounded-[4px] text-[10px] font-bold transition-all ${activeTab === 'code' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
              >
                Explorer
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1 rounded-[4px] text-[10px] font-bold transition-all ${activeTab === 'logs' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
              >
                Runtime
              </button>
          </div>

          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'code' ? (
            <>
              {/* Explorer Slim */}
              <div className="w-56 border-r border-white/[0.05] bg-black/20 overflow-y-auto p-2 space-y-0.5 scrollbar-hide">
                <div className="px-2 py-2 text-[9px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                  <Folder size={10} /> Root Directory
                </div>
                {files.map((file) => (
                  <button
                    key={file}
                    onClick={() => fetchFileContent(file)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all text-left ${
                      selectedFile === file ? 'bg-white/5 text-primary' : 'text-white/40 hover:bg-white/[0.02] hover:text-white/70'
                    }`}
                  >
                    <File size={12} className="opacity-40" />
                    <span className="truncate">{file}</span>
                  </button>
                ))}
              </div>

              {/* Code Viewer Tech */}
              <div className="flex-1 flex flex-col bg-black/40">
                {selectedFile ? (
                  <div className="flex-1 overflow-auto p-6 font-mono text-[12px] leading-relaxed">
                    {isLoading ? (
                      <div className="h-full flex items-center justify-center opacity-10"><Loader2 size={24} className="animate-spin" /></div>
                    ) : (
                      <pre className="text-white/60"><code>{fileContent}</code></pre>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-white/10">
                    <File size={32} className="mb-4 opacity-5" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Select an object to inspect</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 bg-[#050505] p-6 font-mono text-[11px] overflow-y-auto scrollbar-hide">
              <div className="flex items-center gap-2 mb-4 text-white/20">
                <Terminal size={12} />
                <span className="uppercase tracking-widest text-[9px] font-bold">A2A_RUNTIME_LOGS_STREAM</span>
              </div>
              <pre className="text-white/50 whitespace-pre-wrap">{logs || '> Waiting for container output...'}</pre>
            </div>
          )}
        </div>

        {/* Footer Ultra Slim */}
        <div className="h-8 px-4 border-t border-white/[0.05] bg-black/40 flex items-center justify-between text-[9px] font-bold text-white/20 uppercase tracking-widest">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-blue-500/50" /> Read-Only</div>
              <div className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-primary/50 animate-pulse" /> Sync Active</div>
           </div>
           <span>Aitenetia Protocol Instance</span>
        </div>
      </motion.div>
    </div>
  );
}
