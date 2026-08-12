import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStrategies } from './strategy';

test('uses generic ranking when no operational memory is available', () => {
  const result = buildStrategies(84, []);
  const distributed = result.strategies.find((strategy) => strategy.id === 'distributed-routing')!;
  const single = result.strategies.find((strategy) => strategy.id === 'single-diversion')!;

  assert.equal(distributed.learnedFromMemory, false);
  assert.equal(distributed.memoryInfluence.historicalSupport, 0);
  assert.equal(single.memoryInfluence.previousFailures, 0);
});

test('promotes successful distributed routing and penalizes partial single-gate routing', () => {
  const result = buildStrategies(63, [
    {
      text: 'Distributed rerouting across Gate B and Gate C reduced risk from 52/100 to 21/100.',
      type: 'experience',
      score: .9,
      evidence: { id: 'distributed-evidence' }
    },
    {
      text: 'Initial single-exit diversion to Gate B reduced risk from 84/100 to 52/100.',
      type: 'experience',
      score: .8,
      evidence: { id: 'single-evidence' }
    }
  ]);
  const distributed = result.strategies.find((strategy) => strategy.id === 'distributed-routing')!;
  const single = result.strategies.find((strategy) => strategy.id === 'single-diversion')!;

  assert.equal(result.strategies[0].id, 'distributed-routing');
  assert.equal(distributed.learnedFromMemory, true);
  assert.equal(distributed.memoryInfluence.previousSuccesses, 1);
  assert.deepEqual(distributed.memoryInfluence.evidenceIds, ['distributed-evidence']);
  assert.equal(single.learnedFromMemory, false);
  assert.equal(single.memoryInfluence.previousFailures, 1);
  assert.ok(distributed.confidence > single.confidence);
  assert.ok(distributed.projectedRisk < single.projectedRisk);
});
