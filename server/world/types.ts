export type EventPhase = 'pre-event' | 'active-event' | 'post-event-egress';
export type GateDirection = 'inbound' | 'outbound' | 'bidirectional';

export interface Zone {
  id: string;
  label: string;
  occupancy: number;
  safeCapacity: number;
  density: number;
}

export interface Gate {
  id: string;
  label: string;
  zoneId: string;
  open: boolean;
  capacityPerMinute: number;
  currentFlow: number;
  currentDensity: number;
  availability: 'available' | 'unavailable';
  direction: GateDirection;
}

export interface Route {
  id: string;
  label: string;
  fromZoneId: string;
  toZoneId: string;
  capacityPerMinute: number;
  blocked: boolean;
}

export interface OperationalConstraint {
  id: string;
  type: 'blocked-route' | 'unavailable-gate' | 'capacity-limit';
  targetId: string;
  description: string;
}

export interface Venue {
  id: string;
  label: string;
  zones: Zone[];
  gates: Gate[];
  routes: Route[];
}

export interface EnvironmentState {
  venue: Venue;
  occupancy: number;
  safeCapacity: number;
  density: number;
  inflow: number;
  outflow: number;
  eventPhase: EventPhase;
  surgeIntensity: number;
  blockedRoutes: string[];
  unavailableGates: string[];
  constraints: OperationalConstraint[];
  updatedAt: string;
}

export type EnvironmentUpdate = Partial<Pick<EnvironmentState, 'occupancy' | 'safeCapacity' | 'density' | 'inflow' | 'outflow' | 'eventPhase' | 'surgeIntensity' | 'blockedRoutes' | 'unavailableGates'>> & {
  gates?: Array<Partial<Gate> & Pick<Gate, 'id'>>;
  routes?: Array<Partial<Route> & Pick<Route, 'id'>>;
};
