export type Severity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface MemoryHit {
  text: string;
  type?: string;
  score?: number;
  evidence?: {
    id?: string;
    context?: string;
    documentId?: string;
    tags?: string[];
    sourceFactIds?: string[];
  };
}

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

export interface Strategy {
  id: string;
  simulationStrategyId: string;
  title: string;
  description: string;
  projectedRisk: number;
  confidence: number;
  learnedFromMemory: boolean;
  memoryInfluence: {
    baselineSuitability: number;
    historicalSupport: number;
    previousSuccesses: number;
    previousFailures: number;
    evidenceIds: string[];
  };
  simulationInfluence: {
    improvement: number;
    constraintPenalty: number;
    warnings: string[];
    constraintViolations: string[];
  };
  historicalFailurePenalty: number;
  finalScore: number;
  status: Array<'GENERIC' | 'MEMORY-INFORMED' | 'SIMULATION-VALIDATED' | 'CONSTRAINT-BLOCKED'>;
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
  environment: unknown;
  riskAssessment: { riskScore: number; riskLevel: Severity; breakdown: Array<{ id: string; label: string; contribution: number; explanation: string }> };
  simulations: unknown[];
  interventions: InterventionOutcome[];
  memories: MemoryHit[];
  recommendationReason: string;
  recommendation: Strategy;
  strategies: Strategy[];
  createdAt: string;
}

export interface DashboardState {
  memoryMode: 'hindsight' | 'fallback';
  memoryConnected: boolean;
  bankId: string;
  incidentsRemembered: number;
  responsesObserved: number;
  patternsLearned: number;
}
