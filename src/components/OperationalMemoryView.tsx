import { BrainCircuit, Database, ShieldCheck, Activity } from 'lucide-react';
import type { DashboardState, IncidentAnalysis } from '../types';

interface OperationalMemoryViewProps {
  state: DashboardState | null;
  analysis: IncidentAnalysis | null;
  retainedContent?: string | null;
}

/** Extract the LESSON sentence from the raw operational memory text blob */
function extractLesson(raw: string | null | undefined): string {
  if (!raw) return 'Distributed exits (Gate B + Gate C) significantly outperformed single-gate diversion for post-event crowd surges at North Plaza.';
  // Try to find "LESSON - <text>" or "LESSON: <text>" patterns
  const match = raw.match(/LESSON[\s\-:]+([^.]+(?:\.[^.]+){0,2}\.?)/);
  if (match) return match[1].trim();
  // Fallback: try to find "What worked:" pattern
  const whatWorked = raw.match(/What worked[:\s]+([^.]+\.?)/);
  if (whatWorked) return whatWorked[1].trim();
  // If raw is short enough, display it; otherwise use default
  if (raw.length < 200) return raw;
  return 'Distributed exits (Gate B + Gate C) significantly outperformed single-gate diversion for post-event crowd surges at North Plaza.';
}

export function OperationalMemoryView({
  state,
  retainedContent,
}: OperationalMemoryViewProps) {
  return (
    <div className="v2-memory-view-container">
      {/* Top Telemetry Row */}
      <div className="v2-memory-stats">
        <div className="v2-stat-card">
          <BrainCircuit size={22} className="v2-stat-icon ice-blue" />
          <div>
            <span className="v2-stat-lbl">Incidents Remembered</span>
            <span className="v2-stat-num">{state?.incidentsRemembered ?? 0}</span>
          </div>
        </div>

        <div className="v2-stat-card">
          <Activity size={22} className="v2-stat-icon green" />
          <div>
            <span className="v2-stat-lbl">Responses Observed</span>
            <span className="v2-stat-num">{state?.responsesObserved ?? 0}</span>
          </div>
        </div>

        <div className="v2-stat-card">
          <ShieldCheck size={22} className="v2-stat-icon amber" />
          <div>
            <span className="v2-stat-lbl">Patterns Learned</span>
            <span className="v2-stat-num">{state?.patternsLearned ?? 0}</span>
          </div>
        </div>

        <div className="v2-stat-card">
          <Database size={22} className="v2-stat-icon purple" />
          <div>
            <span className="v2-stat-lbl">Hindsight Bank ID</span>
            <span className="v2-stat-num mono">{state?.bankId ?? 'sentinel-ops-v1'}</span>
          </div>
        </div>
      </div>

      {/* Memory Timeline & Knowledge Base */}
      <div className="v2-memory-timeline-block">
        <div className="v2-block-title-bar">
          <h3>Operational Memory & Experience Timeline</h3>
          <span className="v2-blue-tag">Persistent Memory</span>
        </div>

        <div className="v2-timeline-entries">
          {/* Day 1 Entry */}
          <div className="v2-timeline-entry">
            <div className="v2-entry-badge-row">
              <span className="v2-day-pill">Day 1</span>
              <span className="v2-scenario-pill">Concert Exit Surge</span>
              <span className="v2-result-pill success">Stabilized (21 Risk)</span>
            </div>

            <h4 className="v2-entry-title">Gate A Outbound Buildup & Multi-Exit Rerouting</h4>

            <div className="v2-entry-actions-summary">
              <div className="v2-action-step">
                <span className="step-tag">Action 01</span>
                <span>Gate B Diversion only → Partial improvement (86 → 52 risk)</span>
              </div>
              <div className="v2-action-step highlight">
                <span className="step-tag">Action 02</span>
                <span>Distributed Gate B + Gate C → Strong improvement (52 → 21 risk)</span>
              </div>
            </div>

            <div className="v2-retained-lesson-box">
              <span className="lesson-tag">Retained Operational Lesson</span>
              <p className="lesson-body">{extractLesson(retainedContent)}</p>
            </div>
          </div>

          {/* Day 12 Entry */}
          <div className="v2-timeline-entry">
            <div className="v2-entry-badge-row">
              <span className="v2-day-pill">Day 12</span>
              <span className="v2-scenario-pill">Football Match Exit Surge</span>
              <span className="v2-result-pill recall">Recalled Day 1 Memory</span>
            </div>

            <h4 className="v2-entry-title">North Gate Surge & Memory-Informed Strategy Promotion</h4>
            <p className="v2-entry-desc">
              When football match exit surge triggered high baseline risk (93 CRITICAL), SENTINEL recalled Day 1 experience, automatically promoting Distributed Exit Routing to #1 recommendation.
            </p>
          </div>

          {/* Constraint Adaptation Entry */}
          <div className="v2-timeline-entry constraint">
            <div className="v2-entry-badge-row">
              <span className="v2-day-pill">Constraint Proof</span>
              <span className="v2-scenario-pill">Gate C Closed</span>
              <span className="v2-result-pill adapted">Constraint Adaptation</span>
            </div>

            <h4 className="v2-entry-title">Memory vs Reality: Constraint Re-Evaluation</h4>
            <p className="v2-entry-desc">
              When Gate C was marked unavailable, SENTINEL immediately demoted the historically optimal strategy (`CONSTRAINT-BLOCKED`) and promoted `TEMPORARY INFLOW HOLD` to maintain safety.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
