export type Severity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export interface MemoryHit { text: string; type?: string; score?: number; }
export interface Strategy { id: string; title: string; description: string; projectedRisk: number; confidence: number; learnedFromMemory: boolean; }
export interface IncidentAnalysis { id: string; description: string; type: string; location: string; severity: Severity; confidence: number; baselineRisk: number; memories: MemoryHit[]; recommendationReason: string; strategies: Strategy[]; createdAt: string; }
