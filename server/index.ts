import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { HindsightMemory } from './memory/HindsightMemory';
import { FallbackMemory } from './memory/FallbackMemory';
import type { MemoryProvider, MemoryQueryOptions } from './memory/types';
import { classifyIncident } from './engine/incident';
import { buildStrategies } from './engine/strategy';
import { assessRisk } from './engine/risk';
import { simulateAll, simulateStrategy, type SimulationStrategyId } from './engine/simulator';
import { buildRecallQuery, formatOperationalExperience, routesForStrategy } from './memory/operational';
import { cloneEnvironment, createDemoEnvironment, updateEnvironment } from './world/venue';
import type { EnvironmentUpdate } from './world/types';
import type { IncidentAnalysis, IncidentContext, InterventionOutcome, Severity } from './types';
import { counters, incidents } from './store';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const bankId = process.env.HINDSIGHT_BANK_ID || 'sentinel-ops-v1';
const apiKey = process.env.HINDSIGHT_API_KEY;
const baseUrl = process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io';
const memory: MemoryProvider = apiKey
  ? new HindsightMemory(bankId, baseUrl, apiKey)
  : new FallbackMemory(bankId);

await memory.init();
console.log(`[memory] mode=${memory.mode} bank=${memory.bankId}`);

let currentEnvironment = createDemoEnvironment('concert');
let activeJudgeSession: string | undefined;
let lastAnalysis: IncidentAnalysis | undefined;

const judgeMemoryOptions = (sessionId?: string): MemoryQueryOptions | undefined => sessionId
  ? { tags: ['sentinel-operational-experience', sessionId], tagsMatch: 'all_strict' }
  : undefined;

function severityForRisk(score: number): Severity {
  return score >= 86 ? 'CRITICAL' : score >= 70 ? 'HIGH' : score >= 45 ? 'MODERATE' : 'LOW';
}

function contextForEnvironment(description: string, parsed: ReturnType<typeof classifyIncident>): IncidentContext {
  return {
    ...parsed.context,
    crowdConditions: `${parsed.context.crowdConditions}; surge index ${currentEnvironment.surgeIntensity.toFixed(2)}`,
    occupancyDensity: `${currentEnvironment.occupancy}/${currentEnvironment.safeCapacity} occupants; density ${currentEnvironment.density.toFixed(2)}`,
    eventPhase: currentEnvironment.eventPhase,
    gateConditions: currentEnvironment.unavailableGates.length
      ? `Unavailable gates: ${currentEnvironment.unavailableGates.join(', ')}`
      : parsed.context.gateConditions,
    congestionType: parsed.context.congestionType,
    environmentalConstraints: [
      parsed.context.environmentalConstraints,
      currentEnvironment.blockedRoutes.length ? `Blocked routes: ${currentEnvironment.blockedRoutes.join(', ')}` : '',
      description.toLowerCase().includes('north gate') ? 'North Gate incident area' : ''
    ].filter(Boolean).join('; ')
  };
}

async function analyzeIncident(description: string, memoryOptions?: MemoryQueryOptions): Promise<IncidentAnalysis> {
  console.info('[judge trace] INCIDENT RECEIVED');
  const parsed = classifyIncident(description);
  const riskAssessment = assessRisk(currentEnvironment);
  console.info(`[judge trace] CURRENT RISK ${riskAssessment.riskScore}`);
  const context = contextForEnvironment(description, parsed);
  const query = buildRecallQuery({ type: parsed.type, location: parsed.location, severity: severityForRisk(riskAssessment.riskScore), baselineRisk: riskAssessment.riskScore, context });
  console.info('[judge trace] HINDSIGHT RECALL START');
  const memories = await memory.recall(query, memoryOptions);
  console.info(`[judge trace] HINDSIGHT RECALL COMPLETE - MEMORIES FOUND ${memories.length}`);
  console.info('[judge trace] STRATEGIES GENERATED');
  const simulations = simulateAll(currentEnvironment);
  const { strategies, reason } = buildStrategies(riskAssessment.riskScore, memories, simulations);
  const recommendation = strategies[0];
  const blocked = strategies.filter((strategy) => strategy.status.includes('CONSTRAINT-BLOCKED'));
  const recommendationReason = `${reason} Current simulation projects ${recommendation.title} at risk ${recommendation.projectedRisk}/100 (${recommendation.simulationInfluence.improvement} point improvement).${blocked.length ? ` Constraints block: ${blocked.map((strategy) => strategy.title).join(', ')}.` : ''}`;
  const incident: IncidentAnalysis = {
    id: randomUUID(),
    description,
    type: parsed.type,
    location: parsed.location,
    severity: riskAssessment.riskLevel,
    confidence: parsed.confidence,
    baselineRisk: riskAssessment.riskScore,
    context,
    environment: cloneEnvironment(currentEnvironment),
    riskAssessment,
    simulations,
    interventions: [],
    memories,
    recommendationReason,
    recommendation,
    strategies,
    createdAt: new Date().toISOString()
  };
  incidents.set(incident.id, incident);
  lastAnalysis = incident;
  console.info(`[judge trace] MEMORY INFLUENCE support=${recommendation.memoryInfluence.historicalSupport}`);
  console.info(`[judge trace] FINAL RECOMMENDATION ${recommendation.simulationStrategyId}`);
  return incident;
}

function createIntervention(incident: IncidentAnalysis, strategyId: string, riskAfter: number, operatorChanges: string): InterventionOutcome {
  const strategy = incident.strategies.find((item) => item.id === strategyId);
  if (!strategy) throw Object.assign(new Error(`unknown strategy: ${strategyId}`), { statusCode: 400 });
  const riskBefore = incident.interventions.at(-1)?.riskAfter ?? incident.baselineRisk;
  return {
    strategyId,
    strategyTitle: strategy.title,
    routes: routesForStrategy(strategyId),
    operatorChanges,
    riskBefore,
    riskAfter,
    successLevel: riskAfter <= 35 ? 'strong' : riskAfter <= 55 ? 'partial' : 'weak'
  };
}

async function retainIncident(incident: IncidentAnalysis, interventions: InterventionOutcome[], extraTags: string[] = []) {
  const final = interventions.at(-1)!;
  const staged = { ...incident, interventions };
  const content = formatOperationalExperience(staged, interventions);
  console.info('[judge trace] HINDSIGHT RETAIN START');
  await memory.retain(content, {
    timestamp: incident.createdAt,
    context: `${incident.type} at ${incident.location}; ${incident.context.eventPhase}; ${incident.context.congestionType}`,
    documentId: `sentinel-incident-${incident.id}`,
    metadata: { incidentId: incident.id, category: incident.type, severity: incident.severity, successLevel: final.successLevel, finalStrategy: final.strategyId },
    tags: ['sentinel-operational-experience', 'physical-operations', incident.type.toLowerCase().replace(/[^a-z0-9]+/g, '-'), incident.context.eventPhase.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ...extraTags],
    updateMode: 'replace'
  });
  console.info('[judge trace] HINDSIGHT RETAIN COMPLETE');
  counters.incidentsRemembered += 1;
  counters.responsesObserved += interventions.length;
  if (final.successLevel === 'strong') counters.patternsLearned += 1;
  const updated = { ...staged, recommendationReason: `${incident.recommendationReason} MEMORY RETAINED in ${memory.mode === 'hindsight' ? 'Hindsight operational memory' : 'demo memory'}.` };
  incidents.set(updated.id, updated);
  lastAnalysis = updated;
  return { updated, content };
}

app.get('/api/health', (_req,res) => {
  const memoryHealth = memory.health();
  const ok = memory.mode === 'fallback' || memoryHealth.connected;
  res.status(ok ? 200 : 503).json({ ok, memoryMode: memory.mode, bankId: memory.bankId, memory: memoryHealth });
});

app.get('/api/state', (_req,res) => res.json({ memoryMode: memory.mode, memoryConnected: memory.health().connected, bankId: memory.bankId, ...counters }));

app.get('/api/environment', (_req,res) => res.json({ environment: currentEnvironment, risk: assessRisk(currentEnvironment) }));

app.post('/api/environment/reset', (req,res) => {
  const scenario = req.body?.scenario === 'concert' || req.body?.scenario === 'football' ? req.body.scenario : 'default';
  currentEnvironment = createDemoEnvironment(scenario);
  res.json({ environment: currentEnvironment, risk: assessRisk(currentEnvironment) });
});

app.post('/api/environment/update', (req,res) => {
  currentEnvironment = updateEnvironment(currentEnvironment, req.body as EnvironmentUpdate);
  res.json({ environment: currentEnvironment, risk: assessRisk(currentEnvironment) });
});

app.post('/api/simulate', (req,res) => {
  const requested = String(req.body?.strategyId || '').toUpperCase().replaceAll('-', '_') as SimulationStrategyId;
  const allowed: SimulationStrategyId[] = ['SINGLE_GATE_DIVERSION', 'DISTRIBUTED_EXIT_ROUTING', 'TEMPORARY_INFLOW_HOLD', 'AUXILIARY_ROUTE'];
  if (requested && !allowed.includes(requested)) return res.status(400).json({ error: 'invalid strategyId' });
  const simulations = requested ? [simulateStrategy(currentEnvironment, requested)] : simulateAll(currentEnvironment);
  res.json({ currentRisk: assessRisk(currentEnvironment), simulations });
});

app.post('/api/memory/seed', async (_req,res,next) => {
  try {
    const seeds = [
      'INCIDENT EXPERIENCE: Concert exit surge at Gate A. Initial single-gate diversion to Gate B produced only partial improvement. Opening Gate C and distributing outbound traffic across Gate B + Gate C reduced crowd risk from 87 to 21. Lesson: multi-exit distributed routing outperformed single-gate diversion for post-event crowd surges.',
      'ENVIRONMENT MEMORY: Gate A experiences sharp outbound congestion immediately after headline events end. Metering the gate and opening two alternates early reduces queue spillback into the main concourse.',
      'RESPONSE MEMORY: During high-density egress, holding new inflow for a short period helped stabilize the queue, but it was less effective than distributed rerouting when multiple exits were available.'
    ];
    for (const seed of seeds) await memory.retain(seed);
    counters.incidentsRemembered += 1;
    counters.responsesObserved += 3;
    counters.patternsLearned += 2;
    res.json({ok:true,retained:seeds.length});
  } catch(error) { next(error); }
});

app.post('/api/incidents/analyze', async (req,res,next) => {
  try {
    const description = String(req.body?.description || '').trim();
    if (!description) return res.status(400).json({error:'description is required'});
    res.json(await analyzeIncident(description));
  } catch(error) { next(error); }
});

app.post('/api/incidents/:id/resolve', async (req,res,next) => {
  try {
    const incident = incidents.get(req.params.id);
    if (!incident) return res.status(404).json({error:'incident not found'});
    const strategy = incident.strategies.find((item) => item.id === req.body?.strategyId);
    if (!strategy) return res.status(400).json({error:'invalid strategy'});
    if (strategy.status.includes('CONSTRAINT-BLOCKED')) return res.status(409).json({ error: 'strategy is blocked by current operational constraints', constraints: strategy.simulationInfluence.constraintViolations });
    const requestedRisk = Number(req.body?.outcomeRisk);
    const outcomeRisk = Number.isFinite(requestedRisk) && requestedRisk >= 0 && requestedRisk <= 100 ? requestedRisk : strategy.projectedRisk;
    const intervention = createIntervention(incident, strategy.id, outcomeRisk, String(req.body?.operatorChanges || strategy.description));
    const interventions = [...incident.interventions, intervention];
    const staged = { ...incident, interventions };
    const finalize = req.body?.finalize !== false;
    console.info(`[judge trace] OUTCOME strategy=${strategy.simulationStrategyId} risk=${intervention.riskBefore}->${outcomeRisk} success=${intervention.successLevel}`);
    if (!finalize) {
      incidents.set(staged.id, staged);
      return res.json({ incident: staged, outcomeRisk, memoryCreated: false });
    }
    const retained = await retainIncident(staged, interventions);
    res.json({incident:retained.updated,outcomeRisk,memoryCreated:true,memoryRetainedEvent:{status:'MEMORY RETAINED',incidentId:incident.id},memoryRecord:retained.content});
  } catch(error) { next(error); }
});

app.post('/api/judge/reset', (req,res) => {
  activeJudgeSession = String(req.body?.sessionId || `judge-${randomUUID()}`);
  currentEnvironment = createDemoEnvironment('concert');
  incidents.clear();
  lastAnalysis = undefined;
  counters.incidentsRemembered = 0;
  counters.responsesObserved = 0;
  counters.patternsLearned = 0;
  res.json({ ok: true, sessionId: activeJudgeSession, scenario: 'DAY_1', environment: currentEnvironment, risk: assessRisk(currentEnvironment) });
});

app.post('/api/judge/incident-one', async (req,res,next) => {
  try {
    const sessionId = String(req.body?.sessionId || activeJudgeSession || '');
    if (!sessionId) return res.status(400).json({ error: 'run /api/judge/reset first or provide sessionId' });
    activeJudgeSession = sessionId;
    currentEnvironment = createDemoEnvironment('concert');
    const analysis = await analyzeIncident('Heavy crowd buildup at Gate A after the concert ends.', judgeMemoryOptions(sessionId));
    const partial = createIntervention(analysis, 'single-diversion', 52, 'Redirected outbound traffic to Gate B only; improvement was partial and Gate B approached capacity.');
    const withPartial = { ...analysis, interventions: [partial] };
    const strong = createIntervention(withPartial, 'distributed-routing', 21, 'Opened Gate C and distributed outbound traffic across Gate B and Gate C while metering Gate A.');
    console.info(`[judge trace] OUTCOME Gate B only ${analysis.baselineRisk}->52 partial; distributed Gate B + Gate C 52->21 strong`);
    const retained = await retainIncident(analysis, [partial, strong], [sessionId, 'judge-day-1']);
    res.json({ sessionId, scenario: 'DAY_1', incident: retained.updated, initialMemoryCount: analysis.memories.length, outcomes: [partial, strong], memoryRetainedEvent: { status: 'MEMORY RETAINED', incidentId: analysis.id }, retainedMemory: retained.content });
  } catch(error) { next(error); }
});

app.post('/api/judge/incident-two', async (req,res,next) => {
  try {
    const sessionId = String(req.body?.sessionId || activeJudgeSession || '');
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required after backend restart' });
    activeJudgeSession = sessionId;
    currentEnvironment = createDemoEnvironment('football');
    if (req.body?.gateCUnavailable === true) {
      currentEnvironment = updateEnvironment(currentEnvironment, { unavailableGates: ['gate-c'], gates: [{ id: 'gate-c', availability: 'unavailable', open: false }] });
    }
    const analysis = await analyzeIncident('The football match has ended and congestion is increasing near North Gate.', judgeMemoryOptions(sessionId));
    res.json({ sessionId, scenario: req.body?.gateCUnavailable ? 'MEMORY_NOT_BLIND' : 'DAY_12', incident: analysis, memoryFound: analysis.memories.length, recommendation: analysis.recommendation });
  } catch(error) { next(error); }
});

app.post('/api/ask', async (req,res,next) => {
  try {
    const query = String(req.body?.query || '').trim();
    if (!query) return res.status(400).json({error:'query is required'});
    const hypothetical = /(gate c).*(closed|unavailable)|(?:closed|unavailable).*(gate c)/i.test(query);
    const evidenceEnvironment = hypothetical
      ? updateEnvironment(currentEnvironment, { unavailableGates: ['gate-c'], gates: [{ id: 'gate-c', availability: 'unavailable', open: false }] })
      : cloneEnvironment(currentEnvironment);
    const options = judgeMemoryOptions(activeJudgeSession);
    const memories = await memory.recall(query, options);
    const simulations = simulateAll(evidenceEnvironment);
    const risk = assessRisk(evidenceEnvironment);
    const ranked = buildStrategies(risk.riskScore, memories, simulations).strategies;
    const recommendation = ranked[0];
    const simulationSummary = ranked.map((strategy) => `${strategy.title}: projected risk ${strategy.projectedRisk}, status ${strategy.status.join(' + ')}, constraints ${strategy.simulationInfluence.constraintViolations.join('; ') || 'none'}`).join('\n');
    const reflection = await memory.reflect(
      query,
      `Answer only from retained SENTINEL physical-operations memories and this deterministic current-state evidence. Current risk: ${risk.riskScore}/100. Current unavailable gates: ${evidenceEnvironment.unavailableGates.join(', ') || 'none'}. Simulation results:\n${simulationSummary}\nRecommended current strategy: ${recommendation.title}. Never recommend a constraint-blocked strategy. Distinguish successful, partial, and failed historical interventions.`,
      options
    );
    res.json({
      answer: reflection.text,
      confidence: recommendation.confidence,
      currentStateEvidence: { environment: evidenceEnvironment, risk },
      memoryEvidence: { memories, basedOn: reflection.evidence },
      simulationEvidence: simulations,
      recommendation
    });
  } catch(error) { next(error); }
});

app.use((err:any,_req:any,res:any,_next:any) => {
  console.error(err);
  const status = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  res.status(status).json({error:err?.message || 'Internal server error'});
});

export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 8787);
  app.listen(port, () => console.log(`SENTINEL API listening on http://localhost:${port}`));
}
