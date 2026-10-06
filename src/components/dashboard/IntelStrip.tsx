import { useMemo } from 'react';
import { Check, Radar, TrendingDown, ListChecks, Route } from 'lucide-react';
import { useTwinStore } from '../../store/useTwinStore';
import { COSTS, INCIDENT, formatMoney } from '../../data/incident';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

const STAGES = [
  { n: 1, title: 'Detect', sub: 'Correlate sensor anomalies', icon: Radar },
  { n: 2, title: 'Predict', sub: 'Forecast likely failure', icon: TrendingDown },
  { n: 3, title: 'Prioritize', sub: 'Estimate public impact', icon: ListChecks },
  { n: 4, title: 'Plan', sub: 'Recommend intervention', icon: Route },
];

function Workflow() {
  const stage = useTwinStore((s) => s.snap.stage);
  return (
    <section className="strip-sec wf" aria-label="Detect, predict, prioritize, plan">
      <div className="strip-label">AI pipeline</div>
      <ol className="wf-list">
        {STAGES.map((s, i) => {
          const state = stage > s.n ? 'done' : stage === s.n ? 'active' : 'pending';
          const Icon = s.icon;
          return (
            <li key={s.n} className={`wf-stage is-${state}`}>
              <div className="wf-top">
                <span className="wf-num">{state === 'done' ? <Check size={13} strokeWidth={3} /> : s.n}</span>
                {i < STAGES.length - 1 && (
                  <span className="wf-conn" aria-hidden>
                    <i style={{ width: stage > s.n ? '100%' : '0%' }} />
                  </span>
                )}
              </div>
              <div className="wf-title">
                <Icon size={13} />
                {s.title}
              </div>
              <div className="wf-sub">{s.sub}</div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const W = 440;
const H = 112;
const PAD_L = 74;
const PAD_R = 10;
const PAD_T = 8;
const PAD_B = 20;
const X = (h: number) => PAD_L + (h / 72) * (W - PAD_L - PAD_R);
const Y = (v: number) => PAD_T + (1 - v / 100) * (H - PAD_T - PAD_B);

const health = (t: number) => Math.max(4, 67 - 27 * Math.pow(t / 44, 1.6));

function FailureTimeline() {
  const prediction = useTwinStore((s) => s.snap.prediction);
  const resolved = useTwinStore((s) => s.snap.resolved);
  const future = useTwinStore((s) => s.future);
  const [a, b] = INCIDENT.failureWindow;

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let t = 0; t <= 72; t += 1.5) pts.push(`${t ? 'L' : 'M'}${X(t).toFixed(1)},${Y(health(t)).toFixed(1)}`);
    return pts.join('');
  }, []);

  const bands = [
    { from: 80, to: 100, label: 'Healthy', cls: 'b-ok' },
    { from: 60, to: 80, label: 'Degradation', cls: 'b-deg' },
    { from: 40, to: 60, label: 'Critical', cls: 'b-crit' },
    { from: 0, to: 40, label: 'Failure', cls: 'b-fail' },
  ];

  const state = resolved && !future ? 'repaired' : prediction || future ? 'forecast' : 'idle';

  return (
    <section className={`strip-sec tl is-${state}`} aria-label="Failure prediction">
      <div className="strip-label">
        Failure prediction <span className="strip-label-sub">{INCIDENT.asset}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="tl-svg" preserveAspectRatio="none" role="img" aria-label={`Predicted failure window ${a} to ${b} hours`}>
        {bands.map((bd) => (
          <g key={bd.label}>
            <rect x={PAD_L} y={Y(bd.to)} width={W - PAD_L - PAD_R} height={Y(bd.from) - Y(bd.to)} className={`tl-band ${bd.cls}`} />
            <text x={PAD_L - 8} y={(Y(bd.to) + Y(bd.from)) / 2 + 3.5} className="tl-band-label" textAnchor="end">
              {bd.label}
            </text>
          </g>
        ))}
        {/* prediction window */}
        <g className="tl-window" style={{ opacity: state === 'repaired' ? 0 : undefined }}>
          <rect x={X(a)} y={PAD_T} width={X(b) - X(a)} height={H - PAD_T - PAD_B} />
          <line x1={X(a)} x2={X(a)} y1={PAD_T} y2={H - PAD_B} />
          <line x1={X(b)} x2={X(b)} y1={PAD_T} y2={H - PAD_B} />
        </g>
        {/* axis */}
        {[0, 12, 24, 36, 48, 60, 72].map((h) => (
          <text key={h} x={X(h)} y={H - 5} className="tl-tick" textAnchor={h === 0 ? 'start' : h === 72 ? 'end' : 'middle'}>
            {h === 0 ? 'NOW' : `${h}h`}
          </text>
        ))}
        {state === 'repaired' ? (
          <path d={`M${X(0)},${Y(96)} L${X(72)},${Y(95)}`} className="tl-line is-ok" />
        ) : (
          <path d={curve} className="tl-line" pathLength={1} />
        )}
        <circle cx={X(0)} cy={Y(state === 'repaired' ? 96 : 67)} r="3.6" className={`tl-now ${state === 'repaired' ? 'is-ok' : ''}`} />
        {future && (
          <g className="tl-future">
            <line x1={X(48)} x2={X(48)} y1={PAD_T} y2={H - PAD_B} />
            <circle cx={X(48)} cy={Y(health(48))} r="3.6" />
          </g>
        )}
      </svg>
      <div className="tl-foot">
        {state === 'idle' && <span className="muted">No degradation forecast</span>}
        {state === 'forecast' && (
          <>
            <span className="tl-conclusion">
              Failure likely in <b className="tnum">{a}–{b} h</b>
            </span>
            <span className="muted">if no action is taken</span>
          </>
        )}
        {state === 'repaired' && (
          <span className="tl-conclusion is-ok">
            Section replaced · <b>no failure forecast</b>
          </span>
        )}
      </div>
    </section>
  );
}

function ValueCard() {
  const recommendation = useTwinStore((s) => s.snap.recommendation);
  const resolved = useTwinStore((s) => s.snap.resolved);
  const on = recommendation || resolved;
  const avoided = useAnimatedNumber(on ? COSTS.avoided : 0, 2.6);
  const ratio = COSTS.preventive / COSTS.failure;
  return (
    <section className={`strip-sec val ${on ? 'is-on' : ''}`} aria-label="Fix before failure">
      <div className="strip-label">
        Fix before failure <span className="tag-demo">Demo simulation</span>
      </div>
      <div className="val-bars">
        <div className="val-row">
          <span>Preventive repair</span>
          <div className="val-bar is-good">
            <i style={{ width: on ? `${Math.max(ratio * 100, 4)}%` : '0%' }} />
          </div>
          <b className="tnum">{formatMoney(COSTS.preventive)}</b>
        </div>
        <div className="val-row">
          <span>Potential failure</span>
          <div className="val-bar is-bad">
            <i style={{ width: on ? '100%' : '0%' }} />
          </div>
          <b className="tnum">{formatMoney(COSTS.failure)}</b>
        </div>
      </div>
      <div className="val-total">
        <span>Estimated loss avoided</span>
        <b className="tnum">{on ? `$${(avoided / 1_000_000).toFixed(2)}M` : '—'}</b>
      </div>
    </section>
  );
}

export function IntelStrip() {
  return (
    <div className="strip-inner">
      <Workflow />
      <FailureTimeline />
      <ValueCard />
    </div>
  );
}
