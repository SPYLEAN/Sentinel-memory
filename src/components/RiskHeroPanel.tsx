import { TrendingDown } from 'lucide-react';
import type { IncidentAnalysis } from '../types';

interface RiskHeroPanelProps {
  analysis: IncidentAnalysis | null;
  lastOutcomeRisk?: number | null;
}

export function RiskHeroPanel({ analysis, lastOutcomeRisk }: RiskHeroPanelProps) {
  const currentRisk = analysis?.baselineRisk ?? 0;
  const severity = analysis?.severity ?? 'STANDBY';

  const previousRisk = analysis?.interventions?.at(-1)?.riskBefore ?? null;
  const outcomeRisk = lastOutcomeRisk ?? analysis?.interventions?.at(-1)?.riskAfter ?? null;

  const hasReduction = outcomeRisk !== null && previousRisk !== null && outcomeRisk < previousRisk;
  const delta = hasReduction ? previousRisk - outcomeRisk : 0;

  const breakdown = analysis?.riskAssessment?.breakdown ?? [
    { id: 'density', label: 'Occupancy Density', contribution: 28, explanation: 'North Plaza occupant buildup' },
    { id: 'surge', label: 'Surge Acceleration', contribution: 24, explanation: 'Post-event egress velocity' },
    { id: 'pressure', label: 'Flow Pressure', contribution: 18, explanation: 'Gate A bottleneck' },
    { id: 'capacity', label: 'Capacity Intolerance', contribution: 16, explanation: 'Concourse spillback' },
  ];

  return (
    <div className="v2-risk-telemetry">
      <div className="v2-risk-hero-box">
        <span className="v2-risk-label">Operational Risk</span>

        {!analysis ? (
          <div className="v2-hero-score standby">—</div>
        ) : outcomeRisk !== null ? (
          <div className="v2-score-transition">
            <span className="old-score">{previousRisk ?? currentRisk}</span>
            <span className="arrow">↓</span>
            <span className="new-score">{outcomeRisk}</span>
          </div>
        ) : (
          <div className={`v2-hero-score ${severity.toLowerCase()}`}>
            {currentRisk}
          </div>
        )}

        <div className="v2-severity-row">
          <span className={`v2-severity-tag ${severity.toLowerCase()}`}>{severity}</span>
          {hasReduction && (
            <span className="v2-reduction-pill">
              <TrendingDown size={12} />
              -{delta} pts ({outcomeRisk! <= 35 ? 'Strong' : 'Partial'})
            </span>
          )}
        </div>
      </div>

      <div className="v2-causality-waterfall">
        <span className="v2-waterfall-title">Why risk is elevated</span>
        <div className="v2-waterfall-list">
          {breakdown.map((item) => {
            const maxContrib = Math.max(...breakdown.map(b => b.contribution));
            const barPct = Math.round((item.contribution / maxContrib) * 100);
            return (
              <div key={item.id || item.label} className="v2-waterfall-row">
                <span className="v2-factor-name">{item.label}</span>
                <div className="v2-factor-bar-group">
                  <div className="v2-factor-bar-track">
                    <div
                      className="v2-factor-bar-fill"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className="v2-factor-val">+{item.contribution}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
