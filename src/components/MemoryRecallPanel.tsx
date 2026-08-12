import { CheckCircle2, ArrowRight } from 'lucide-react';
import type { IncidentAnalysis } from '../types';

interface MemoryRecallPanelProps {
  analysis: IncidentAnalysis | null;
  memoryRetained?: boolean;
  retainedContent?: string | null;
}

/** Extract just the LESSON sentence from raw operational memory text blob */
function extractLesson(raw: string | null | undefined): string {
  if (!raw) return 'Distributed exits (Gate B + Gate C) significantly outperformed single-gate diversion for post-event crowd surges.';
  const match = raw.match(/LESSON[\s\-:]+([^.]+(?:\.[^.]+){0,2}\.?)/);
  if (match) return match[1].trim();
  const whatWorked = raw.match(/What worked[:\s]+([^.]+\.?)/);
  if (whatWorked) return whatWorked[1].trim();
  if (raw.length < 200) return raw;
  return 'Distributed exits (Gate B + Gate C) significantly outperformed single-gate diversion for post-event crowd surges.';
}

export function MemoryRecallPanel({
  analysis,
  memoryRetained = false,
  retainedContent,
}: MemoryRecallPanelProps) {
  const memories = analysis?.memories ?? [];
  const hasMemories = memories.length > 0;
  const isNoMemoryState = analysis && !hasMemories && !memoryRetained;

  return (
    <div className="v2-memory-panel">
      <div className="v2-panel-title-bar">
        <h3>Hindsight Operational Memory</h3>
        <span className="v2-blue-tag">
          {hasMemories ? `${memories.length} Facts Recalled` : memoryRetained ? 'Memory Retained' : 'Connected'}
        </span>
      </div>

      <div className="v2-memory-body">
        {/* Memory Retained Moment Object */}
        {memoryRetained && (
          <div className="v2-memory-thread-card retained-glow">
            <div className="v2-thread-header">
              <span className="v2-status-pill green">
                <CheckCircle2 size={12} /> Incident Stabilized (21 Risk)
              </span>
              <span className="v2-retained-tag">Memory Retained</span>
            </div>

            <h4 className="v2-thread-title">Learned Operational Lesson</h4>
            <p className="v2-thread-lesson">{extractLesson(retainedContent)}</p>

            <span className="v2-thread-footer">RETAINED IN HINDSIGHT MEMORY BANK — PERSISTED FOR FUTURE RECALL</span>
          </div>
        )}

        {/* Day 1 No Memory State */}
        {isNoMemoryState && (
          <div className="v2-memory-thread-card no-memory">
            <span className="v2-no-mem-tag">First Principles</span>
            <h4 className="v2-thread-title">No Prior Operational Experience Found</h4>
            <p className="v2-thread-desc">
              SENTINEL has not encountered this specific surge pattern yet. Generating baseline strategies from first principles and deterministic crowd simulation.
            </p>
          </div>
        )}

        {/* Day 12 Recalled Facts Memory Thread */}
        {hasMemories && !memoryRetained && (
          <div className="v2-memory-recalled-wrapper">
            <div className="v2-past-present-link">
              <span>Past Experience (Day 1)</span>
              <ArrowRight size={13} className="link-arrow" />
              <span className="highlight">Current Decision (Day 12)</span>
            </div>

            <div className="v2-parsed-memories-list">
              {memories.map((m, idx) => (
                <div key={idx} className="v2-parsed-memory-item">
                  <div className="v2-item-meta">
                    <span className="item-num">Fact 0{idx + 1}</span>
                    {typeof m.score === 'number' && (
                      <span className="item-relevance">Relevance {(m.score * 100).toFixed(0)}%</span>
                    )}
                  </div>
                  <p className="v2-item-text">{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!analysis && !memoryRetained && (
          <div className="v2-memory-idle">
            <p>Run Day 1 or Day 12 to observe Hindsight memory recall and persistence.</p>
          </div>
        )}
      </div>
    </div>
  );
}
