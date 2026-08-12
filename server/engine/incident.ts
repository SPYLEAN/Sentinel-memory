import type { Severity } from '../types.js';

export function classifyIncident(description: string) {
  const t = description.toLowerCase();
  const location = extractLocation(description);
  const crowd = /(crowd|congestion|pushing|queue|people|surge|packed)/.test(t);
  const medical = /(injur|medical|faint|fallen|unconscious)/.test(t);
  const blocked = /(blocked|closed exit|obstruction)/.test(t);
  const critical = /(stampede|crush|unconscious|fire|panic)/.test(t);
  const high = critical || /(pushing|surge|heavy crowd|rapidly building|unsafe)/.test(t);
  const type = medical ? 'Medical + Crowd Incident' : blocked ? 'Access Obstruction' : crowd ? 'Crowd Surge' : 'Operational Anomaly';
  const severity: Severity = critical ? 'CRITICAL' : high ? 'HIGH' : crowd ? 'MODERATE' : 'LOW';
  const baselineRisk = severity === 'CRITICAL' ? 94 : severity === 'HIGH' ? 84 : severity === 'MODERATE' ? 63 : 38;
  return {
    type,
    location,
    severity,
    baselineRisk,
    confidence: crowd || medical || blocked ? .91 : .72,
    context: {
      crowdConditions: critical ? 'panic or crush indicators present' : high ? 'heavy crowd pressure with unsafe movement' : crowd ? 'building crowd congestion' : 'no explicit crowd pressure reported',
      occupancyDensity: /(packed|high density|heavy crowd|surge|pushing|congestion)/.test(t) ? 'high or increasing density' : crowd ? 'moderate density' : 'low or unspecified occupancy',
      eventPhase: /(after|ended|ends|post[- ]?(?:event|concert|match)|egress)/.test(t) ? 'post-event egress' : /(before|pre[- ]?event|setup|arrival)/.test(t) ? 'pre-event ingress or setup' : 'active operations',
      gateConditions: blocked ? 'a gate or exit is blocked/obstructed' : /(?:gate|entrance|exit)/.test(t) && crowd ? 'gate flow is congested or overloaded' : 'no explicit gate constraint reported',
      congestionType: /(exit|egress|ended|ends|after)/.test(t) ? 'outbound egress congestion' : crowd ? 'localized crowd congestion' : 'non-crowd operational disruption',
      environmentalConstraints: /(rain|storm|heat|smoke|fire|dark|power|construction)/.test(t) ? 'environmental constraint mentioned in incident description' : 'no explicit environmental constraint reported'
    }
  };
}

function extractLocation(description: string) {
  const m = description.match(/(?:gate|corridor|block|zone|entrance|exit)\s+[A-Z0-9]+/i);
  if (m) return m[0].replace(/\b\w/g, c => c.toUpperCase());
  const n = description.match(/(?:north|south|east|west)\s+(?:gate|entrance|exit|corridor)/i);
  return n ? n[0].replace(/\b\w/g, c => c.toUpperCase()) : 'Unspecified Zone';
}
