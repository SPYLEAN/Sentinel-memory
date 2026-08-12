import type { MemoryHit, Strategy } from '../types';

export function buildStrategies(baselineRisk: number, memories: MemoryHit[]): { strategies: Strategy[]; reason: string } {
  const memoryText = memories.map(m=>m.text.toLowerCase()).join(' ');
  const distributedWorked = /(distributed|two exits|gate b \+ gate c|multiple exits|multi-exit)/.test(memoryText);
  const singleWeak = /(single-gate|gate b only|partial|insufficient)/.test(memoryText);

  const strategies: Strategy[] = [
    {
      id:'distributed-routing', title:'Distributed rerouting',
      description:'Split outbound flow across two available exits and meter the overloaded zone.',
      projectedRisk: Math.max(18, baselineRisk - (distributedWorked ? 58 : 46)),
      confidence: distributedWorked ? .93 : .82, learnedFromMemory: distributedWorked
    },
    {
      id:'single-diversion', title:'Single-exit diversion',
      description:'Redirect primary flow to one alternate gate while holding the incident gate.',
      projectedRisk: Math.max(32, baselineRisk - (singleWeak ? 23 : 31)),
      confidence: singleWeak ? .61 : .74, learnedFromMemory: singleWeak
    },
    {
      id:'temporary-hold', title:'Temporary inflow hold',
      description:'Pause incoming flow, maintain outbound movement, then reopen progressively.',
      projectedRisk: Math.max(28, baselineRisk - 37), confidence: .76, learnedFromMemory:false
    }
  ].sort((a,b)=>a.projectedRisk-b.projectedRisk);

  const reason = memories.length
    ? `SENTINEL recalled ${memories.length} related operational memories. ${distributedWorked ? 'Previous outcomes favor distributed routing over a single alternate exit.' : 'The recommendation combines recalled evidence with current simulated risk.'}`
    : 'No strong prior memory matched this incident, so SENTINEL is using first-principles crowd-risk heuristics and simulation.';
  return { strategies, reason };
}
