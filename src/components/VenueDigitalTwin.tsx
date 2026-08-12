import { useState, useMemo } from 'react';
import { Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { IncidentAnalysis } from '../types';

interface VenueDigitalTwinProps {
  analysis: IncidentAnalysis | null;
  gateCUnavailable?: boolean;
  activeStrategyId?: string;
  onToggleGateC?: (unavailable: boolean) => void;
}

export function VenueDigitalTwin({
  analysis,
  gateCUnavailable = false,
  activeStrategyId,
  onToggleGateC,
}: VenueDigitalTwinProps) {
  const [showGateCPopover, setShowGateCPopover] = useState(false);

  const isIncidentActive = !!analysis;
  const isCritical = analysis?.severity === 'CRITICAL';

  const isGateCClosed =
    gateCUnavailable ||
    analysis?.context?.gateConditions?.toLowerCase().includes('gate-c') ||
    analysis?.context?.gateConditions?.toLowerCase().includes('gate c');

  const currentStrategy =
    activeStrategyId ||
    analysis?.recommendation?.id ||
    analysis?.recommendation?.simulationStrategyId ||
    'distributed-routing';

  const isDistributed = currentStrategy.includes('distributed') || currentStrategy.includes('DISTRIBUTED');
  const isSingleDiversion = currentStrategy.includes('single') || currentStrategy.includes('SINGLE');
  const isInflowHold = currentStrategy.includes('inflow') || currentStrategy.includes('INFLOW');

  // Crowd spatial pressure particles
  const particles = useMemo(() => {
    const list = [];
    const count = isIncidentActive ? 28 : 14;
    for (let i = 0; i < count; i++) {
      const isHot = isIncidentActive && i < 18;
      const angle = (i / count) * Math.PI * 2;
      const r = isHot ? 20 + ((i * 7) % 25) : 35 + ((i * 9) % 35);
      const cx = 220 + Math.cos(angle) * r;
      const cy = 200 + Math.sin(angle) * r;
      list.push({ id: i, cx, cy, isHot });
    }
    return list;
  }, [isIncidentActive]);

  return (
    <div className="v2-operations-canvas">
      <div className="v2-canvas-header">
        <div className="v2-canvas-title">
          <span className="v2-live-indicator" />
          <h2>Spatial Egress Field</h2>
        </div>
        <span className="v2-zone-tag">North Event Complex</span>
      </div>

      <div className="v2-spatial-field-container">
        <svg className="v2-spatial-svg" viewBox="0 0 800 420" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Spatial Heatmap Radial Gradient */}
            <radialGradient id="v2SurgeField" cx="28%" cy="48%" r="40%">
              <stop offset="0%" stopColor={isCritical ? '#ff4d4d' : '#f59e0b'} stopOpacity="0.4" />
              <stop offset="60%" stopColor={isCritical ? '#ff4d4d' : '#f59e0b'} stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            {/* Active Flow Gradient */}
            <linearGradient id="v2FlowActive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="v2FlowBlocked" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff4d4d" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Architectural Spatial Zones (Clean Contour Geometry) */}
          {/* Main Concourse Zone */}
          <path
            d="M 180 80 Q 400 60 620 80 L 620 340 Q 400 360 180 340 Z"
            fill="#0f141c"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          <text x="400" y="105" className="v2-svg-zone-text">MAIN CONCOURSE</text>

          {/* North Plaza Surge Field Contour */}
          <path
            d="M 180 120 Q 90 200 180 300 Z"
            fill={isIncidentActive ? 'url(#v2SurgeField)' : '#131924'}
            stroke={isIncidentActive ? '#ff4d4d' : '#1e293b'}
            strokeWidth="1.5"
            strokeDasharray={isIncidentActive ? 'none' : '4 4'}
          />
          <text x="135" y="210" className="v2-svg-zone-text vertical">NORTH PLAZA</text>

          {/* East / West Egress Corridors */}
          <path d="M 620 110 L 730 110 L 730 160 L 620 160 Z" fill="#131924" stroke="#1e293b" strokeWidth="1" />
          <path d="M 620 260 L 730 260 L 730 310 L 620 310 Z" fill="#131924" stroke="#1e293b" strokeWidth="1" />

          {/* Flow Vectors */}
          {/* Vector 1: Gate A -> Gate B */}
          <path
            d="M 220 200 Q 420 135 640 135"
            fill="none"
            stroke={isSingleDiversion || isDistributed ? 'url(#v2FlowActive)' : '#1e293b'}
            strokeWidth={isSingleDiversion || isDistributed ? '3' : '1.5'}
            strokeDasharray={isSingleDiversion || isDistributed ? 'none' : '4 4'}
          />

          {/* Vector 2: Gate A -> Gate C */}
          <path
            d="M 220 200 Q 420 285 640 285"
            fill="none"
            stroke={isGateCClosed ? 'url(#v2FlowBlocked)' : isDistributed ? 'url(#v2FlowActive)' : '#1e293b'}
            strokeWidth={isGateCClosed || isDistributed ? '3' : '1.5'}
            strokeDasharray={isGateCClosed ? '6 4' : isDistributed ? 'none' : '4 4'}
          />

          {/* Vector 3: Inflow Hold Barrier Line */}
          {isInflowHold && (
            <line x1="270" y1="120" x2="270" y2="300" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4 4" />
          )}

          {/* Spatial Crowd Dots */}
          {particles.map((p) => (
            <circle
              key={p.id}
              cx={p.cx}
              cy={p.cy}
              r={p.isHot ? '4' : '2.5'}
              fill={p.isHot ? '#ff4d4d' : '#64748b'}
              opacity={p.isHot ? '0.9' : '0.5'}
            />
          ))}

          {/* Gate Anchors */}
          {/* Gate A Anchor */}
          <g transform="translate(180, 200)" className="v2-gate-anchor">
            <circle r="14" fill={isIncidentActive ? '#311212' : '#0f172a'} stroke={isIncidentActive ? '#ff4d4d' : '#334155'} strokeWidth="2" />
            <text x="0" y="4" className="v2-gate-code">A</text>
            <text x="0" y="28" className="v2-gate-name">Gate A (Surge Origin)</text>
          </g>

          {/* Gate B Anchor */}
          <g transform="translate(640, 135)" className="v2-gate-anchor">
            <circle r="14" fill="#062c1e" stroke="#10b981" strokeWidth="2" />
            <text x="0" y="4" className="v2-gate-code">B</text>
            <text x="0" y="28" className="v2-gate-name">Gate B (Open)</text>
          </g>

          {/* Gate C Anchor (Clickable Direct Spatial Control) */}
          <g
            transform="translate(640, 285)"
            className="v2-gate-anchor clickable"
            onClick={() => setShowGateCPopover(!showGateCPopover)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              r="16"
              fill={isGateCClosed ? '#3b1212' : '#062c1e'}
              stroke={isGateCClosed ? '#ff4d4d' : '#10b981'}
              strokeWidth="2.5"
            />
            <text x="0" y="4" className="v2-gate-code">C</text>

            <text x="0" y="30" className={`v2-gate-name ${isGateCClosed ? 'closed' : ''}`}>
              Gate C {isGateCClosed ? '(Closed)' : '(Available)'}
            </text>
          </g>
        </svg>

        {/* Spatial Gate C Interactive Contextual Popover */}
        {showGateCPopover && (
          <div className="v2-spatial-gate-popover">
            <div className="popover-header">
              <span className="popover-title">Gate C Control</span>
              <button className="popover-close" onClick={() => setShowGateCPopover(false)}>✕</button>
            </div>
            <p className="popover-status">
              Status: <strong>{isGateCClosed ? 'UNAVAILABLE (CLOSED)' : 'AVAILABLE (OPEN)'}</strong>
            </p>
            {onToggleGateC && (
              <button
                className={`popover-action-btn ${isGateCClosed ? 'open-btn' : 'close-btn'}`}
                onClick={() => {
                  onToggleGateC(!isGateCClosed);
                  setShowGateCPopover(false);
                }}
              >
                {isGateCClosed ? 'Set Gate C Available' : 'Set Gate C Unavailable (Close)'}
              </button>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="v2-canvas-legend">
          <span className="legend-item"><span className="dot red" /> Incident Surge Field</span>
          <span className="legend-item"><span className="dot blue" /> Active Egress Stream</span>
          <span className="legend-item"><span className="dot green" /> Open Gate</span>
          <span className="legend-item"><span className="dot closed-red" /> Closed Constraint Gate</span>
        </div>
      </div>
    </div>
  );
}
