import { Play, RotateCcw, ArrowRight } from 'lucide-react';

interface JudgeDemoBarProps {
  busy: boolean;
  judgeSession: string;
  currentStep: 'reset' | 'day1' | 'day12' | 'gateC';
  onReset: () => void;
  onRunDayOne: () => void;
  onRunDayTwo: (gateCUnavailable: boolean) => void;
}

export function JudgeDemoBar({
  busy,
  judgeSession,
  currentStep,
  onReset,
  onRunDayOne,
  onRunDayTwo,
}: JudgeDemoBarProps) {
  // Contextual primary button handler & label
  let primaryAction = onRunDayOne;
  let primaryLabel = 'START DAY 1';
  let primaryDesc = 'Simulate post-concert surge with no prior memory';

  if (currentStep === 'day1') {
    primaryAction = () => onRunDayTwo(false);
    primaryLabel = 'CONTINUE TO DAY 12';
    primaryDesc = 'Simulate football surge 12 days later (Recalls Day 1 memory)';
  } else if (currentStep === 'day12') {
    primaryAction = () => onRunDayTwo(true);
    primaryLabel = 'INTRODUCE CONSTRAINT';
    primaryDesc = 'Mark Gate C unavailable & test memory adaptation';
  } else if (currentStep === 'gateC') {
    primaryAction = onReset;
    primaryLabel = 'RESET DEMO';
    primaryDesc = 'Reset demonstration state back to Day 1';
  }

  return (
    <div className="v2-story-spine">
      <div className="v2-spine-track">
        <div className={`v2-spine-node ${currentStep === 'day1' ? 'active' : currentStep === 'day12' || currentStep === 'gateC' ? 'completed' : ''}`}>
          <span className="node-num">01</span>
          <div className="node-text">
            <span className="node-title">Learn</span>
            <span className="node-sub">Day 1</span>
          </div>
        </div>

        <div className="node-connector" />

        <div className={`v2-spine-node ${currentStep === 'day12' ? 'active' : currentStep === 'gateC' ? 'completed' : ''}`}>
          <span className="node-num">02</span>
          <div className="node-text">
            <span className="node-title">Recall</span>
            <span className="node-sub">Day 12</span>
          </div>
        </div>

        <div className="node-connector" />

        <div className={`v2-spine-node ${currentStep === 'gateC' ? 'active' : ''}`}>
          <span className="node-num">03</span>
          <div className="node-text">
            <span className="node-title">Adapt</span>
            <span className="node-sub">Constraint</span>
          </div>
        </div>
      </div>

      <div className="v2-spine-actions">
        <div className="cta-wrapper">
          <button
            className="v2-primary-cta"
            onClick={primaryAction}
            disabled={busy || !judgeSession}
          >
            <span>{primaryLabel}</span>
            <ArrowRight size={14} />
          </button>
          <span className="cta-desc">{primaryDesc}</span>
        </div>

        {currentStep !== 'reset' && (
          <button
            className="v2-secondary-btn"
            onClick={onReset}
            disabled={busy}
            title="Reset demo back to initial state"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
