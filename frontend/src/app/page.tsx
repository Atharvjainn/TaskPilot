'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { HealthBanner } from '@/components/HealthBanner';
import { VoiceInput } from '@/components/VoiceInput';
import { ConfirmationCard } from '@/components/ConfirmationCard';
import { Dashboard } from '@/components/Dashboard';
import {
  Project,
  Snag,
  Task,
  VoiceResponse,
  ConfirmResult,
  SearchResultsResponse
} from '@/types';
import {
  fetchHealth,
  fetchProject,
  fetchSnags,
  fetchTasks,
  sendVoiceCommand,
  sendConfirmation,
  updateSnagStatus,
  updateTaskStatus
} from '@/lib/api';
import { speakText } from '@/lib/tts';

export default function Home() {
  const [project, setProject] = useState<Project | null>(null);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transcript, setTranscript] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'snags' | 'tasks'>('snags');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isBackendOffline, setIsBackendOffline] = useState<boolean>(false);
  const [groqConfigured, setGroqConfigured] = useState<boolean | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [voiceResponse, setVoiceResponse] = useState<VoiceResponse | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [pendingConfirmationPayload, setPendingConfirmationPayload] = useState<any>(null);

  const loadHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setGroqConfigured(data.groq_configured);
    } catch {
      // Backend might be offline
    }
  }, []);

  const loadProject = useCallback(async () => {
    try {
      const data = await fetchProject();
      setProject(data);
      setIsBackendOffline(false);
    } catch {
      setIsBackendOffline(true);
    }
  }, []);

  const loadSnags = useCallback(async () => {
    try {
      const data = await fetchSnags();
      setSnags(data);
    } catch {
      // Handled
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch {
      // Handled
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      loadHealth(),
      loadProject(),
      loadSnags(),
      loadTasks()
    ]);
    setLoading(false);
  }, [loadHealth, loadProject, loadSnags, loadTasks]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleVoiceSubmit = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);
    setConfirmResult(null);
    setVoiceResponse(null);

    try {
      const res = await sendVoiceCommand(text);
      setVoiceResponse(res);

      if (res.type === 'confirm') {
        setPendingConfirmationPayload(res.data);
        speakText(res.message, isMuted);
      } else if (res.type === 'search_results') {
        const searchRes = res as SearchResultsResponse;
        if (searchRes.record_type === 'task' || searchRes.tasks) {
          const msg = `Found ${searchRes.count} matching task(s).`;
          speakText(msg, isMuted);
          if (searchRes.tasks) {
            setTasks(searchRes.tasks);
          }
          setActiveTab('tasks');
        } else {
          const msg = `Found ${searchRes.count} matching snag(s).`;
          speakText(msg, isMuted);
          if (searchRes.snags) {
            setSnags(searchRes.snags);
          }
          setActiveTab('snags');
        }
      } else if (res.type === 'clarify') {
        speakText(res.message, isMuted);
      } else {
        speakText(res.message || 'Unknown response from server.', isMuted);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Error processing command through NLU.';
      setVoiceResponse({
        type: 'error',
        message: errorMsg
      });
      speakText(errorMsg, isMuted);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingConfirmationPayload || isConfirming) return;

    setIsConfirming(true);
    try {
      const result = await sendConfirmation('confirm', pendingConfirmationPayload);
      setConfirmResult(result);
      speakText(result.message, isMuted);
      setPendingConfirmationPayload(null);
      setVoiceResponse(null);

      await Promise.all([loadSnags(), loadTasks()]);

      if (result.intent === 'assign_task') {
        setActiveTab('tasks');
      }
    } catch (err: any) {
      setVoiceResponse({
        type: 'error',
        message: `Confirmation failed: ${err.message}`
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (isConfirming) return;

    setIsConfirming(true);
    try {
      const result = await sendConfirmation('cancel', pendingConfirmationPayload || {});
      setConfirmResult(result);
      speakText(result.message || 'Action was cancelled.', isMuted);
      setPendingConfirmationPayload(null);
      setVoiceResponse(null);
    } catch (err: any) {
      setVoiceResponse({
        type: 'error',
        message: `Cancellation error: ${err.message}`
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleUpdateSnagStatus = async (id: number, status: string) => {
    try {
      await updateSnagStatus(id, status);
      await loadSnags();
    } catch (err) {
      console.error('Failed to update snag status:', err);
    }
  };

  const handleUpdateTaskStatus = async (id: number, status: string) => {
    try {
      await updateTaskStatus(id, status);
      await loadTasks();
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <Header
          project={project}
          loading={loading}
          onRefresh={loadAll}
          isBackendOffline={isBackendOffline}
        />

        {/* Missing API Key Warning */}
        <HealthBanner groqConfigured={groqConfigured} />

        {/* Voice Control & Layer 1 Error Correction */}
        <VoiceInput
          project={project}
          transcript={transcript}
          setTranscript={setTranscript}
          onSubmit={handleVoiceSubmit}
          isProcessing={isProcessing}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
        />

        {/* Confirmation Card & Layer 2 Error Safety Net */}
        <ConfirmationCard
          voiceResponse={voiceResponse}
          confirmResult={confirmResult}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isConfirming={isConfirming}
        />

        {/* Tabbed Dashboard */}
        <Dashboard
          snags={snags}
          tasks={tasks}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onUpdateSnagStatus={handleUpdateSnagStatus}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          loading={loading}
        />
      </div>
    </main>
  );
}
