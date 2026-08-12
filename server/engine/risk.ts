import type { Severity } from '../types.js';
import type { EnvironmentState } from '../world/types.js';

export interface RiskFactor {
  id: string;
  label: string;
  contribution: number;
  explanation: string;
}

export interface RiskAssessment {
  riskScore: number;
  riskLevel: Severity;
  breakdown: RiskFactor[];
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(value * 10) / 10;

export function assessRisk(environment: EnvironmentState): RiskAssessment {
  const occupancyRatio = environment.safeCapacity > 0 ? environment.occupancy / environment.safeCapacity : 1;
  const occupancy = clamp((occupancyRatio - .5) / .5, 0, 1.4) * 25;
  const density = clamp(environment.density, 0, 1) * 25;
  const imbalance = environment.inflow > 0 ? clamp((environment.inflow - environment.outflow) / environment.inflow, 0, 1) * 20 : 0;
  const availableGates = environment.venue.gates.filter((gate) => gate.open && gate.availability === 'available');
  const totalCapacity = environment.venue.gates.reduce((sum, gate) => sum + gate.capacityPerMinute, 0) || 1;
  const totalFlow = availableGates.reduce((sum, gate) => sum + gate.currentFlow, 0);
  const throughput = clamp(totalFlow / totalCapacity, 0, 1.2) * 10;
  const surge = clamp(environment.surgeIntensity, 0, 1) * 15;
  const constraints = Math.min(18, environment.blockedRoutes.length * 6 + environment.unavailableGates.length * 8);
  const phase = environment.eventPhase === 'post-event-egress' ? 10 : environment.eventPhase === 'pre-event' ? 3 : 5;
  const riskScore = Math.round(clamp(occupancy + density + imbalance + throughput + surge + constraints + phase));
  const riskLevel: Severity = riskScore >= 86 ? 'CRITICAL' : riskScore >= 70 ? 'HIGH' : riskScore >= 45 ? 'MODERATE' : 'LOW';
  return {
    riskScore,
    riskLevel,
    breakdown: [
      { id: 'occupancy', label: 'Occupancy vs safe capacity', contribution: round(occupancy), explanation: `${environment.occupancy}/${environment.safeCapacity} occupants (${Math.round(occupancyRatio * 100)}% of safe capacity)` },
      { id: 'density', label: 'Crowd density', contribution: round(density), explanation: `Density index ${environment.density.toFixed(2)}` },
      { id: 'flow-imbalance', label: 'Inflow vs outflow', contribution: round(imbalance), explanation: `${environment.inflow}/min inflow versus ${environment.outflow}/min outflow` },
      { id: 'gate-throughput', label: 'Gate throughput pressure', contribution: round(throughput), explanation: `${Math.round(totalFlow)}/${totalCapacity} people per minute across available gates` },
      { id: 'surge', label: 'Surge intensity', contribution: round(surge), explanation: `Surge index ${environment.surgeIntensity.toFixed(2)}` },
      { id: 'constraints', label: 'Unavailable paths', contribution: round(constraints), explanation: `${environment.unavailableGates.length} unavailable gates and ${environment.blockedRoutes.length} blocked routes` },
      { id: 'event-phase', label: 'Event phase', contribution: phase, explanation: environment.eventPhase }
    ]
  };
}
