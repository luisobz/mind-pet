import type {
  AutomationRule,
  AutomationRuleDraft,
  CameraInfo,
  CameraStatus,
  DogActivitySnapshot,
  DomainEvent,
  LiveStreamHandle,
} from '@mind-pet/core';

export interface StateResponse {
  snapshot: DogActivitySnapshot;
  camera: { info: CameraInfo; status: CameraStatus };
}

export interface CameraResponse {
  info: CameraInfo;
  status: CameraStatus;
  stream: LiveStreamHandle | null;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Error ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  getState: () => request<StateResponse>('/api/state'),
  getCamera: () => request<CameraResponse>('/api/camera'),
  getEvents: (limit = 50) =>
    request<{ events: DomainEvent[] }>(`/api/events?limit=${limit}`),
  getRules: () => request<{ rules: AutomationRule[] }>('/api/rules'),
  createRule: (draft: AutomationRuleDraft) =>
    request<{ rule: AutomationRule }>('/api/rules', {
      method: 'POST',
      body: JSON.stringify(draft),
    }),
  updateRule: (id: string, patch: Partial<AutomationRuleDraft>) =>
    request<{ rule: AutomationRule }>(`/api/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
  deleteRule: (id: string) => request<void>(`/api/rules/${id}`, { method: 'DELETE' }),
  dispenseTreat: (portions = 1) =>
    request<{ dispensed: number }>('/api/camera/treat', {
      method: 'POST',
      body: JSON.stringify({ portions }),
    }),
};
