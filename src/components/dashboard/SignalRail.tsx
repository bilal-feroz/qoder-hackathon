import { Activity, Droplets, Gauge, Thermometer, BrainCircuit } from 'lucide-react';
import { useTwinStore } from '../../store/useTwinStore';
import { Sparkline } from '../ui/Sparkline';
import { StatusChip, type ChipTone } from '../ui/StatusChip';
import { PROJECTED_48H } from '../../simulation/telemetry';
import { EXPLAIN_FEATURES, INCIDENT } from '../../data/incident';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

const sign = (v: number, d = 1) => `${v > 0.049 ? '+' : v < -0.049 ? '−' : '±'}${Math.abs(v).toFixed(d)}`;

interface CardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  sub: string;
  tone: ChipTone;
  chip: string;
  history: number[];
  domain: [number, number];
  projected: boolean;
}

function SignalCard({ icon, label, value, unit, sub, tone, chip, history, domain, projected }: CardProps) {
  const color = tone === 'warn' ? 'var(--amber)' : tone === 'alert' ? 'var(--red)' : 'var(--cyan)';
  return (
    <article className={`sig-card tone-${tone} ${projected ? 'is-projected' : ''}`}>
      <header className="sig-head">
        <span className="sig-icon" aria-hidden>
          {icon}
        </span>
        <span className="sig-label">{label}</span>
        {projected ? <StatusChip tone="alert">T+48H</StatusChip> : <StatusChip tone={tone}>{chip}</StatusChip>}
      </header>
      <div className="sig-value tnum">
        {value}
        {unit && <span className="sig-unit">{unit}</span>}
      </div>
      <Sparkline values={history} color={color} domain={domain} />
      <div className="sig-sub">{sub}</div>
    </article>
  );
}

function WhyAlert() {
  const confidence = useTwinStore((s) => s.snap.confidence);
  const anomaly = useTwinStore((s) => s.snap.anomaly);
  const localized = useTwinStore((s) => s.snap.localized);
  const correlating = useTwinStore((s) => s.snap.correlating);
  const resolved = useTwinStore((s) => s.snap.resolved);
  const progress = Math.min(1, confidence / INCIDENT.confidence);
  const shown = useAnimatedNumber(confidence, 6);
  const C = 2 * Math.PI * 22;

  if (!anomaly || confidence < 0.5) {
    return (
      <section className="why is-idle" aria-label="Why this alert">
        <header className="why-head">
          <BrainCircuit size={14} />
          <span>Why this alert?</span>
        </header>
        <p className="why-idle">{anomaly ? 'Weak deviations observed. Waiting for a correlated pattern…' : 'No active alerts. The model fuses weak signals from 216 sensors to flag failures before anything breaks.'}</p>
      </section>
    );
  }

  return (
    <section className={`why ${localized ? 'is-final' : ''}`} aria-label="Why this alert">
      <header className="why-head">
        <BrainCircuit size={14} />
        <span>Why this alert?</span>
        {correlating && <span className="why-live">correlating</span>}
      </header>
      <div className="why-body">
        <ul className="why-list">
          {EXPLAIN_FEATURES.map((f) => (
            <li key={f.label}>
              <div className="why-row">
                <span>{f.label}</span>
                <b className={`lvl lvl-${f.level.toLowerCase()}`}>{f.level}</b>
              </div>
              <div className="why-bar">
                <i style={{ width: `${f.weight * progress * 100}%` }} className={`lvl-${f.level.toLowerCase()}`} />
              </div>
            </li>
          ))}
        </ul>
        <div className="why-gauge">
          <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
            <circle cx="32" cy="32" r="22" className="why-gauge-track" />
            <circle cx="32" cy="32" r="22" className="why-gauge-fill" strokeDasharray={`${(C * shown) / 100} ${C}`} transform="rotate(-90 32 32)" />
          </svg>
          <div className="why-gauge-val tnum">{Math.round(shown)}%</div>
          <div className="why-gauge-label">combined confidence</div>
        </div>
      </div>
      <p className="why-note">{resolved ? 'Pattern cleared after repair.' : 'No single signal crossed its alarm threshold — the correlated pattern did.'}</p>
    </section>
  );
}

export function SignalRail() {
  const snap = useTwinStore((s) => s.snap);
  const history = useTwinStore((s) => s.history);
  const future = useTwinStore((s) => s.future);
  const tel = future ? PROJECTED_48H : snap;
  const active = snap.anomaly || future;
  const resolved = snap.resolved && !future;

  const pTone: ChipTone = future ? 'alert' : Math.abs(tel.pressureDev) < 0.35 ? 'ok' : 'warn';
  const mTone: ChipTone = future ? 'alert' : tel.moistureDev < 2.5 ? 'ok' : resolved ? 'info' : 'warn';
  const tTone: ChipTone = future ? 'alert' : tel.tempDev < 0.8 ? 'ok' : resolved ? 'info' : 'warn';
  const nTone: ChipTone = future ? 'alert' : tel.networkHealth > 98.3 ? 'ok' : 'warn';

  return (
    <div className="rail-inner">
      <header className="rail-head">
        <span className="rail-title">Live signals</span>
        <span className="rail-meta">
          <span className="live-dot small" aria-hidden /> 4 of 216 streams
        </span>
      </header>
      <div className="sig-grid">
        <SignalCard
          icon={<Gauge size={15} />}
          label="Water Pressure"
          value={active ? `${sign(tel.pressureDev)}%` : '100%'}
          unit={active ? undefined : 'of nominal'}
          sub={`${tel.pressureBar.toFixed(2)} bar · tolerance ±5%`}
          tone={pTone}
          chip={pTone === 'ok' ? (resolved ? 'Recovered' : 'Normal') : 'Drift'}
          history={history.pressure}
          domain={[-3, 0.5]}
          projected={future}
        />
        <SignalCard
          icon={<Droplets size={15} />}
          label="Ground Moisture"
          value={active && tel.moistureDev > 0.6 ? `+${tel.moistureDev.toFixed(0)}%` : 'Normal'}
          sub={`Soil ${(21 + tel.moistureDev * 0.21).toFixed(1)}% VWC · tolerance +25%`}
          tone={mTone}
          chip={mTone === 'ok' ? 'Normal' : mTone === 'info' ? 'Drying' : 'Elevated'}
          history={history.moisture}
          domain={[0, 20]}
          projected={future}
        />
        <SignalCard
          icon={<Thermometer size={15} />}
          label="Temperature"
          value={active && tel.tempDev > 0.3 ? `+${tel.tempDev.toFixed(0)}%` : 'Normal'}
          sub={`Ground ${(14 * (1 + tel.tempDev / 100)).toFixed(1)} °C · tolerance ±6%`}
          tone={tTone}
          chip={tTone === 'ok' ? 'Normal' : tTone === 'info' ? 'Settling' : 'Variance'}
          history={history.temp}
          domain={[0, 4.5]}
          projected={future}
        />
        <SignalCard
          icon={<Activity size={15} />}
          label="Network Health"
          value={`${tel.networkHealth.toFixed(1)}%`}
          sub="Integrity index · 5 networks"
          tone={nTone}
          chip={nTone === 'ok' ? 'Healthy' : 'Degraded'}
          history={history.health}
          domain={[96.5, 99]}
          projected={future}
        />
      </div>
      <WhyAlert />
    </div>
  );
}
