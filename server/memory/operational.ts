import type { IncidentAnalysis, InterventionOutcome } from '../types';

export function buildRecallQuery(incident: Omit<IncidentAnalysis, 'id' | 'memories' | 'recommendationReason' | 'strategies' | 'createdAt' | 'interventions'>) {
  return [
    'Find similar physical-operations incidents and outcome evidence.',
    `Category: ${incident.type}.`,
    `Location or zone: ${incident.location}.`,
    `Event phase: ${incident.context.eventPhase}.`,
    `Risk level: ${incident.severity} (${incident.baselineRisk}/100).`,
    `Congestion type: ${incident.context.congestionType}.`,
    `Crowd conditions: ${incident.context.crowdConditions}.`,
    `Occupancy or density: ${incident.context.occupancyDensity}.`,
    `Gate conditions: ${incident.context.gateConditions}.`,
    `Environmental constraints: ${incident.context.environmentalConstraints}.`,
    'Prioritize actions that succeeded, actions that were only partial or failed, and reusable lessons.'
  ].join(' ');
}

export function formatOperationalExperience(incident: IncidentAnalysis, interventions: InterventionOutcome[]) {
  const final = interventions.at(-1)!;
  const failedOrPartial = interventions.filter((item) => item.successLevel !== 'strong');
  const worked = final.successLevel === 'strong'
    ? `${final.strategyTitle} reduced risk from ${final.riskBefore}/100 to ${final.riskAfter}/100.`
    : `${final.strategyTitle} produced ${final.successLevel} improvement, ending at risk ${final.riskAfter}/100.`;
  const failed = failedOrPartial.length
    ? failedOrPartial.map((item) => `${item.strategyTitle} was ${item.successLevel} (${item.riskBefore} to ${item.riskAfter})`).join('; ')
    : 'No earlier intervention failure was observed.';

  return [
    'SENTINEL OPERATIONAL EXPERIENCE',
    '',
    'INCIDENT',
    `- Incident ID: ${incident.id}`,
    `- Category: ${incident.type}`,
    `- Severity: ${incident.severity}`,
    `- Location/zone: ${incident.location}`,
    `- Timestamp: ${incident.createdAt}`,
    '',
    'CONTEXT',
    `- Crowd conditions: ${incident.context.crowdConditions}`,
    `- Occupancy/density: ${incident.context.occupancyDensity}`,
    `- Event phase: ${incident.context.eventPhase}`,
    `- Gate conditions: ${incident.context.gateConditions}`,
    `- Environmental constraints: ${incident.context.environmentalConstraints}`,
    `- Congestion type: ${incident.context.congestionType}`,
    '',
    'ACTION',
    ...interventions.map((item, index) => `- ${index + 1}. ${item.strategyTitle}; routes/gates: ${item.routes.join(', ')}; operator changes: ${item.operatorChanges}`),
    '',
    'OUTCOME',
    `- Risk before: ${interventions[0].riskBefore}/100`,
    `- Risk after: ${final.riskAfter}/100`,
    `- Success level: ${final.successLevel}`,
    `- Observed consequences: ${interventions.map((item) => `${item.strategyTitle} was ${item.successLevel}, moving risk ${item.riskBefore} to ${item.riskAfter}`).join('; ')}.`,
    '',
    'LESSON',
    `- What worked: ${worked}`,
    `- What failed or was insufficient: ${failed}`,
    `- Reusable operational insight: For similar ${incident.context.eventPhase.toLowerCase()} ${incident.context.congestionType.toLowerCase()} incidents, compare distributed multi-gate routing against single-gate diversion and prefer the intervention supported by the stronger observed risk reduction.`
  ].join('\n');
}

export function routesForStrategy(strategyId: string) {
  if (strategyId === 'distributed-routing') return ['Gate B', 'Gate C'];
  if (strategyId === 'single-diversion') return ['Gate B'];
  return ['Incident zone inflow', 'Outbound route'];
}
