import { useEffect, useState } from 'react';
import { api } from './lib/api';
import type { DashboardState, IncidentAnalysis } from './types';
import { OpeningSequence } from './components/OpeningSequence';
import { Header } from './components/Header';
import { JudgeDemoBar } from './components/JudgeDemoBar';
import { VenueDigitalTwin } from './components/VenueDigitalTwin';
import { RiskHeroPanel } from './components/RiskHeroPanel';
import { IncidentCommandPanel } from './components/IncidentCommandPanel';
import { MemoryRecallPanel } from './components/MemoryRecallPanel';
import { StrategyRankingPanel } from './components/StrategyRankingPanel';
import { AskSentinelPanel } from './components/AskSentinelPanel';
import { OperationalMemoryView } from './components/OperationalMemoryView';

const defaultIncident = 'Heavy crowd buildup at Gate A after the concert ended. People are pushing toward the exit and movement is slowing.';

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [activeView, setActiveView] = useState<'command' | 'memory'>('command');
  const [state, setState] = useState<DashboardState | null>(null);
  const [description, setDescription] = useState(defaultIncident);
  const [analysis, setAnalysis] = useState<IncidentAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [judgeSession, setJudgeSession] = useState('');
  const [currentDemoStep, setCurrentDemoStep] = useState<'reset' | 'day1' | 'day12' | 'gateC'>('reset');
  const [gateCUnavailable, setGateCUnavailable] = useState(false);
  const [memoryRetained, setMemoryRetained] = useState(false);
  const [retainedContent, setRetainedContent] = useState<string | null>(null);
  const [lastOutcomeRisk, setLastOutcomeRisk] = useState<number | null>(null);

  const refreshState = () =>
    api.state().then(setState).catch((err) => showToast(err.message));

  useEffect(() => {
    refreshState();
    // Auto initialize Judge session for immediate readiness
    api.judgeReset()
      .then((res) => {
        setJudgeSession(res.sessionId);
      })
      .catch(() => {});
  }, []);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  }

  async function handleResetJudge() {
    setBusy(true);
    setAnalysis(null);
    setGateCUnavailable(false);
    setMemoryRetained(false);
    setRetainedContent(null);
    setLastOutcomeRisk(null);
    setDescription(defaultIncident);
    setCurrentDemoStep('reset');

    try {
      const res = await api.judgeReset();
      setJudgeSession(res.sessionId);
      await refreshState();
      showToast('Judge mode reset. Day 1 is ready.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Judge reset failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRunDayOne() {
    if (!judgeSession) return;
    setBusy(true);
    setGateCUnavailable(false);
    setMemoryRetained(false);
    setLastOutcomeRisk(null);

    try {
      const res = await api.judgeIncidentOne(judgeSession);
      setAnalysis(res.incident);
      setDescription(res.incident.description);
      setMemoryRetained(true);
      setRetainedContent(res.retainedMemory || null);
      setLastOutcomeRisk(21);
      setCurrentDemoStep('day1');
      await refreshState();
      showToast('Day 1 complete. MEMORY RETAINED in Hindsight operational memory.');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Day 1 scenario failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRunDayTwo(isGateCClosed = false) {
    if (!judgeSession) return;
    setBusy(true);
    setMemoryRetained(false);
    setGateCUnavailable(isGateCClosed);
    setLastOutcomeRisk(null);

    try {
      const res = await api.judgeIncidentTwo(judgeSession, isGateCClosed);
      setAnalysis(res.incident);
      setDescription(res.incident.description);
      setCurrentDemoStep(isGateCClosed ? 'gateC' : 'day12');
      showToast(
        isGateCClosed
          ? `Constraint proof: Gate C closed. Strategy updated to ${res.recommendation.title}.`
          : `Day 12: ${res.memoryFound} memories recalled from Hindsight.`
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Day 12 scenario failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleAnalyze() {
    setBusy(true);
    setMemoryRetained(false);
    setLastOutcomeRisk(null);

    try {
      const res = await api.analyze(description);
      setAnalysis(res);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Incident analysis failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleResolveStrategy(strategyId: string) {
    if (!analysis) return;
    setBusy(true);

    try {
      const res = await api.resolve(analysis.id, strategyId);
      setAnalysis(res.incident);
      setLastOutcomeRisk(res.outcomeRisk);
      if (res.memoryCreated) {
        setMemoryRetained(true);
        setRetainedContent(res.memoryRecord || null);
      }
      await refreshState();
      showToast(`Strategy executed. Risk ${analysis.baselineRisk} → ${res.outcomeRisk}.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Resolution failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleAsk(query: string) {
    setBusy(true);
    try {
      return await api.ask(query);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ask SENTINEL failed');
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sentinel-app-shell">
      {/* Short Boot Sequence */}
      {showIntro && <OpeningSequence onComplete={() => setShowIntro(false)} />}

      {/* Top System Header Bar */}
      <Header
        state={state}
        activeView={activeView}
        onSelectView={setActiveView}
      />

      {/* Toast Notification */}
      {toastMessage && <div className="toast-banner">{toastMessage}</div>}

      {activeView === 'command' ? (
        <main className="command-center-grid">
          {/* Integrated Judge Demo Bar */}
          <JudgeDemoBar
            busy={busy}
            judgeSession={judgeSession}
            currentStep={currentDemoStep}
            onReset={handleResetJudge}
            onRunDayOne={handleRunDayOne}
            onRunDayTwo={handleRunDayTwo}
          />

          {/* First Viewport Hero Composition */}
          <div className="hero-viewport-grid">
            {/* Primary Visual: Live Environment Digital Twin */}
            <VenueDigitalTwin
              analysis={analysis}
              gateCUnavailable={gateCUnavailable}
              activeStrategyId={analysis?.recommendation?.id}
            />

            {/* Hero Metric: Explainable Risk Telemetry */}
            <RiskHeroPanel
              analysis={analysis}
              lastOutcomeRisk={lastOutcomeRisk}
            />
          </div>

          {/* Secondary Viewport Grid */}
          <div className="secondary-grid">
            {/* Incident Telemetry & Classification */}
            <IncidentCommandPanel
              description={description}
              onChangeDescription={setDescription}
              analysis={analysis}
              busy={busy}
              onAnalyze={handleAnalyze}
            />

            {/* Hindsight Operational Memory Recall & Retention */}
            <MemoryRecallPanel
              analysis={analysis}
              memoryRetained={memoryRetained}
              retainedContent={retainedContent}
            />
          </div>

          {/* Strategy Intelligence & Ranking */}
          <StrategyRankingPanel
            analysis={analysis}
            busy={busy}
            onResolve={handleResolveStrategy}
            gateCUnavailable={gateCUnavailable}
          />

          {/* Ask SENTINEL Reasoning & Evidence Drawer */}
          <AskSentinelPanel
            busy={busy}
            onAsk={handleAsk}
          />
        </main>
      ) : (
        /* View 2: Operational Memory Explorer */
        <OperationalMemoryView
          state={state}
          analysis={analysis}
          retainedContent={retainedContent}
        />
      )}
    </div>
  );
}
