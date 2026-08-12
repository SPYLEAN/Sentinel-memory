import { CheckCircle2, Lock, Sparkles } from 'lucide-react';
import type { IncidentAnalysis } from '../types';

interface StrategyRankingPanelProps {
  analysis: IncidentAnalysis | null;
  busy: boolean;
  onResolve: (strategyId: string) => void;
  gateCUnavailable?: boolean;
}

export function StrategyRankingPanel({
  analysis,
  busy,
  onResolve,
  gateCUnavailable = false,
}: StrategyRankingPanelProps) {
  const strategies = analysis?.strategies ?? [];
  const recommendation = analysis?.recommendation;

  const isGateCClosed =
    gateCUnavailable ||
    analysis?.context?.gateConditions?.toLowerCase().includes('gate-c') ||
    analysis?.context?.gateConditions?.toLowerCase().includes('gate c');

  return (
    <div className="v2-decision-engine">
      <div className="v2-panel-title-bar">
        <h3>Recommended Response & Strategy Evaluation</h3>
        <span className="v2-blue-tag">3-Signal Convergence</span>
      </div>

      <div className="v2-decision-body">
        {/* 3-Signal Convergence Graphic */}
        <div className="v2-convergence-graphic">
          <div className="signal-node world">
            <span className="signal-label">Live Conditions</span>
            <span className="signal-val">{isGateCClosed ? 'Gate C Closed' : 'All Exits Open'}</span>
          </div>

          <div className="signal-arrow">→</div>

          <div className="signal-node memory">
            <span className="signal-label">Past Experience</span>
            <span className="signal-val">
              {analysis?.memories.length ? `${analysis.memories.length} Facts Recalled` : 'First Principles'}
            </span>
          </div>

          <div className="signal-arrow">→</div>

          <div className="signal-node simulation">
            <span className="signal-label">Simulation</span>
            <span className="signal-val">Validated</span>
          </div>

          <div className="signal-arrow">→</div>

          <div className={`signal-node decision ${isGateCClosed ? 'adapted' : 'optimal'}`}>
            <span className="signal-label">Decision</span>
            <span className="signal-val">
              {recommendation?.title || 'Distributed Routing'}
            </span>
          </div>
        </div>

        {/* Constraint Contradiction Banner when Gate C is closed */}
        {isGateCClosed && (
          <div className="v2-contradiction-banner">
            <Lock size={14} className="banner-lock" />
            <div>
              <span className="banner-heading">Historically successful. Currently unavailable.</span>
              <p className="banner-sub">
                Distributed exit routing was proven on Day 1, but Gate C closure makes it unfeasible today. SENTINEL automatically adapted to the next highest-safety strategy.
              </p>
            </div>
          </div>
        )}

        {/* Strategy Decision Stack */}
        {!analysis ? (
          <div className="v2-decision-idle">
            <p>Awaiting incident analysis telemetry...</p>
          </div>
        ) : (
          <div className="v2-decision-stack">
            {strategies.map((strategy, idx) => {
              const isBlocked = strategy.status.includes('CONSTRAINT-BLOCKED');
              const isMemoryInformed = strategy.status.includes('MEMORY-INFORMED');
              const isSimulationValidated = strategy.status.includes('SIMULATION-VALIDATED');
              const isTop = idx === 0;

              const baselineRisk = analysis.baselineRisk;
              const projectedRisk = strategy.projectedRisk;
              const delta = baselineRisk - projectedRisk;

              return (
                <div
                  key={strategy.id}
                  className={`v2-strategy-card ${isTop ? 'top-recommendation' : ''} ${isBlocked ? 'blocked' : ''}`}
                >
                  <div className="card-header">
                    <div className="rank-badge">0{idx + 1}</div>
                    <div className="title-block">
                      <h4 className={`title-text ${isBlocked ? 'strikethrough' : ''}`}>
                        {strategy.title}
                      </h4>
                      <p className="strategy-sub">{strategy.description}</p>
                    </div>

                    <div className="risk-projection">
                      <span className="proj-lbl">Risk</span>
                      <span className={`proj-val ${isBlocked ? 'blocked-val' : projValClass(projectedRisk)}`}>
                        {projectedRisk}
                      </span>
                      {!isBlocked && delta > 0 && (
                        <span className="proj-delta">-{delta} pts</span>
                      )}
                    </div>
                  </div>

                  {/* Signals for Top Strategy */}
                  {isTop && (
                    <div className="card-signals">
                      <div className="signal-row">
                        <span className="signal-row-label">Historical evidence</span>
                        <span className={`signal-row-val ${analysis.memories.length > 0 ? 'strong' : 'none'}`}>
                          {analysis.memories.length > 0 ? 'Strong support (+1)' : 'None'}
                        </span>
                      </div>
                      <div className="signal-row">
                        <span className="signal-row-label">Current simulation</span>
                        <span className="signal-row-val validated">Validated</span>
                      </div>
                      <div className="signal-row">
                        <span className="signal-row-label">Constraints</span>
                        <span className={`signal-row-val ${isGateCClosed ? 'partial' : 'clear'}`}>
                          {isGateCClosed ? 'Adapted (Gate C closed)' : 'Clear'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Badges / Status */}
                  <div className="card-why-row">
                    {isMemoryInformed && !isTop && (
                      <span className="v2-cert-badge memory">
                        <Sparkles size={10} /> Memory-Informed
                      </span>
                    )}

                    {isSimulationValidated && !isTop && (
                      <span className="v2-cert-badge simulation">
                        <CheckCircle2 size={10} /> Simulation-Validated
                      </span>
                    )}

                    {isBlocked && (
                      <span className="v2-cert-badge constraint">
                        <Lock size={10} /> Constraint-Blocked (Gate C)
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="card-actions-bar">
                    <div className="score-pills">
                      <span>Confidence: {Math.round(strategy.confidence * 100)}%</span>
                    </div>

                    {!isBlocked && (
                      <button
                        className="v2-btn-execute"
                        onClick={() => onResolve(strategy.id)}
                        disabled={busy}
                      >
                        Execute Strategy
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function projValClass(score: number): string {
  return score <= 35 ? 'low' : score <= 55 ? 'moderate' : 'critical';
}

