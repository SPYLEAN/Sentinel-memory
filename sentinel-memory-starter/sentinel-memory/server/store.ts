import type { IncidentAnalysis } from './types';
export const incidents = new Map<string, IncidentAnalysis>();
export const counters = { incidentsRemembered: 0, responsesObserved: 0, patternsLearned: 0 };
