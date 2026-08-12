import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStrategies } from './strategy';
import { simulateAll, simulateStrategy } from './simulator';
import { createDemoEnvironment, updateEnvironment } from '../world/venue';
import type { MemoryHit } from '../types';

const history: MemoryHit[] = [
  { text: 'Distributed rerouting across Gate B and Gate C reduced risk from 52/100 to 21/100.', evidence: { id: 'distributed-success' } },
  { text: 'Initial single-exit diversion to Gate B was partial and reduced risk from 84/100 to 52/100.', evidence: { id: 'single-partial' } }
];

test('simulation operates on a clone and never mutates live environment', () => {
  const environment = createDemoEnvironment('concert');
  const snapshot = structuredClone(environment);
  simulateStrategy(environment, 'DISTRIBUTED_EXIT_ROUTING');
  assert.deepEqual(environment, snapshot);
});

test('distributed routing reduces risk more than single-gate diversion', () => {
  const environment = createDemoEnvironment('concert');
  const distributed = simulateStrategy(environment, 'DISTRIBUTED_EXIT_ROUTING');
  const single = simulateStrategy(environment, 'SINGLE_GATE_DIVERSION');
  assert.ok(distributed.projectedRisk < distributed.baselineRisk);
  assert.ok(distributed.projectedRisk < single.projectedRisk);
});

test('unavailable Gate C blocks distributed routing', () => {
  const environment = updateEnvironment(createDemoEnvironment('football'), {
    unavailableGates: ['gate-c'],
    gates: [{ id: 'gate-c', open: false, availability: 'unavailable' }]
  });
  const result = simulateStrategy(environment, 'DISTRIBUTED_EXIT_ROUTING');
  assert.equal(result.riskDelta, 0);
  assert.match(result.constraintViolations.join(' '), /Gate C is unavailable/);
});

test('memory success boosts ranking and historical failure penalizes single-gate routing', () => {
  const environment = createDemoEnvironment('football');
  const strategies = buildStrategies(93, history, simulateAll(environment)).strategies;
  const distributed = strategies.find((strategy) => strategy.id === 'distributed-routing')!;
  const single = strategies.find((strategy) => strategy.id === 'single-diversion')!;
  assert.equal(strategies[0].id, 'distributed-routing');
  assert.ok(distributed.memoryInfluence.historicalSupport > 0);
  assert.ok(single.historicalFailurePenalty > 0);
  assert.ok(distributed.finalScore > single.finalScore);
});

test('historically successful but currently invalid strategy loses', () => {
  const environment = updateEnvironment(createDemoEnvironment('football'), {
    unavailableGates: ['gate-c'],
    gates: [{ id: 'gate-c', open: false, availability: 'unavailable' }]
  });
  const strategies = buildStrategies(99, history, simulateAll(environment)).strategies;
  const distributed = strategies.find((strategy) => strategy.id === 'distributed-routing')!;
  assert.ok(distributed.status.includes('CONSTRAINT-BLOCKED'));
  assert.notEqual(strategies[0].id, 'distributed-routing');
});

test('judge scenario strategy output is deterministic', () => {
  const environment = createDemoEnvironment('football');
  const run = () => buildStrategies(93, history, simulateAll(environment)).strategies.map((strategy) => ({
    id: strategy.id,
    projectedRisk: strategy.projectedRisk,
    finalScore: strategy.finalScore,
    status: strategy.status
  }));
  assert.deepEqual(run(), run());
});
