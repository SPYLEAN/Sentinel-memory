import type { MemoryHit, Strategy } from '../types';

export function buildStrategies(baselineRisk: number, memories: MemoryHit[]): { strategies: Strategy[]; reason: string } {
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
  const evidenceIds = (items: typeof evidence) => items.map(({ memory }) => memory.evidence?.id).filter((id): id is string => Boolean(id));
  const clamp = (value: number) => Math.max(0, Math.min(1, value));

  const strategies: Strategy[] = [
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
    }
  ].sort((a,b)=>a.projectedRisk-b.projectedRisk);

  console.info(`[memory trace] STRATEGY MEMORY INFLUENCE distributed(success=${distributedSuccesses}, failure=${distributedFailures}) single(success=${singleSuccesses}, failure=${singleFailures})`);
  const reason = memories.length
    ? `SENTINEL recalled ${memories.length} related operational memories. ${distributedSuccesses > 0 ? `Prior outcomes include ${distributedSuccesses} successful distributed-routing signal${distributedSuccesses === 1 ? '' : 's'}.` : 'No successful distributed-routing outcome was found.'} ${singleFailures > 0 ? `Single-gate routing has ${singleFailures} partial or failed outcome signal${singleFailures === 1 ? '' : 's'} and is penalized.` : ''}`.trim()
    : 'No strong prior memory matched this incident, so SENTINEL is using first-principles crowd-risk heuristics and simulation.';
  return { strategies, reason };
}
