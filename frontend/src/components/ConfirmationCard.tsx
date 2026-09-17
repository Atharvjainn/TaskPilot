'use client';

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Check,
  X,
  Search,
  HardHat,
  MapPin,
  Clock,
  Sparkles,
  Info,
  Layers,
  Hammer
} from 'lucide-react';
import {
  VoiceResponse,
  ConfirmResult,
  SnagConfirmationPayload,
  TaskConfirmationPayload
} from '@/types';

interface ConfirmationCardProps {
  voiceResponse: VoiceResponse | null;
  confirmResult: ConfirmResult | null;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming: boolean;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  voiceResponse,
  confirmResult,
  onConfirm,
  onCancel,
  isConfirming
}) => {
  if (confirmResult) {
    if (confirmResult.type === 'created') {
      return (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-emerald-200 text-sm flex items-start gap-3 shadow-lg shadow-emerald-500/5 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-emerald-300">Action Confirmed & Executed</p>
            <p className="text-xs text-emerald-200/90">{confirmResult.message}</p>
          </div>
        </div>
      );
    } else if (confirmResult.type === 'cancelled') {
      return (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-amber-200 text-sm flex items-start gap-3 shadow-lg shadow-amber-500/5 animate-in fade-in duration-200">
          <XCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-300">Action Cancelled</p>
            <p className="text-xs text-amber-200/90">
              {confirmResult.message} You can edit the transcript above and resend.
            </p>
          </div>
        </div>
      );
    }
  }

  if (!voiceResponse) return null;

  if (voiceResponse.type === 'clarify') {
    return (
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-amber-200 text-sm flex items-start gap-3 animate-in fade-in duration-200">
        <HelpCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-amber-300">Clarification Needed</p>
          <p className="text-xs text-amber-200/90">{voiceResponse.message}</p>
        </div>
      </div>
    );
  }

  if (voiceResponse.type === 'unknown' || voiceResponse.type === 'error') {
    return (
      <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-rose-200 text-sm flex items-start gap-3 animate-in fade-in duration-200">
        <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-rose-300">Could Not Process Intent</p>
          <p className="text-xs text-rose-200/90">{voiceResponse.message}</p>
        </div>
      </div>
    );
  }

  if (voiceResponse.type === 'search_results') {
    const isTask = voiceResponse.record_type === 'task' || Boolean(voiceResponse.tasks);
    return (
      <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-4 text-blue-200 text-sm flex items-start gap-3 animate-in fade-in duration-200">
        <Search className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-blue-300">
            Found {voiceResponse.count} matching {isTask ? 'task(s)' : 'snag(s)'}
          </p>
          <p className="text-xs text-blue-200/80">
            {voiceResponse.filters.location && `Location: ${voiceResponse.filters.location} `}
            {voiceResponse.filters.contractor && `• Contractor: ${voiceResponse.filters.contractor} `}
            {voiceResponse.filters.status && `• Status: ${voiceResponse.filters.status}`}
          </p>
        </div>
      </div>
    );
  }

  if (voiceResponse.type === 'confirm') {
    const isSnag = voiceResponse.intent === 'create_snag';
    const snagData = voiceResponse.data as SnagConfirmationPayload;
    const taskData = voiceResponse.data as TaskConfirmationPayload;

    return (
      <div
        className={`rounded-2xl border p-5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 ${
          isSnag
            ? 'bg-amber-950/20 border-amber-500/40 shadow-amber-500/5'
            : 'bg-purple-950/20 border-purple-500/40 shadow-purple-500/5'
        }`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isSnag ? '🚨' : '🔨'}</span>
            <div>
              <h3
                className={`text-sm font-bold tracking-wide uppercase ${
                  isSnag ? 'text-amber-400' : 'text-purple-400'
                }`}
              >
                {isSnag ? 'Confirm Snag Creation' : 'Confirm Task Assignment'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Layer 2 Safety Net: Review resolved entities before committing to database
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
              isSnag
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
            }`}
          >
            {isSnag ? 'Snag Draft' : 'Task Draft'}
          </span>
        </div>

        {/* Message banner */}
        <p className="text-xs text-slate-300 mb-4 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
          💬 <span className="italic">{voiceResponse.message}</span>
        </p>

        {/* Entity Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {/* Title */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 sm:col-span-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              {isSnag ? 'Snag Title' : 'Task Title'}
            </span>
            <span className="text-sm font-medium text-slate-100">
              {isSnag ? snagData.title : taskData.title}
            </span>
          </div>

          {/* Priority */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Priority
            </span>
            <span
              className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${
                (isSnag ? snagData.priority : taskData.priority)?.toLowerCase() === 'high' ||
                (isSnag ? snagData.priority : taskData.priority)?.toLowerCase() === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {isSnag ? snagData.priority || 'Medium' : taskData.priority || 'Medium'}
            </span>
          </div>

          {/* Location */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-400" />
              Resolved Location
            </span>
            <span className="text-xs font-medium text-emerald-300">
              {isSnag
                ? snagData.location_name || snagData.raw_location || 'Unassigned'
                : taskData.location_name || taskData.raw_location || 'Unassigned'}
            </span>
          </div>

          {/* Contractor */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <HardHat className="h-3 w-3 text-amber-400" />
              {isSnag ? 'Assigned Contractor' : 'Assign To'}
            </span>
            <span className="text-xs font-medium text-amber-300">
              {isSnag
                ? snagData.contractor_name
                  ? `${snagData.contractor_name} (${snagData.contractor_trade})`
                  : snagData.raw_contractor || 'Unassigned'
                : taskData.contractor_name
                ? `${taskData.contractor_name} (${taskData.contractor_trade})`
                : taskData.raw_contractor || 'Unassigned'}
            </span>
          </div>

          {/* Due date if task */}
          {!isSnag && (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-purple-400" />
                Target Due Date
              </span>
              <span className="text-xs font-medium text-purple-300">
                {taskData.due_date || 'No deadline specified'}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            <span>Cancel (Edit Phrasing)</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-lg transition-all disabled:opacity-50 ${
              isSnag
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
            }`}
          >
            <Check className="h-4 w-4" />
            <span>{isSnag ? '✓ Confirm & Log Snag' : '✓ Confirm & Assign Task'}</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
