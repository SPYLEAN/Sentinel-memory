import type { Severity } from '../types';

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
  return { type, location, severity, baselineRisk, confidence: crowd || medical || blocked ? .91 : .72 };
}

function extractLocation(description: string) {
  const m = description.match(/(?:gate|corridor|block|zone|entrance|exit)\s+[A-Z0-9]+/i);
  if (m) return m[0].replace(/\b\w/g, c => c.toUpperCase());
  const n = description.match(/(?:north|south|east|west)\s+(?:gate|entrance|exit|corridor)/i);
  return n ? n[0].replace(/\b\w/g, c => c.toUpperCase()) : 'Unspecified Zone';
}
