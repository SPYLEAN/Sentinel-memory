export type Severity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export interface MemoryEvidence { id?: string; context?: string; documentId?: string; tags?: string[]; sourceFactIds?: string[]; }
export interface MemoryHit { text: string; type?: string; score?: number; evidence?: MemoryEvidence; }
export interface IncidentContext {
  crowdConditions: string;
  occupancyDensity: string;
  eventPhase: string;
  gateConditions: string;
  congestionType: string;
  environmentalConstraints: string;
}
export interface InterventionOutcome {
  strategyId: string;
  strategyTitle: string;
  routes: string[];
  operatorChanges: string;
  riskBefore: number;
  riskAfter: number;
  successLevel: 'strong' | 'partial' | 'weak';
}
export interface StrategyMemoryInfluence {
  baselineSuitability: number;
  historicalSupport: number;
  previousSuccesses: number;
  previousFailures: number;
  evidenceIds: string[];
}
export interface Strategy { id: string; title: string; description: string; projectedRisk: number; confidence: number; learnedFromMemory: boolean; memoryInfluence: StrategyMemoryInfluence; }
export interface IncidentAnalysis { id: string; description: string; type: string; location: string; severity: Severity; confidence: number; baselineRisk: number; context: IncidentContext; interventions: InterventionOutcome[]; memories: MemoryHit[]; recommendationReason: string; strategies: Strategy[]; createdAt: string; }
