import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { HindsightMemory } from './memory/HindsightMemory';
import { FallbackMemory } from './memory/FallbackMemory';
import type { MemoryProvider } from './memory/types';
import { classifyIncident } from './engine/incident';
import { buildStrategies } from './engine/strategy';
import { buildRecallQuery, formatOperationalExperience, routesForStrategy } from './memory/operational';
import { counters, incidents } from './store';

const app = express();
app.use(cors());
app.use(express.json());

const bankId = process.env.HINDSIGHT_BANK_ID || 'sentinel-ops-v1';
const apiKey = process.env.HINDSIGHT_API_KEY;
const baseUrl = process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io';
const memory: MemoryProvider = apiKey
  ? new HindsightMemory(bankId, baseUrl, apiKey)
  : new FallbackMemory(bankId);

await memory.init();
console.log(`[memory] mode=${memory.mode} bank=${memory.bankId}`);

app.get('/api/health', (_req,res)=>{
  const memoryHealth = memory.health();
  const ok = memory.mode === 'fallback' || memoryHealth.connected;
  res.status(ok ? 200 : 503).json({ ok, memoryMode: memory.mode, bankId: memory.bankId, memory: memoryHealth });
});
app.get('/api/state', (_req,res)=>res.json({ memoryMode: memory.mode, memoryConnected: memory.health().connected, bankId: memory.bankId, ...counters }));

app.post('/api/memory/seed', async (_req,res,next)=>{
  try {
    const seeds = [
      'INCIDENT EXPERIENCE: Concert exit surge at Gate A. Initial single-gate diversion to Gate B produced only partial improvement. Opening Gate C and distributing outbound traffic across Gate B + Gate C reduced crowd risk from 87 to 21. Lesson: multi-exit distributed routing outperformed single-gate diversion for post-event crowd surges.',
      'ENVIRONMENT MEMORY: Gate A experiences sharp outbound congestion immediately after headline events end. Metering the gate and opening two alternates early reduces queue spillback into the main concourse.',
      'RESPONSE MEMORY: During high-density egress, holding new inflow for a short period helped stabilize the queue, but it was less effective than distributed rerouting when multiple exits were available.'
    ];
    for (const s of seeds) await memory.retain(s);
    counters.incidentsRemembered += 1;
    counters.responsesObserved += 3;
    counters.patternsLearned += 2;
    res.json({ok:true,retained:seeds.length});
  } catch(e){next(e)}
});

app.post('/api/incidents/analyze', async (req,res,next)=>{
  try {
    const description = String(req.body?.description || '').trim();
    if (!description) return res.status(400).json({error:'description is required'});
    const parsed = classifyIncident(description);
    const query = buildRecallQuery({ description, ...parsed });
    const memories = await memory.recall(query);
    const { strategies, reason } = buildStrategies(parsed.baselineRisk, memories);
    const incident = { id: randomUUID(), description, ...parsed, interventions: [], memories, recommendationReason: reason, strategies, createdAt:new Date().toISOString() };
    incidents.set(incident.id, incident);
    res.json(incident);
  } catch(e){next(e)}
});

app.post('/api/incidents/:id/resolve', async (req,res,next)=>{
  try {
    const incident = incidents.get(req.params.id);
    if (!incident) return res.status(404).json({error:'incident not found'});
    const strategy = incident.strategies.find(s=>s.id === req.body?.strategyId);
    if (!strategy) return res.status(400).json({error:'invalid strategy'});
    const requestedRisk = Number(req.body?.outcomeRisk);
    const outcomeRisk = Number.isFinite(requestedRisk) && requestedRisk >= 0 && requestedRisk <= 100 ? requestedRisk : strategy.projectedRisk;
    const riskBefore = incident.interventions.at(-1)?.riskAfter ?? incident.baselineRisk;
    const successLevel = outcomeRisk <= 35 ? 'strong' : outcomeRisk <= 55 ? 'partial' : 'weak';
    const intervention = {
      strategyId: strategy.id,
      strategyTitle: strategy.title,
      routes: routesForStrategy(strategy.id),
      operatorChanges: String(req.body?.operatorChanges || strategy.description),
      riskBefore,
      riskAfter: outcomeRisk,
      successLevel
    } as const;
    const interventions = [...incident.interventions, intervention];
    const staged = { ...incident, interventions };
    const finalize = req.body?.finalize !== false;
    console.info(`[memory trace] OUTCOME strategy=${strategy.id} risk=${riskBefore}->${outcomeRisk} success=${successLevel} final=${finalize}`);
    if (!finalize) {
      incidents.set(staged.id, staged);
      return res.json({ incident: staged, outcomeRisk, memoryCreated: false });
    }

    const content = formatOperationalExperience(staged, interventions);
    await memory.retain(content, {
      timestamp: incident.createdAt,
      context: `${incident.type} at ${incident.location}; ${incident.context.eventPhase}; ${incident.context.congestionType}`,
      documentId: `sentinel-incident-${incident.id}`,
      metadata: { incidentId: incident.id, category: incident.type, severity: incident.severity, successLevel, finalStrategy: strategy.id },
      tags: ['sentinel-operational-experience', 'physical-operations', incident.type.toLowerCase().replace(/[^a-z0-9]+/g, '-'), incident.context.eventPhase.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
      updateMode: 'replace'
    });
    counters.incidentsRemembered += 1;
    counters.responsesObserved += 1;
    if (outcomeRisk <= 35) counters.patternsLearned += 1;
    const updated = { ...staged, recommendationReason: `${incident.recommendationReason} Outcome retained in ${memory.mode === 'hindsight' ? 'Hindsight operational memory' : 'demo memory'} for future recall.` };
    incidents.set(updated.id, updated);
    res.json({incident:updated,outcomeRisk,memoryCreated:true,memoryRecord:content});
  } catch(e){next(e)}
});

app.post('/api/ask', async (req,res,next)=>{
  try {
    const query = String(req.body?.query || '').trim();
    if (!query) return res.status(400).json({error:'query is required'});
    const memories = await memory.recall(query);
    const reflection = await memory.reflect(query, 'Answer only from retained SENTINEL physical-operations memories. Distinguish successful, partial, and failed interventions. If evidence is insufficient, say so explicitly.');
    res.json({answer:reflection.text,memories,evidence:reflection.evidence});
  } catch(e){next(e)}
});

app.use((err:any,_req:any,res:any,_next:any)=>{
  console.error(err);
  const status = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  res.status(status).json({error:err?.message || 'Internal server error'});
});

const port = Number(process.env.PORT || 8787);
app.listen(port,()=>console.log(`SENTINEL API listening on http://localhost:${port}`));
