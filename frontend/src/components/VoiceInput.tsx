'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Trash2,
  Sparkles,
  HardHat,
  MapPin,
  Building,
  Radio,
  Loader2
} from 'lucide-react';
import { Project } from '@/types';
import { transcribeAudio } from '@/lib/api';
import { isSpeechSynthesisSupported } from '@/lib/tts';

interface VoiceInputProps {
  project: Project | null;
  transcript: string;
  setTranscript: (val: string) => void;
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
}

const PROMPT_CHIPS = [
  {
    category: '1. Create Snags / Log Defects',
    color: 'border-amber-500/30 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10',
    items: [
      {
        icon: '🚨',
        label: 'Create snag for master bathroom ceiling',
        prompt: 'Create a snag for the master bathroom ceiling, assign it to false ceiling'
      },
      {
        icon: '🚨',
        label: 'High priority plumbing leak under sink',
        prompt: 'Log urgent snag: severe water leaking under kitchen sink, assign to plumber with high priority'
      },
      {
        icon: '🚨',
        label: 'Wall paint crack in bedroom',
        prompt: 'Add snag: wall paint cracked and uneven behind wardrobe in master bedroom, assign to painter'
      }
    ]
  },
  {
    category: '2. Assign Work Tasks / Work Orders',
    color: 'border-purple-500/30 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10',
    items: [
      {
        icon: '🔨',
        label: 'Install shower mixer by Friday',
        prompt: 'Assign task to plumber: install bathroom shower mixer in master bathroom by Friday'
      },
      {
        icon: '🔨',
        label: 'Mount living room switchboards tomorrow',
        prompt: 'Create task for electrician: mount electrical switchboards in living room by tomorrow'
      },
      {
        icon: '🔨',
        label: 'Complete wooden wardrobe framing',
        prompt: 'Assign carpentry task: complete wooden wardrobe framing in master bedroom by next week'
      }
    ]
  },
  {
    category: '3. Search & Filter Records',
    color: 'border-blue-500/30 bg-blue-500/5 text-blue-300 hover:bg-blue-500/10',
    items: [
      {
        icon: '🔍',
        label: 'Show open snags in master bedroom',
        prompt: 'Show me all open snags in the master bedroom'
      },
      {
        icon: '🔍',
        label: 'Show tasks assigned to electrician',
        prompt: 'Show me tasks assigned to the electrician'
      },
      {
        icon: '🔍',
        label: 'List all kitchen plumbing issues',
        prompt: 'Find all snags in the kitchen assigned to plumbing'
      }
    ]
  }
];

export const VoiceInput: React.FC<VoiceInputProps> = ({
  project,
  transcript,
  setTranscript,
  onSubmit,
  isProcessing,
  isMuted,
  setIsMuted
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  const [ttsSupported, setTtsSupported] = useState(true);

  useEffect(() => {
    setTtsSupported(isSpeechSynthesisSupported());

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

        const mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
          if (audioBlob.size > 0) {
            try {
              setTranscribing(true);
              const text = await transcribeAudio(audioBlob);
              if (text) {
                setTranscript(text);
              }
            } catch (err: any) {
              console.error('Whisper transcription failed, falling back if available:', err);
            } finally {
              setTranscribing(false);
            }
          }
        };

        mediaRecorder.start(100);
        setIsRecording(true);
        setRecordDuration(0);
        timerRef.current = setInterval(() => {
          setRecordDuration((prev) => prev + 1);
        }, 1000);
      } else {
        fallbackWebSpeech();
      }
    } catch (err) {
      console.warn('MediaRecorder permission or device error, trying Web Speech API:', err);
      fallbackWebSpeech();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const fallbackWebSpeech = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Microphone access or Web Speech API is not supported in this browser.');
      return;
    }

    const recog = new SpeechRecognition();
    recognitionRef.current = recog;
    recog.continuous = false;
    recog.interimResults = true;
    recog.lang = 'en-US';

    recog.onresult = (e: any) => {
      let finalTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(finalTranscript);
      }
    };

    recog.onerror = (e: any) => {
      console.warn('Web Speech error:', e);
      setIsRecording(false);
    };

    recog.onend = () => {
      setIsRecording(false);
    };

    recog.start();
    setIsRecording(true);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleBadgeClick = (text: string) => {
    setTranscript(transcript.trim().length > 0 ? `${transcript} ${text}` : text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (transcript.trim() && !isProcessing) {
        onSubmit(transcript.trim());
      }
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 shadow-xl backdrop-blur-sm space-y-5">
      {/* Title & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Mic className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
            Voice Command Input & Transcript Review
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-800 border border-slate-700/50">
          Layer 1 Error Safety Net
        </span>
      </div>

      {/* Voice Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={transcribing || isProcessing}
            className={`relative flex items-center justify-center h-14 w-14 rounded-full transition-all duration-300 shadow-lg ${
              isRecording
                ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
            } disabled:opacity-50`}
            title={isRecording ? 'Click to stop recording' : 'Click to start voice recording'}
          >
            {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            disabled={!ttsSupported}
            className={`flex items-center justify-center h-10 w-10 rounded-xl border transition-colors ${
              isMuted
                ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                : 'bg-slate-800 border-indigo-500/30 text-indigo-300 hover:text-indigo-200'
            } disabled:opacity-40`}
            title={isMuted ? 'Voice feedback is muted. Click to enable.' : 'Voice feedback is active. Click to mute.'}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>

        <div className="text-center sm:text-left flex-1 space-y-0.5">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-sm font-medium text-slate-200">
            {isRecording ? (
              <span className="flex items-center gap-2 text-rose-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                Listening... ({recordDuration}s) — Click 🎙 when finished
              </span>
            ) : transcribing ? (
              <span className="flex items-center gap-2 text-amber-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Transcribing audio with Groq Whisper...
              </span>
            ) : (
              <span>Click 🎙 to speak your command, or pick a template below</span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Speech is transcribed, displayed for your review/edit, then parsed by Groq NLU with rapidfuzz resolution.
          </p>
        </div>
      </div>

      {/* Editable Transcript Textarea */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
          <span>Editable Command Transcript:</span>
          <span className="text-[11px] text-slate-400">Press Enter ↵ to process, Shift+Enter for new line</span>
        </label>
        <div className="relative">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "Create a snag for the master bathroom ceiling, assign it to false ceiling"'
            rows={3}
            className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-y"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setTranscript('')}
            disabled={!transcript || isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700/50 transition-colors disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={() => onSubmit(transcript.trim())}
            disabled={!transcript.trim() || isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-40"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Processing NLU & Resolving...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Process Command ↵</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Project Directory (Clickable Badges) */}
      <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Building className="h-3.5 w-3.5 text-indigo-400" />
          <span>Active Project Directory (Click any badge to append to transcript):</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Contractors */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <HardHat className="h-3 w-3 text-amber-400" />
              Available Contractors & Trades:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {project?.contractors && project.contractors.length > 0 ? (
                project.contractors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleBadgeClick(c.trade)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-xs font-medium transition-colors"
                    title={`Click to append "${c.trade}" (${c.name})`}
                  >
                    <span>👷</span>
                    <span>{c.trade}</span>
                    <span className="text-[10px] text-amber-400/60 font-normal">({c.name})</span>
                  </button>
                ))
              ) : (
                <span className="text-xs text-slate-500">Loading contractors...</span>
              )}
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-400" />
              Known Site Locations / Rooms:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {project?.locations && project.locations.length > 0 ? (
                project.locations.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleBadgeClick(l.name)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs font-medium transition-colors"
                    title={`Click to append "${l.name}"`}
                  >
                    <span>📍</span>
                    <span>{l.name}</span>
                  </button>
                ))
              ) : (
                <span className="text-xs text-slate-500">Loading locations...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Test Prompt Chips */}
      <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Quick Test Prompt Chips (Click to test intent):</span>
        </div>

        <div className="space-y-2.5">
          {PROMPT_CHIPS.map((cat, idx) => (
            <div key={idx} className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-400">{cat.category}</span>
              <div className="flex flex-wrap gap-1.5">
                {cat.items.map((item, cIdx) => (
                  <button
                    key={cIdx}
                    type="button"
                    onClick={() => setTranscript(item.prompt)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${cat.color}`}
                    title={item.prompt}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
