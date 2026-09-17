'use client';

import React from 'react';
import { Building2, RefreshCw, Layers, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Project } from '@/types';

interface HeaderProps {
  project: Project | null;
  loading: boolean;
  onRefresh: () => void;
  isBackendOffline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  loading,
  onRefresh,
  isBackendOffline
}) => {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-b border-slate-800 mb-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/10">
          <Layers className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              ArchScale AS-03
            </span>
            <span className="text-xs text-slate-500">Voice-to-Command Layer</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            TaskPilot <span className="text-indigo-400">Voice</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        {isBackendOffline ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <span>Backend Offline (Check port 8000)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs font-medium max-w-[280px] sm:max-w-xs truncate">
            <Building2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{project ? project.name : 'Connecting to project...'}</span>
          </div>
        )}

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/50 transition-colors disabled:opacity-50"
          title="Refresh dashboard data"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};
