'use client';

import React from 'react';
import { AlertCircle, KeyRound, ExternalLink } from 'lucide-react';

interface HealthBannerProps {
  groqConfigured: boolean | null;
}

export const HealthBanner: React.FC<HealthBannerProps> = ({ groqConfigured }) => {
  if (groqConfigured === true || groqConfigured === null) {
    return null;
  }

  return (
    <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm shadow-lg shadow-amber-500/5">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-300">
            GROQ_API_KEY is not configured in backend
          </p>
          <p className="text-xs text-amber-200/80 leading-relaxed">
            Voice command interpretation and audio transcription require an active Groq API key.
            Please add <code className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/20 font-mono text-[11px]">GROQ_API_KEY=gsk_...</code> to your <code className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/20 font-mono text-[11px]">backend/.env</code> file.
            See <span className="font-mono text-amber-300">backend/.env.example</span> for reference.
          </p>
        </div>
      </div>
    </div>
  );
};
