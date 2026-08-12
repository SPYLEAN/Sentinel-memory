import { Play, MapPin } from 'lucide-react';
import type { IncidentAnalysis } from '../types';

interface IncidentCommandPanelProps {
  description: string;
  onChangeDescription: (desc: string) => void;
  analysis: IncidentAnalysis | null;
  busy: boolean;
  onAnalyze: () => void;
}

export function IncidentCommandPanel({
  description,
  onChangeDescription,
  analysis,
  busy,
  onAnalyze,
}: IncidentCommandPanelProps) {
  return (
    <div className="v2-incident-composer">
      <div className="v2-composer-header">
        <span className="v2-composer-title">Active Incident State</span>
        {analysis && <span className="v2-active-badge">{analysis.type}</span>}
      </div>

      <div className="v2-composer-body">
        <div className="v2-incident-input-group">
          <textarea
            className="v2-incident-textarea"
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder="Physical incident description..."
            rows={2}
          />
          <button
            className="v2-btn-analyze"
            onClick={onAnalyze}
            disabled={busy || !description.trim()}
          >
            <Play size={14} />
            <span>{busy ? 'Simulating...' : 'Analyze & Recall'}</span>
          </button>
        </div>

        {analysis && (
          <div className="v2-incident-meta-strip">
            <div className="v2-meta-cell">
              <span className="meta-lbl">LOCATION</span>
              <span className="meta-val">
                <MapPin size={11} className="inline-icon" /> {analysis.location}
              </span>
            </div>
            <div className="v2-meta-cell">
              <span className="meta-lbl">CONFIDENCE</span>
              <span className="meta-val">{Math.round(analysis.confidence * 100)}%</span>
            </div>
            <div className="v2-meta-cell">
              <span className="meta-lbl">BASELINE RISK</span>
              <span className="meta-val">{analysis.baselineRisk} / 100</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
