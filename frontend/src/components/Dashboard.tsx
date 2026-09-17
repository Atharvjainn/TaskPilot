'use client';

import React from 'react';
import {
  AlertCircle,
  Hammer,
  MapPin,
  HardHat,
  Clock,
  CheckCircle,
  Clock3,
  Layers,
  Sparkles
} from 'lucide-react';
import { Snag, Task } from '@/types';

interface DashboardProps {
  snags: Snag[];
  tasks: Task[];
  activeTab: 'snags' | 'tasks';
  setActiveTab: (tab: 'snags' | 'tasks') => void;
  onUpdateSnagStatus: (id: number, status: string) => Promise<void>;
  onUpdateTaskStatus: (id: number, status: string) => Promise<void>;
  loading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  snags,
  tasks,
  activeTab,
  setActiveTab,
  onUpdateSnagStatus,
  onUpdateTaskStatus,
  loading
}) => {
  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 shadow-xl backdrop-blur-sm space-y-4">
      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('snags')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'snags'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>🚨</span>
            <span>Site Snags</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'snags'
                  ? 'bg-amber-500/30 text-amber-200'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {snags.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'tasks'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>🔨</span>
            <span>Assigned Tasks</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'tasks'
                  ? 'bg-purple-500/30 text-purple-200'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tasks.length}
            </span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          Live Project Log
        </span>
      </div>

      {/* Tab Content */}
      <div className="space-y-3 min-h-[220px]">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-xs">
            Loading dashboard data...
          </div>
        ) : activeTab === 'snags' ? (
          /* Snags List */
          snags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs space-y-1">
              <span className="text-2xl">📋</span>
              <p>No snags found for this project.</p>
              <p className="text-[11px] text-slate-600">
                Use voice to report a site issue (e.g. "Create a snag for...")
              </p>
            </div>
          ) : (
            snags.map((snag) => {
              const p = (snag.priority || '').toLowerCase();
              const prioBadge =
                p === 'high' || p === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : p === 'low'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

              return (
                <div
                  key={snag.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-100">{snag.title}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${prioBadge}`}
                    >
                      {snag.priority || 'Medium'}
                    </span>
                  </div>

                  {snag.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">{snag.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      <MapPin className="h-3 w-3 text-emerald-400" />
                      <span>{snag.location || 'Unassigned Location'}</span>
                    </span>

                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      <HardHat className="h-3 w-3 text-amber-400" />
                      <span>{snag.contractor || 'Unassigned Contractor'}</span>
                    </span>

                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      <span className="text-[11px] text-slate-400 font-medium">Status:</span>
                      <select
                        value={snag.status}
                        onChange={(e) => onUpdateSnagStatus(snag.id, e.target.value)}
                        className="bg-slate-950 text-slate-200 text-xs rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Tasks List */
          tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs space-y-1">
              <span className="text-2xl">🔨</span>
              <p>No tasks assigned yet.</p>
              <p className="text-[11px] text-slate-600">
                Use voice to delegate work (e.g. "Assign task to plumber...")
              </p>
            </div>
          ) : (
            tasks.map((task) => {
              const statusBadge =
                task.status === 'Completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : task.status === 'In Progress'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30';

              return (
                <div
                  key={task.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 border-l-4 border-l-purple-500 hover:border-slate-700/80 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-100">{task.title}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${statusBadge}`}
                    >
                      {task.status || 'Pending'}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      <HardHat className="h-3 w-3 text-amber-400" />
                      <span>
                        Assigned: <strong>{task.contractor || 'Contractor'}</strong>
                      </span>
                    </span>

                    {task.location && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        <MapPin className="h-3 w-3 text-emerald-400" />
                        <span>{task.location}</span>
                      </span>
                    )}

                    {task.due_date && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-300">
                        <Clock className="h-3 w-3 text-purple-400" />
                        <span>Due: {task.due_date}</span>
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[11px]">
                      Priority: {task.priority || 'Medium'}
                    </span>

                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      <span className="text-[11px] text-slate-400 font-medium">Status:</span>
                      <select
                        value={task.status}
                        onChange={(e) => onUpdateTaskStatus(task.id, e.target.value)}
                        className="bg-slate-950 text-slate-200 text-xs rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
};
