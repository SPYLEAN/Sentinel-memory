import type { MemoryHit, Strategy } from '../types';
import type { SimulationResult, SimulationStrategyId } from './simulator';

const simulationIds: Record<string, SimulationStrategyId> = {
  'distributed-routing': 'DISTRIBUTED_EXIT_ROUTING',
  'single-diversion': 'SINGLE_GATE_DIVERSION',
  'temporary-hold': 'TEMPORARY_INFLOW_HOLD',
  'auxiliary-route': 'AUXILIARY_ROUTE'
};

export function buildStrategies(baselineRisk: number, memories: MemoryHit[], simulations: SimulationResult[] = []): { strategies: Strategy[]; reason: string } {
  const evidence = memories.map((memory) => ({ memory, text: memory.text.toLowerCase() }));
  const distributedEvidence = evidence.filter(({ text }) => /(distributed|multi[- ]?gate|multi[- ]?exit|gate b.{0,20}gate c|multiple exits)/.test(text));
  const singleEvidence = evidence.filter(({ text }) => /(single[- ]?gate|single[- ]?exit|gate b[- ]?only|gate b only|single diversion)/.test(text));
  const riskAfter = (text: string) => {
    const match = text.match(/(?:to|ending at risk)\s+(\d{1,3})(?:\/100)?/);
    return match ? Number(match[1]) : undefined;
  };
  const explicitFailure = (text: string) => /(partial|insufficient|weak|failed|failure|only partially)/.test(text);
  const distributedSuccesses = distributedEvidence.filter(({ text }) => {
    const outcome = riskAfter(text);
    return outcome !== undefined ? outcome <= 35 : /(strong|successful|success|worked|outperformed|more effective|reduced (?:crowd )?risk)/.test(text);
  }).length;
  const distributedFailures = distributedEvidence.filter(({ text }) => {
    const outcome = riskAfter(text);
    return explicitFailure(text) || (outcome !== undefined && outcome > 35);
  }).length;
  const singleFailures = singleEvidence.filter(({ text }) => {
    const outcome = riskAfter(text);
    return explicitFailure(text) || (outcome !== undefined && outcome > 35) || /(more effective than single|outperformed single)/.test(text);
  }).length;
  const singleSuccesses = singleEvidence.filter(({ text }) => {
    const outcome = riskAfter(text);
    if (singleFailures > 0 && /(more effective than single|outperformed single)/.test(text)) return false;
    return outcome !== undefined ? outcome <= 35 : /(single.{0,40}(?:strong|successful|worked)|(?:strong|successful|worked).{0,40}single)/.test(text);
  }).length;
  const auxiliaryEvidence = evidence.filter(({ text }) => /(auxiliary route|alternate corridor|west corridor)/.test(text));
  const auxiliarySuccesses = auxiliaryEvidence.filter(({ text }) => /(strong|successful|worked|effective|reduced)/.test(text) && !explicitFailure(text)).length;
  const auxiliaryFailures = auxiliaryEvidence.filter(({ text }) => explicitFailure(text) || /blocked/.test(text)).length;
  const evidenceIds = (items: typeof evidence) => items.map(({ memory }) => memory.evidence?.id).filter((id): id is string => Boolean(id));
  const clamp = (value: number) => Math.max(0, Math.min(1, value));

  const baseStrategies = [
    {
      id:'distributed-routing', title:'Distributed rerouting',
      description:'Split outbound flow across two available exits and meter the overloaded zone.',
      projectedRisk: Math.max(18, baselineRisk - 46 - distributedSuccesses * 8 + distributedFailures * 5),
      confidence: clamp(.82 + distributedSuccesses * .07 - distributedFailures * .08),
      learnedFromMemory: distributedSuccesses > 0,
      memoryInfluence: { baselineSuitability: .82, historicalSupport: distributedSuccesses - distributedFailures, previousSuccesses: distributedSuccesses, previousFailures: distributedFailures, evidenceIds: evidenceIds(distributedEvidence) }
    },
    {
      id:'single-diversion', title:'Single-exit diversion',
      description:'Redirect primary flow to one alternate gate while holding the incident gate.',
      projectedRisk: Math.max(32, baselineRisk - 31 - singleSuccesses * 5 + singleFailures * 8),
      confidence: clamp(.74 + singleSuccesses * .05 - singleFailures * .1),
      learnedFromMemory: singleSuccesses > 0 && singleSuccesses > singleFailures,
      memoryInfluence: { baselineSuitability: .74, historicalSupport: singleSuccesses - singleFailures, previousSuccesses: singleSuccesses, previousFailures: singleFailures, evidenceIds: evidenceIds(singleEvidence) }
    },
    {
      id:'temporary-hold', title:'Temporary inflow hold',
      description:'Pause incoming flow, maintain outbound movement, then reopen progressively.',
      projectedRisk: Math.max(28, baselineRisk - 37), confidence: .76, learnedFromMemory:false,
      memoryInfluence: { baselineSuitability: .76, historicalSupport: 0, previousSuccesses: 0, previousFailures: 0, evidenceIds: [] }
    },
    {
      id:'auxiliary-route', title:'Auxiliary corridor route',
      description:'Move a share of outbound demand through West Corridor to an alternate exit.',
      projectedRisk: Math.max(30, baselineRisk - 34 - auxiliarySuccesses * 5 + auxiliaryFailures * 7),
      confidence: clamp(.70 + auxiliarySuccesses * .06 - auxiliaryFailures * .1),
      learnedFromMemory: auxiliarySuccesses > auxiliaryFailures,
      memoryInfluence: { baselineSuitability: .70, historicalSupport: auxiliarySuccesses - auxiliaryFailures, previousSuccesses: auxiliarySuccesses, previousFailures: auxiliaryFailures, evidenceIds: evidenceIds(auxiliaryEvidence) }
    }
  ];

  const strategies: Strategy[] = baseStrategies.map((strategy) => {
    const simulationStrategyId = simulationIds[strategy.id];
    const simulation = simulations.find((item) => item.strategyId === simulationStrategyId);
    const improvement = simulation?.riskDelta ?? Math.max(0, baselineRisk - strategy.projectedRisk);
    const constraintPenalty = simulation?.constraintViolations.length ? 100 : 0;
    const historicalFailurePenalty = strategy.memoryInfluence.previousFailures * 8;
    const finalScore = Math.round(
      strategy.memoryInfluence.baselineSuitability * 50
      + strategy.memoryInfluence.historicalSupport * 8
      + improvement
      - historicalFailurePenalty
      - constraintPenalty
    );
    const status: Strategy['status'] = constraintPenalty
      ? ['CONSTRAINT-BLOCKED']
      : [
          ...(strategy.learnedFromMemory ? ['MEMORY-INFORMED' as const] : []),
          ...(simulation && improvement > 0 ? ['SIMULATION-VALIDATED' as const] : []),
          ...(!strategy.learnedFromMemory && !simulation ? ['GENERIC' as const] : [])
        ];
    return {
      ...strategy,
      simulationStrategyId,
      projectedRisk: simulation?.projectedRisk ?? strategy.projectedRisk,
      confidence: constraintPenalty ? .05 : clamp(strategy.confidence + improvement / 250),
      simulationInfluence: {
        improvement,
        constraintPenalty,
        warnings: simulation?.warnings ?? [],
        constraintViolations: simulation?.constraintViolations ?? []
      },
      historicalFailurePenalty,
      finalScore,
      status
    };
  }).sort((a,b)=>b.finalScore-a.finalScore || a.projectedRisk-b.projectedRisk);

  console.info(`[memory trace] STRATEGY MEMORY INFLUENCE distributed(success=${distributedSuccesses}, failure=${distributedFailures}) single(success=${singleSuccesses}, failure=${singleFailures})`);
  console.info(`[judge trace] CONSTRAINT CHECK blocked=${strategies.filter((strategy) => strategy.status.includes('CONSTRAINT-BLOCKED')).length}`);
  const reason = memories.length
    ? `SENTINEL recalled ${memories.length} related operational memories. ${distributedSuccesses > 0 ? `Prior outcomes include ${distributedSuccesses} successful distributed-routing signal${distributedSuccesses === 1 ? '' : 's'}.` : 'No successful distributed-routing outcome was found.'} ${singleFailures > 0 ? `Single-gate routing has ${singleFailures} partial or failed outcome signal${singleFailures === 1 ? '' : 's'} and is penalized.` : ''}`.trim()
    : 'No strong prior memory matched this incident, so SENTINEL is using first-principles crowd-risk heuristics and simulation.';
  return { strategies, reason };
}
