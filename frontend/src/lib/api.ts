import {
  HealthResponse,
  Project,
  Snag,
  Task,
  VoiceResponse,
  ConfirmResult
} from '@/types';

export const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }
  if (typeof window !== 'undefined') {
    if (window.location.port === '8000') {
      return window.location.origin;
    }
  }
  return 'http://localhost:8000';
};

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${getApiBase()}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchProject(): Promise<Project> {
  const res = await fetch(`${getApiBase()}/project`);
  if (!res.ok) {
    throw new Error(`Failed to fetch project info: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSnags(): Promise<Snag[]> {
  const res = await fetch(`${getApiBase()}/snags`);
  if (!res.ok) {
    throw new Error(`Failed to fetch snags: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${getApiBase()}/tasks`);
  if (!res.ok) {
    throw new Error(`Failed to fetch tasks: ${res.statusText}`);
  }
  return res.json();
}

export async function sendVoiceCommand(transcript: string): Promise<VoiceResponse> {
  const res = await fetch(`${getApiBase()}/voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function sendConfirmation(
  action: 'confirm' | 'cancel',
  payload: any
): Promise<ConfirmResult> {
  const res = await fetch(`${getApiBase()}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Confirmation failed: ${res.status}`);
  }
  return res.json();
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');

  const res = await fetch(`${getApiBase()}/transcribe`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Transcription failed: ${res.status}`);
  }

  const data = await res.json();
  return data.transcript;
}

export async function updateSnagStatus(snagId: number, status: string): Promise<Snag> {
  const res = await fetch(`${getApiBase()}/snags/${snagId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    throw new Error(`Failed to update snag status: ${res.statusText}`);
  }
  return res.json();
}

export async function updateTaskStatus(taskId: number, status: string): Promise<Task> {
  const res = await fetch(`${getApiBase()}/tasks/${taskId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    throw new Error(`Failed to update task status: ${res.statusText}`);
  }
  return res.json();
}
