import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { HindsightMemory } from './memory/HindsightMemory';
import { FallbackMemory } from './memory/FallbackMemory';
import type { MemoryProvider } from './memory/types';
import { classifyIncident } from './engine/incident';
import { buildStrategies } from './engine/strategy';
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
  res.json({ ok: true, memoryMode: memory.mode, memory: memoryHealth });
});
app.get('/api/state', (_req,res)=>res.json({ memoryMode: memory.mode, bankId: memory.bankId, ...counters }));

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
    const query = `${parsed.type} at ${parsed.location}. Context: ${description}. What similar incidents, responses, and outcomes should guide the current decision?`;
    const memories = await memory.recall(query);
    const { strategies, reason } = buildStrategies(parsed.baselineRisk, memories);
    const incident = { id: randomUUID(), description, ...parsed, memories, recommendationReason: reason, strategies, createdAt:new Date().toISOString() };
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
    const outcomeRisk = strategy.projectedRisk;
    const content = `INCIDENT EXPERIENCE: ${incident.type} at ${incident.location}. Situation: ${incident.description}. Baseline risk ${incident.baselineRisk}/100. Operator selected strategy: ${strategy.title}. Response: ${strategy.description}. Observed/simulated outcome risk ${outcomeRisk}/100. Effectiveness: ${outcomeRisk <= 35 ? 'strong' : outcomeRisk <= 55 ? 'partial' : 'weak'}. This experience should inform future incidents with similar crowd behavior and venue conditions.`;
    await memory.retain(content);
    counters.incidentsRemembered += 1;
    counters.responsesObserved += 1;
    if (outcomeRisk <= 35) counters.patternsLearned += 1;
    const updated = { ...incident, recommendationReason: `${incident.recommendationReason} Outcome retained in Hindsight for future recall.` };
    incidents.set(updated.id, updated);
    res.json({incident:updated,outcomeRisk,memoryCreated:true});
  } catch(e){next(e)}
});

app.post('/api/ask', async (req,res,next)=>{
  try {
    const query = String(req.body?.query || '').trim();
    if (!query) return res.status(400).json({error:'query is required'});
    const memories = await memory.recall(query);
    let answer: string;
    try { answer = await memory.reflect(query); }
    catch { answer = memories.length ? `Based on recalled operational evidence: ${memories[0].text}` : 'No relevant operational memory found yet.'; }
    res.json({answer,memories});
  } catch(e){next(e)}
});

app.use((err:any,_req:any,res:any,_next:any)=>{
  console.error(err);
  const status = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  res.status(status).json({error:err?.message || 'Internal server error'});
});

const port = Number(process.env.PORT || 8787);
app.listen(port,()=>console.log(`SENTINEL API listening on http://localhost:${port}`));
