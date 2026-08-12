import { SentinelLogo } from './SentinelLogo';
import type { DashboardState } from '../types';

interface HeaderProps {
  state: DashboardState | null;
  activeView: 'command' | 'memory';
  onSelectView: (view: 'command' | 'memory') => void;
}

export function Header({ state, activeView, onSelectView }: HeaderProps) {
  const isHindsight = state?.memoryMode === 'hindsight';
  const isConnected = state?.memoryConnected ?? false;

  return (
    <header className="v2-topbar">
      <div className="v2-brand">
        <SentinelLogo size={24} className="v2-logo-icon" />
        <div className="v2-brand-text">
          <span className="v2-title">SENTINEL</span>
          <span className="v2-subtitle">Memory-native physical operations</span>
        </div>
      </div>

      <div className="v2-venue">
        <span className="v2-venue-name">North Event Complex</span>
      </div>

      <div className="v2-status-group">
        <div className="v2-status-pill">
          <span className={`v2-dot ${isHindsight && isConnected ? 'ice-blue' : 'amber'}`} />
          <span className="v2-status-text">
            Hindsight {isHindsight ? (isConnected ? 'Connected' : 'Disconnected') : 'Demo'}
          </span>
        </div>

        <div className="v2-status-pill">
          <span className="v2-dot green" />
          <span className="v2-status-text">Live</span>
        </div>
      </div>

      <nav className="v2-nav">
        <button
          className={`v2-nav-btn ${activeView === 'command' ? 'active' : ''}`}
          onClick={() => onSelectView('command')}
        >
          Operations Canvas
        </button>
        <button
          className={`v2-nav-btn ${activeView === 'memory' ? 'active' : ''}`}
          onClick={() => onSelectView('memory')}
        >
          Memory Timeline
          {state && state.incidentsRemembered > 0 && (
            <span className="v2-memory-count">{state.incidentsRemembered}</span>
          )}
        </button>
      </nav>
    </header>
  );
}
