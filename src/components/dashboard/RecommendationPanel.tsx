import { useEffect, useRef } from 'react';
import { AlertOctagon, ArrowRight, Building2, Check, CircleDollarSign, Clock3, GitCompare, Hospital, MapPin, RotateCcw, ShieldCheck, Sparkles, Users, Wrench } from 'lucide-react';
import { useTwinStore } from '../../store/useTwinStore';
import { COSTS, INCIDENT, REPAIR_STEPS, formatMoney } from '../../data/incident';
import { runtime } from '../../simulation/runtime';
import { T } from '../../simulation/timeline';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

function Evidence({ on, icon, title, value, tone = 'alert' }: { on: boolean; icon: React.ReactNode; title: string; value: string; tone?: string }) {
  return (
    <li className={`evi ${on ? 'is-on' : ''} tone-${tone}`}>
      <span className="evi-icon">{icon}</span>
      <span className="evi-title">{title}</span>
      <span className="evi-value tnum">{on ? value : '—'}</span>
    </li>
  );
}

function Monitoring() {
  return (
    <div className="rec-block">
      <div className="rec-badge tone-ok">
        <ShieldCheck size={18} />
        <span>MONITORING</span>
      </div>
      <p className="rec-lede">No intervention required.</p>
      <ul className="rec-facts">
        <li>
          <span>Networks within tolerance</span>
          <b className="tnum">5 / 5</b>
        </li>
        <li>
          <span>Sensors online</span>
          <b className="tnum">216 / 216</b>
        </li>
        <li>
          <span>Open recommendations</span>
          <b className="tnum">0</b>
        </li>
      </ul>
      <p className="rec-hint">Run the failure scenario to watch the twin detect, predict, prioritize and plan.</p>
    </div>
  );
}

function Analyzing() {
  const snap = useTwinStore((s) => s.snap);
  const label = !snap.patternDetected ? 'Correlating signals' : !snap.localized ? 'Localizing source' : !snap.prediction ? 'Confirming leak' : !snap.impact ? 'Forecasting failure' : 'Estimating impact';
  return (
    <div className="rec-block">
      <div className={`rec-badge ${snap.localized ? 'tone-alert' : 'tone-warn'} is-pulsing`}>
        <Sparkles size={17} />
        <span>{snap.localized ? 'ASSESSING' : 'ANALYZING'}</span>
      </div>
      <p className="rec-lede">
        {label}
        <span className="dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </p>
      <ul className="evi-list">
        <Evidence on={snap.patternDetected} icon={<MapPin size={13} />} title="Location" value="Sector B-12 · Riverside Ave" tone="warn" />
        <Evidence on={snap.localized} icon={<AlertOctagon size={13} />} title="Possible water leak" value={`${INCIDENT.confidence}% conf.`} />
        <Evidence on={snap.localized} icon={<Wrench size={13} />} title="Asset" value={`${INCIDENT.asset} · 67% health`} />
        <Evidence on={snap.prediction} icon={<Clock3 size={13} />} title="Predicted failure" value={`${INCIDENT.failureWindow[0]}–${INCIDENT.failureWindow[1]} h`} />
        <Evidence on={snap.impact} icon={<Users size={13} />} title="Residents at risk" value={INCIDENT.population.toLocaleString('en-US')} />
        <Evidence on={snap.impact} icon={<Hospital size={13} />} title="Hospital" value="320 m away" />
      </ul>
    </div>
  );
}

function Recommendation() {
  const viewRepairPlan = useTwinStore((s) => s.viewRepairPlan);
  const repairOpen = useTwinStore((s) => s.repairOpen);
  return (
    <div className="rec-block rec-enter">
      <div className="rec-top">
        <div className="rec-badge tone-alert big">
          <AlertOctagon size={20} />
          <span>INTERVENE</span>
        </div>
        <div className="rec-priority">
          <span>Priority</span>
          <b>CRITICAL</b>
        </div>
      </div>
      <div className="rec-where">
        <MapPin size={14} />
        <span>
          <b>Sector B-12</b> · Riverside Avenue
        </span>
      </div>
      <div className="rec-action">
        <span className="rec-action-label">Action</span>
        <span className="rec-action-text">Repair within {INCIDENT.respondWithinHours} h — dispatch maintenance crew</span>
      </div>
      <div className="rec-kpis">
        <div className="kpi">
          <span className="kpi-label">
            <Users size={12} /> Impact
          </span>
          <b className="tnum">12,400</b>
          <span className="kpi-sub">residents</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">
            <Hospital size={12} /> Hospital
          </span>
          <b className="tnum">320 m</b>
          <span className="kpi-sub">from the leak</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">
            <CircleDollarSign size={12} /> Preventive cost
          </span>
          <b className="tnum">~{formatMoney(COSTS.preventive)}</b>
          <span className="kpi-sub">
            {formatMoney(COSTS.preventiveRange[0])}–{formatMoney(COSTS.preventiveRange[1])}
          </span>
        </div>
        <div className="kpi is-good">
          <span className="kpi-label">
            <ShieldCheck size={12} /> Avoided impact
          </span>
          <b className="tnum">~{formatMoney(COSTS.avoided)}</b>
          <span className="kpi-sub">vs {formatMoney(COSTS.failure)}+ failure</span>
        </div>
      </div>
      <details className="rec-why" open={!repairOpen}>
        <summary>Why B-12 is prioritized</summary>
        <ul>
          <li>12,400 residents on this supply zone</li>
          <li>Central Medical Center 320 m away</li>
          <li>High probability of pipe failure (93%)</li>
          <li>Early repair avoids a Riverside Ave closure</li>
          <li>Crew 07 available · 18 min away</li>
        </ul>
      </details>
      {!repairOpen && (
        <button className="btn-primary" onClick={viewRepairPlan}>
          View repair plan
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

function RepairPlan() {
  const step = useTwinStore((s) => s.snap.repairStep);
  const t = useTwinStore((s) => s.snap.t);
  const bounds = [T.repair, T.reroute, T.dispatch, T.replace, T.restore, T.resolved];
  return (
    <div className="plan rec-enter" aria-label="Repair plan">
      <div className="plan-head">
        <span>Repair plan</span>
        <span className="plan-meta">AI-generated · operator approval</span>
      </div>
      <ol className="plan-steps">
        {REPAIR_STEPS.map((s, i) => {
          const state = step > s.id ? 'done' : step === s.id ? 'active' : 'pending';
          const p = state === 'active' ? Math.min(1, Math.max(0, (t - bounds[i]) / (bounds[i + 1] - bounds[i]))) : state === 'done' ? 1 : 0;
          return (
            <li key={s.id} className={`plan-step is-${state}`}>
              <span className="plan-num">{state === 'done' ? <Check size={13} strokeWidth={3} /> : String(s.id).padStart(2, '0')}</span>
              <div className="plan-body">
                <div className="plan-title">{s.title}</div>
                <div className="plan-detail">{s.detail}</div>
                {state === 'active' && (
                  <div className="plan-progress">
                    <i style={{ width: `${p * 100}%` }} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Resolved() {
  const setCompare = useTwinStore((s) => s.setCompare);
  const compare = useTwinStore((s) => s.compare);
  const run = useTwinStore((s) => s.run);
  const risk = useAnimatedNumber(useTwinStore((s) => s.snap.risk), 3);
  return (
    <div className="rec-block rec-enter">
      <div className="rec-badge tone-ok big">
        <ShieldCheck size={20} />
        <span>FAILURE PREVENTED</span>
      </div>
      <div className="resolved-hero">
        <div>
          <b className="tnum">12,400</b>
          <span>residents protected</span>
        </div>
        <div>
          <b className="tnum">{formatMoney(COSTS.avoided)}</b>
          <span>estimated impact avoided</span>
        </div>
      </div>
      <div className="risk-row">
        <span>Risk score</span>
        <span className="risk-from tnum">{INCIDENT.riskBefore}</span>
        <ArrowRight size={14} />
        <span className="risk-to tnum">{Math.round(risk)}</span>
      </div>
      <p className="rec-note">
        <Building2 size={13} /> The city never visibly broke — the twin planned the repair before the pipe failed.
      </p>
      <div className="rec-actions">
        <button className={`btn-primary ${compare ? 'is-on' : ''}`} onClick={() => setCompare(compare ? null : 'none')}>
          <GitCompare size={16} />
          {compare ? 'Close comparison' : 'Compare outcomes'}
        </button>
        <button className="btn-ghost" onClick={run}>
          <RotateCcw size={14} />
          Replay
        </button>
      </div>
    </div>
  );
}

export function RecommendationPanel() {
  const snap = useTwinStore((s) => s.snap);
  const repairOpen = useTwinStore((s) => s.repairOpen);
  const scrollRef = useRef<HTMLDivElement>(null);
  const active = snap.active;
  const key = !active || !snap.anomaly ? 'monitor' : snap.resolved ? 'resolved' : snap.recommendation ? 'rec' : 'analyze';

  useEffect(() => {
    if (repairOpen && scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [repairOpen, snap.repairStep]);

  void runtime;
  return (
    <div className="rail-inner">
      <header className="rail-head">
        <span className="rail-title">AI recommendation</span>
        <span className="rail-meta">Decision support</span>
      </header>
      <div className="rec-scroll" ref={scrollRef}>
        {key === 'monitor' && <Monitoring />}
        {key === 'analyze' && <Analyzing />}
        {key === 'rec' && (
          <>
            <Recommendation />
            {repairOpen && <RepairPlan />}
          </>
        )}
        {key === 'resolved' && (
          <>
            <Resolved />
            <RepairPlan />
          </>
        )}
      </div>
    </div>
  );
}
