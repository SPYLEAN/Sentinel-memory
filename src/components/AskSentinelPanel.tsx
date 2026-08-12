import { useState } from 'react';
import { Search, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface AskSentinelPanelProps {
  busy: boolean;
  onAsk: (query: string) => Promise<any>;
}

export function AskSentinelPanel({ busy, onAsk }: AskSentinelPanelProps) {
  const [query, setQuery] = useState('Why this decision over single-gate diversion?');
  const [answerData, setAnswerData] = useState<any | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  const promptPills = [
    'Why this decision?',
    'What worked previously?',
    'Show evidence',
    'Why not Gate B?',
    'What changed?',
  ];

  async function handleQuery(q: string) {
    setQuery(q);
    const res = await onAsk(q);
    if (res) setAnswerData(res);
  }

  return (
    <div className="v2-ask-sentinel">
      <div className="v2-panel-title-bar">
        <h3>Ask SENTINEL — Operational Reasoning</h3>
      </div>

      <div className="v2-ask-body">
        {/* Quick Prompt Pills */}
        <div className="v2-prompt-pills">
          {promptPills.map((pill) => (
            <button
              key={pill}
              className="v2-pill-btn"
              onClick={() => handleQuery(pill)}
              disabled={busy}
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Input Line */}
        <div className="v2-ask-input-line">
          <input
            type="text"
            className="v2-query-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery(query)}
            placeholder="Ask Sentinel operational reasoning..."
          />
          <button
            className="v2-btn-query"
            onClick={() => handleQuery(query)}
            disabled={busy || !query.trim()}
          >
            <Search size={14} />
            <span>{busy ? 'Reasoning...' : 'Reason'}</span>
          </button>
        </div>

        {/* Structured Reasoning Output */}
        {answerData && (
          <div className="v2-reasoning-card">
            <div className="v2-reasoning-header">
              <span className="v2-synthesis-label">Sentinel Operational Synthesis</span>
              {answerData.confidence && (
                <span className="v2-conf-tag">
                  Confidence: {Math.round(answerData.confidence * 100)}%
                </span>
              )}
            </div>

            <p className="v2-answer-prose">{answerData.answer}</p>

            <button
              className="v2-btn-inspect-evidence"
              onClick={() => setShowEvidence(!showEvidence)}
            >
              <FileText size={13} />
              <span>Inspect Hindsight Evidence & Fact Sources</span>
              {showEvidence ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Expandable Technical Evidence Drawer */}
            {showEvidence && (
              <div className="v2-evidence-drawer">
                <h5 className="v2-drawer-heading">Technical Fact Inspection</h5>

                {answerData.memoryEvidence?.memories?.length > 0 ? (
                  <div className="v2-evidence-list">
                    {answerData.memoryEvidence.memories.map((m: any, idx: number) => (
                      <div key={idx} className="v2-evidence-row">
                        <div className="v2-evidence-row-header">
                          <span className="v2-fact-id">FACT #{idx + 1}</span>
                          {m.score && (
                            <span className="v2-score-tag">
                              Relevance: {(m.score * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <p className="v2-evidence-content">{m.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="v2-no-evidence">
                    Grounded on first principles and current environment constraints.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
