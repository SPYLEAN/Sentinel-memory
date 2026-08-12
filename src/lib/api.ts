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
    request<{ incident: IncidentAnalysis; outcomeRisk: number; memoryCreated: boolean; memoryRecord?: string }>(
      `/api/incidents/${incidentId}/resolve`,
      { method: 'POST', body: JSON.stringify({ strategyId }) }
    ),
  ask: (query: string) =>
    request<{ answer: string; confidence: number; currentStateEvidence: unknown; memoryEvidence: unknown; simulationEvidence: unknown[]; recommendation: IncidentAnalysis['recommendation'] }>('/api/ask', {
      method: 'POST', body: JSON.stringify({ query })
    }),
  judgeReset: () => request<{ sessionId: string; scenario: string }>('/api/judge/reset', { method: 'POST', body: '{}' }),
  judgeIncidentOne: (sessionId: string) => request<{ sessionId: string; scenario: string; incident: IncidentAnalysis; memoryRetainedEvent: { status: string }; retainedMemory?: string }>('/api/judge/incident-one', {
    method: 'POST', body: JSON.stringify({ sessionId })
  }),
  judgeIncidentTwo: (sessionId: string, gateCUnavailable = false) => request<{ sessionId: string; scenario: string; incident: IncidentAnalysis; memoryFound: number; recommendation: IncidentAnalysis['recommendation'] }>('/api/judge/incident-two', {
    method: 'POST', body: JSON.stringify({ sessionId, gateCUnavailable })
  })
};
