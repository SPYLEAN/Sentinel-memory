import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, BrainCircuit, CircleDot, Database, Play, Radar, ShieldAlert, Sparkles } from 'lucide-react';
import { api } from './lib/api';
import type { DashboardState, IncidentAnalysis } from './types';

const demoIncident = 'Heavy crowd buildup at Gate A after the concert ended. People are pushing toward the exit and movement is slowing.';

export default function App() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [description, setDescription] = useState(demoIncident);
  const [analysis, setAnalysis] = useState<IncidentAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [ask, setAsk] = useState('What worked during similar crowd surges?');
  const [answer, setAnswer] = useState('');

  const refresh = () => api.state().then(setState).catch((e) => setMessage(e.message));
  useEffect(() => { refresh(); }, []);

  const severityClass = useMemo(() => analysis?.severity.toLowerCase() ?? 'moderate', [analysis]);

  async function runAnalysis() {
    setBusy(true); setMessage(''); setAnswer('');
    try { setAnalysis(await api.analyze(description)); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Analysis failed'); }
    finally { setBusy(false); }
  }

  async function seedMemory() {
    setBusy(true); setMessage('');
    try {
      const result = await api.seed();
      setMessage(`Seeded ${result.retained} operational memories.`);
      await refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Seed failed'); }
    finally { setBusy(false); }
  }

  async function resolve(strategyId: string) {
    if (!analysis) return;
    setBusy(true); setMessage('');
    try {
      const result = await api.resolve(analysis.id, strategyId);
      setAnalysis(result.incident);
      setMessage(`Incident resolved. Risk ${analysis.baselineRisk} → ${result.outcomeRisk}. MEMORY RETAINED.`);
      await refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Resolution failed'); }
    finally { setBusy(false); }
  }

  async function askSentinel() {
    setBusy(true);
    try {
      const result = await api.ask(ask);
      setAnswer(result.answer);
    } catch (e) { setAnswer(e instanceof Error ? e.message : 'Ask failed'); }
    finally { setBusy(false); }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><Radar size={22}/><span>SENTINEL</span><em>MEMORY</em></div>
        <div className="status"><span className="pulse"/> HINDSIGHT {state?.memoryMode === 'hindsight' ? (state.memoryConnected ? 'CONNECTED' : 'ERROR') : 'DEMO MODE'}</div>
      </header>

      <section className="hero-strip">
        <div><p className="eyebrow">MEMORY-NATIVE PHYSICAL OPERATIONS</p><h1>The operations agent that remembers what worked.</h1></div>
        <button className="ghost" onClick={seedMemory} disabled={busy}><Database size={16}/> Seed demo memory</button>
      </section>

      <section className="metrics">
        <Metric icon={<BrainCircuit/>} label="Incidents remembered" value={state?.incidentsRemembered ?? 0}/>
        <Metric icon={<Activity/>} label="Responses observed" value={state?.responsesObserved ?? 0}/>
        <Metric icon={<Sparkles/>} label="Patterns learned" value={state?.patternsLearned ?? 0}/>
        <Metric icon={<CircleDot/>} label="Memory bank" value={state?.bankId ?? '—'} compact/>
      </section>

      <section className="grid">
        <div className="panel twin">
          <PanelTitle icon={<Radar size={17}/>} title="LIVE ENVIRONMENT" meta="VENUE / ALPHA" />
          <div className="map">
            <div className="route r1"/><div className="route r2"/><div className="route r3"/>
            <Gate name="GATE A" x="18%" y="35%" hot={!!analysis}/>
            <Gate name="GATE B" x="72%" y="25%" />
            <Gate name="GATE C" x="67%" y="72%" />
            {Array.from({length: 42}).map((_, i) => <i key={i} className={`person ${analysis && i < 20 ? 'hot' : ''}`} style={{left:`${12 + ((i*17)%70)}%`, top:`${18 + ((i*31)%66)}%`}}/>)}
            <div className="map-label">DIGITAL TWIN / SIMULATION FIELD</div>
          </div>
        </div>

        <div className="panel memory">
          <PanelTitle icon={<BrainCircuit size={17}/>} title="MEMORY RECALL" meta={`${analysis?.memories.length ?? 0} MATCHES`} />
          {!analysis ? <Empty text="Analyze an incident to recall operational experience."/> : analysis.memories.length === 0 ? <Empty text="No relevant incident memory found. SENTINEL is operating from first principles."/> : (
            <div className="memory-list">
              {analysis.memories.slice(0,4).map((m, i) => <article key={i}><small>{m.type || 'experience'} / #{String(i+1).padStart(2,'0')}{typeof m.score === 'number' ? ` / relevance ${m.score.toFixed(3)}` : ''}{m.evidence?.id ? ` / source ${m.evidence.id.slice(0,8)}` : ''}</small><p>{m.text}</p></article>)}
            </div>
          )}
        </div>

        <div className="panel command">
          <PanelTitle icon={<ShieldAlert size={17}/>} title="INCIDENT COMMAND" meta={analysis ? analysis.severity : 'STANDBY'} />
          <textarea value={description} onChange={(e)=>setDescription(e.target.value)} />
          <button className="primary" onClick={runAnalysis} disabled={busy || !description.trim()}><Play size={16}/>{busy ? 'Processing...' : 'Analyze + Recall'}</button>
          {analysis && <div className="analysis-strip">
            <span><b>TYPE</b>{analysis.type}</span><span><b>LOCATION</b>{analysis.location}</span>
            <span><b>CONFIDENCE</b>{Math.round(analysis.confidence*100)}%</span><span className={`risk ${severityClass}`}><b>RISK</b>{analysis.baselineRisk}/100</span>
          </div>}
        </div>

        <div className="panel strategies">
          <PanelTitle icon={<Activity size={17}/>} title="RESPONSE STRATEGIES" meta="SIMULATED" />
          {!analysis ? <Empty text="Strategies will appear after incident analysis."/> : <div className="strategy-list">
            {analysis.strategies.map((s, i)=><button key={s.id} className="strategy" onClick={()=>resolve(s.id)} disabled={busy}>
              <span className="num">0{i+1}</span><span className="strategy-copy"><b>{s.title}</b><small>{s.description}</small><small>BASE {Math.round(s.memoryInfluence.baselineSuitability*100)}% / MEMORY {s.memoryInfluence.historicalSupport >= 0 ? '+' : ''}{s.memoryInfluence.historicalSupport} / FINAL {Math.round(s.confidence*100)}%</small></span>
              <span className="projection"><b>{s.projectedRisk}</b><small>projected risk</small>{s.learnedFromMemory && <em>MEMORY-INFORMED</em>}</span>
            </button>)}
          </div>}
        </div>
      </section>

      <section className="ask panel">
        <PanelTitle icon={<BrainCircuit size={17}/>} title="ASK SENTINEL" meta="EVIDENCE / MEMORY" />
        <div className="ask-row"><input value={ask} onChange={(e)=>setAsk(e.target.value)} onKeyDown={(e)=>e.key==='Enter' && askSentinel()}/><button onClick={askSentinel} disabled={busy}>Ask</button></div>
        {answer && <p className="answer">{answer}</p>}
      </section>

      {analysis && <div className="reason"><b>WHY THIS RESPONSE:</b> {analysis.recommendationReason}</div>}
      {message && <div className="toast">{message}</div>}
    </main>
  );
}

function PanelTitle({icon,title,meta}:{icon:ReactNode;title:string;meta:string}) { return <div className="panel-title"><span>{icon}{title}</span><small>{meta}</small></div>; }
function Empty({text}:{text:string}) { return <div className="empty">{text}</div>; }
function Metric({icon,label,value,compact=false}:{icon:ReactNode;label:string;value:string|number;compact?:boolean}) { return <div className="metric">{icon}<div><small>{label}</small><b className={compact?'compact':''}>{value}</b></div></div>; }
function Gate({name,x,y,hot=false}:{name:string;x:string;y:string;hot?:boolean}) { return <div className={`gate ${hot?'gate-hot':''}`} style={{left:x,top:y}}><span/><b>{name}</b></div>; }
