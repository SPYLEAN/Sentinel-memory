import { assessRisk } from './risk';
import { cloneEnvironment } from '../world/venue';
import type { EnvironmentState } from '../world/types';

export type SimulationStrategyId = 'SINGLE_GATE_DIVERSION' | 'DISTRIBUTED_EXIT_ROUTING' | 'TEMPORARY_INFLOW_HOLD' | 'AUXILIARY_ROUTE';

export interface SimulationResult {
  strategyId: SimulationStrategyId;
  baselineRisk: number;
  projectedRisk: number;
  riskDelta: number;
  affectedGates: string[];
  affectedZones: string[];
  warnings: string[];
  constraintViolations: string[];
  projectedCongestion: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  rationale: string;
  projectedEnvironment: EnvironmentState;
}

export const STRATEGY_IDS: SimulationStrategyId[] = ['SINGLE_GATE_DIVERSION', 'DISTRIBUTED_EXIT_ROUTING', 'TEMPORARY_INFLOW_HOLD', 'AUXILIARY_ROUTE'];

const gateAvailable = (environment: EnvironmentState, id: string) => {
  const gate = environment.venue.gates.find((item) => item.id === id);
  return Boolean(gate?.open && gate.availability === 'available' && !environment.unavailableGates.includes(id));
};

export function simulateStrategy(environment: EnvironmentState, strategyId: SimulationStrategyId): SimulationResult {
  const projected = cloneEnvironment(environment);
  const baseline = assessRisk(environment);
  const constraintViolations: string[] = [];
  const warnings: string[] = [];
  let affectedGates: string[] = [];
  let affectedZones: string[] = [];
  let rationale = '';

  if (strategyId === 'SINGLE_GATE_DIVERSION') {
    affectedGates = ['gate-a', 'gate-b'];
    affectedZones = ['north-plaza', 'west-corridor'];
    if (!gateAvailable(projected, 'gate-b')) constraintViolations.push('Gate B is unavailable for single-gate diversion.');
    if (projected.blockedRoutes.includes('west-corridor-route')) constraintViolations.push('West Corridor is blocked.');
    if (!constraintViolations.length) {
      projected.occupancy = Math.round(projected.safeCapacity * .80);
      projected.density = .55;
      projected.outflow = projected.inflow;
      projected.surgeIntensity = .50;
      projected.venue.gates.find((gate) => gate.id === 'gate-a')!.currentFlow = 20;
      projected.venue.gates.find((gate) => gate.id === 'gate-b')!.currentFlow = 150;
      projected.venue.gates.find((gate) => gate.id === 'gate-c')!.currentFlow = 30;
      warnings.push('Gate B approaches its rated capacity and may develop queue spillback.');
    }
    rationale = 'Concentrates diverted flow at Gate B; improves Gate A but leaves a single alternate-exit bottleneck.';
  } else if (strategyId === 'DISTRIBUTED_EXIT_ROUTING') {
    affectedGates = ['gate-a', 'gate-b', 'gate-c'];
    affectedZones = ['north-plaza', 'west-corridor', 'east-corridor'];
    if (!gateAvailable(projected, 'gate-b')) constraintViolations.push('Gate B is unavailable for distributed routing.');
    if (!gateAvailable(projected, 'gate-c')) constraintViolations.push('Gate C is unavailable for distributed routing.');
    if (projected.blockedRoutes.includes('west-corridor-route')) constraintViolations.push('West Corridor is blocked.');
    if (projected.blockedRoutes.includes('east-corridor-route')) constraintViolations.push('East Corridor is blocked.');
    if (!constraintViolations.length) {
      projected.occupancy = Math.round(projected.safeCapacity * .62);
      projected.density = .32;
      projected.outflow = Math.max(projected.inflow + 30, 260);
      projected.surgeIntensity = .18;
      projected.venue.gates.find((gate) => gate.id === 'gate-a')!.currentFlow = 15;
      projected.venue.gates.find((gate) => gate.id === 'gate-b')!.currentFlow = 125;
      projected.venue.gates.find((gate) => gate.id === 'gate-c')!.currentFlow = 120;
    }
    rationale = 'Splits outbound demand across Gate B and Gate C while metering the overloaded incident gate.';
  } else if (strategyId === 'TEMPORARY_INFLOW_HOLD') {
    affectedGates = ['gate-a'];
    affectedZones = ['north-plaza', 'main-concourse'];
    projected.occupancy = Math.round(projected.safeCapacity * .70);
    projected.density = .50;
    projected.inflow = Math.min(30, projected.inflow);
    projected.surgeIntensity = .40;
    warnings.push('A prolonged hold may transfer queues outside the controlled venue boundary.');
    rationale = 'Reduces new arrivals long enough for existing outbound demand to clear progressively.';
  } else {
    affectedGates = ['gate-b'];
    affectedZones = ['main-concourse', 'west-corridor'];
    if (projected.blockedRoutes.includes('west-corridor-route')) constraintViolations.push('West Corridor is blocked, so the auxiliary route cannot be used.');
    if (!gateAvailable(projected, 'gate-b')) constraintViolations.push('Gate B is unavailable at the end of the auxiliary route.');
    if (!constraintViolations.length) {
      projected.occupancy = Math.round(projected.safeCapacity * .72);
      projected.density = .48;
      projected.outflow = Math.max(projected.outflow, 200);
      projected.surgeIntensity = .42;
    }
    rationale = 'Moves a share of demand through West Corridor to reduce pressure on the primary concourse.';
  }

  const assessment = constraintViolations.length ? baseline : assessRisk(projected);
  return {
    strategyId,
    baselineRisk: baseline.riskScore,
    projectedRisk: assessment.riskScore,
    riskDelta: baseline.riskScore - assessment.riskScore,
    affectedGates,
    affectedZones,
    warnings,
    constraintViolations,
    projectedCongestion: assessment.riskLevel,
    rationale,
    projectedEnvironment: projected
  };
}

export function simulateAll(environment: EnvironmentState) {
  console.info('[judge trace] SIMULATION START');
  const simulations = STRATEGY_IDS.map((strategyId) => simulateStrategy(environment, strategyId));
  console.info('[judge trace] SIMULATION COMPLETE');
  return simulations;
}
