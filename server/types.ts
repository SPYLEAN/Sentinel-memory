export type Severity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
import type { RiskAssessment } from './engine/risk';
import type { SimulationResult } from './engine/simulator';
import type { EnvironmentState } from './world/types';
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
export type StrategyStatus = 'GENERIC' | 'MEMORY-INFORMED' | 'SIMULATION-VALIDATED' | 'CONSTRAINT-BLOCKED';
export interface StrategySimulationInfluence {
  improvement: number;
  constraintPenalty: number;
  warnings: string[];
  constraintViolations: string[];
}
export interface Strategy {
  id: string;
  simulationStrategyId: string;
  title: string;
  description: string;
  projectedRisk: number;
  confidence: number;
  learnedFromMemory: boolean;
  memoryInfluence: StrategyMemoryInfluence;
  simulationInfluence: StrategySimulationInfluence;
  historicalFailurePenalty: number;
  finalScore: number;
  status: StrategyStatus[];
}
export interface IncidentAnalysis {
  id: string;
  description: string;
  type: string;
  location: string;
  severity: Severity;
  confidence: number;
  baselineRisk: number;
  context: IncidentContext;
  environment: EnvironmentState;
  riskAssessment: RiskAssessment;
  simulations: SimulationResult[];
  interventions: InterventionOutcome[];
  memories: MemoryHit[];
  recommendationReason: string;
  recommendation: Strategy;
  strategies: Strategy[];
  createdAt: string;
}
