import assert from 'node:assert/strict';
import test from 'node:test';
import { assessRisk } from './risk';
import { createDemoEnvironment } from '../world/venue';

test('risk assessment is deterministic and explainable', () => {
  const environment = createDemoEnvironment('concert');
  const first = assessRisk(environment);
  const second = assessRisk(environment);

  assert.deepEqual(first, second);
  assert.equal(first.riskScore, 86);
  assert.equal(first.riskLevel, 'CRITICAL');
  assert.deepEqual(first.breakdown.map((factor) => factor.id), [
    'occupancy', 'density', 'flow-imbalance', 'gate-throughput', 'surge', 'constraints', 'event-phase'
  ]);
});
