import { useEffect, useState } from 'react';
import { BrainCircuit, ShieldAlert, Cpu, CheckCircle2 } from 'lucide-react';

interface OpeningSequenceProps {
  onComplete: () => void;
}

export function OpeningSequence({ onComplete }: OpeningSequenceProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 300);
    const t2 = setTimeout(() => setStep(2), 700);
    const t3 = setTimeout(() => setStep(3), 1100);
    const t4 = setTimeout(() => {
      setStep(4);
      setTimeout(onComplete, 400);
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className={`opening-overlay ${step === 4 ? 'fade-out' : ''}`} onClick={onComplete}>
      <div className="opening-card">
        <div className="opening-header">
          <div className="opening-logo">
            <BrainCircuit size={28} className="logo-icon pulse-glow" />
            <div>
              <h1 className="opening-title">SENTINEL</h1>
              <p className="opening-subtitle">MEMORY-NATIVE PHYSICAL OPERATIONS INTELLIGENCE</p>
            </div>
          </div>
        </div>

        <div className="opening-statuses">
          <div className={`status-line ${step >= 1 ? 'visible' : ''}`}>
            <span className="status-label">
              <Cpu size={14} /> HINDSIGHT MEMORY
            </span>
            <span className="status-badge connected">
              <CheckCircle2 size={12} /> CONNECTED
            </span>
          </div>

          <div className={`status-line ${step >= 2 ? 'visible' : ''}`}>
            <span className="status-label">
              <ShieldAlert size={14} /> SIMULATION ENGINE
            </span>
            <span className="status-badge ready">
              <CheckCircle2 size={12} /> READY
            </span>
          </div>

          <div className={`status-line ${step >= 3 ? 'visible' : ''}`}>
            <span className="status-label">
              <BrainCircuit size={14} /> ENVIRONMENT MODEL
            </span>
            <span className="status-badge active">
              <CheckCircle2 size={12} /> ACTIVE
            </span>
          </div>
        </div>

        <div className="opening-footer">
          <span className="skip-hint">CLICK ANYWHERE TO SKIP INTRO</span>
        </div>
      </div>
    </div>
  );
}
