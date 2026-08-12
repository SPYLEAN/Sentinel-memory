import type { EnvironmentState, EnvironmentUpdate, OperationalConstraint } from './types.js';

const iso = () => new Date().toISOString();

export function createDemoEnvironment(scenario: 'default' | 'concert' | 'football' = 'default'): EnvironmentState {
  const football = scenario === 'football';
  const concert = scenario === 'concert';
  const occupancy = football ? 9800 : concert ? 9600 : 7200;
  const density = football ? .94 : concert ? .88 : .56;
  const inflow = football ? 250 : concert ? 220 : 120;
  const outflow = football ? 85 : concert ? 100 : 115;
  const surgeIntensity = football ? .96 : concert ? .90 : .34;
  return {
    venue: {
      id: 'sentinel-demo-venue',
      label: 'SENTINEL Event Venue',
      zones: [
        { id: 'north-plaza', label: 'North Plaza', occupancy: Math.round(occupancy * .28), safeCapacity: 2800, density },
        { id: 'main-concourse', label: 'Main Concourse', occupancy: Math.round(occupancy * .34), safeCapacity: 3400, density: Math.max(0, density - .04) },
        { id: 'west-corridor', label: 'West Corridor', occupancy: Math.round(occupancy * .19), safeCapacity: 1900, density: Math.max(0, density - .12) },
        { id: 'east-corridor', label: 'East Corridor', occupancy: Math.round(occupancy * .19), safeCapacity: 1900, density: Math.max(0, density - .10) }
      ],
      gates: [
        { id: 'gate-a', label: 'Gate A', zoneId: 'north-plaza', open: true, capacityPerMinute: 120, currentFlow: football ? 205 : concert ? 190 : 90, currentDensity: density, availability: 'available', direction: 'outbound' },
        { id: 'gate-b', label: 'Gate B', zoneId: 'west-corridor', open: true, capacityPerMinute: 150, currentFlow: football ? 60 : concert ? 50 : 55, currentDensity: Math.max(0, density - .18), availability: 'available', direction: 'outbound' },
        { id: 'gate-c', label: 'Gate C', zoneId: 'east-corridor', open: true, capacityPerMinute: 145, currentFlow: football ? 45 : concert ? 40 : 45, currentDensity: Math.max(0, density - .2), availability: 'available', direction: 'outbound' }
      ],
      routes: [
        { id: 'main-to-gate-a', label: 'Main Concourse to Gate A', fromZoneId: 'main-concourse', toZoneId: 'north-plaza', capacityPerMinute: 130, blocked: false },
        { id: 'west-corridor-route', label: 'West Corridor to Gate B', fromZoneId: 'main-concourse', toZoneId: 'west-corridor', capacityPerMinute: 155, blocked: false },
        { id: 'east-corridor-route', label: 'East Corridor to Gate C', fromZoneId: 'main-concourse', toZoneId: 'east-corridor', capacityPerMinute: 150, blocked: false }
      ]
    },
    occupancy,
    safeCapacity: 10000,
    density,
    inflow,
    outflow,
    eventPhase: concert || football ? 'post-event-egress' : 'active-event',
    surgeIntensity,
    blockedRoutes: [],
    unavailableGates: [],
    constraints: [],
    updatedAt: iso()
  };
}

export function cloneEnvironment(environment: EnvironmentState): EnvironmentState {
  return structuredClone(environment);
}

export function updateEnvironment(environment: EnvironmentState, update: EnvironmentUpdate): EnvironmentState {
  const next = cloneEnvironment(environment);
  for (const field of ['occupancy', 'safeCapacity', 'density', 'inflow', 'outflow', 'eventPhase', 'surgeIntensity', 'blockedRoutes', 'unavailableGates'] as const) {
    if (update[field] !== undefined) Object.assign(next, { [field]: update[field] });
  }
  for (const patch of update.gates ?? []) {
    const gate = next.venue.gates.find((item) => item.id === patch.id);
    if (gate) Object.assign(gate, patch);
  }
  for (const patch of update.routes ?? []) {
    const route = next.venue.routes.find((item) => item.id === patch.id);
    if (route) Object.assign(route, patch);
  }
  next.venue.gates.forEach((gate) => {
    if (next.unavailableGates.includes(gate.id)) {
      gate.availability = 'unavailable';
      gate.open = false;
    }
  });
  next.venue.routes.forEach((route) => { route.blocked = next.blockedRoutes.includes(route.id); });
  next.constraints = buildConstraints(next);
  next.updatedAt = iso();
  return next;
}

function buildConstraints(environment: EnvironmentState): OperationalConstraint[] {
  return [
    ...environment.unavailableGates.map((targetId) => ({ id: `unavailable-${targetId}`, type: 'unavailable-gate' as const, targetId, description: `${targetId} is unavailable` })),
    ...environment.blockedRoutes.map((targetId) => ({ id: `blocked-${targetId}`, type: 'blocked-route' as const, targetId, description: `${targetId} is blocked` }))
  ];
}
