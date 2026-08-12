import type { DashboardState, IncidentAnalysis } from '../types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  state: () => request<DashboardState>('/api/state'),
  seed: () => request<{ ok: boolean; retained: number }>('/api/memory/seed', { method: 'POST' }),
  analyze: (description: string) =>
    request<IncidentAnalysis>('/api/incidents/analyze', {
      method: 'POST',
      body: JSON.stringify({ description })
    }),
  resolve: (incidentId: string, strategyId: string) =>
    request<{ incident: IncidentAnalysis; outcomeRisk: number; memoryCreated: boolean }>(
      `/api/incidents/${incidentId}/resolve`,
      { method: 'POST', body: JSON.stringify({ strategyId }) }
    ),
  ask: (query: string) =>
    request<{ answer: string; memories: { text: string; type?: string }[] }>('/api/ask', {
      method: 'POST', body: JSON.stringify({ query })
    })
};
