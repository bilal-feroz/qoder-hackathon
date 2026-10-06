import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader, OctagonAlert, Pause, Play, Radar, RotateCcw, SkipForward, TriangleAlert, Wrench, X, Zap } from 'lucide-react';
import { useTwinStore } from '../../store/useTwinStore';
import { T, TIMELINE_MARKERS } from '../../simulation/timeline';
import { runtime } from '../../simulation/runtime';
import { INCIDENT } from '../../data/incident';

const TONE_ICON = {
  ok: CheckCircle2,
  info: Wrench,
  warn: Radar,
  alert: OctagonAlert,
  success: CheckCircle2,
};

/** Top-centre narration of what the AI is doing right now. */
export function ScenarioCaption() {
  const caption = useTwinStore((s) => s.snap.caption);
  const active = useTwinStore((s) => s.snap.active);
  const future = useTwinStore((s) => s.future);
  const compare = useTwinStore((s) => s.compare);
  if (!active || future || compare) return null;
  const Icon = caption.key === 'correlate' || caption.key === 'localize' ? Loader : TONE_ICON[caption.tone];
  return (
    <div className="caption-wrap" aria-live="polite">
      <div key={caption.key} className={`caption tone-${caption.tone}`}>
        <Icon size={16} className={caption.key === 'correlate' || caption.key === 'localize' ? 'spin' : ''} />
        <div>
          <div className="caption-title">{caption.title}</div>
          {caption.detail && <div className="caption-detail">{caption.detail}</div>}
        </div>
      </div>
    </div>
  );
}

function fmtTime(t: number) {
  const s = Math.max(0, Math.floor(t));
  return `00:${String(s).padStart(2, '0')}`;
}

/** Bottom-centre: the single strong "run" button, then subtle transport controls. */
export function ScenarioTransport() {
  const status = useTwinStore((s) => s.status);
  const run = useTwinStore((s) => s.run);
  const togglePause = useTwinStore((s) => s.togglePause);
  const reset = useTwinStore((s) => s.reset);
  const skip = useTwinStore((s) => s.skipToIncident);
  const seek = useTwinStore((s) => s.seek);
  const t = useTwinStore((s) => s.snap.t);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const exploded = useTwinStore((s) => s.exploded);

  // smooth progress independent of the 12 Hz snapshot
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (fillRef.current) fillRef.current.style.width = `${(runtime.t / T.end) * 100}%`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (status === 'idle') {
    if (exploded) return null;
    return (
      <div className="transport is-idle">
        <button className="run-btn" onClick={run}>
          <span className="run-icon">
            <Zap size={18} />
          </span>
          <span className="run-text">
            <span className="run-title">Run failure scenario</span>
            <span className="run-sub">{INCIDENT.scenarioName} · ~50 s</span>
          </span>
        </button>
        <button className="link-btn skip-link" onClick={skip}>
          Skip to incident
          <SkipForward size={13} />
        </button>
      </div>
    );
  }

  const onSeek = (e: React.MouseEvent) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    seek(((e.clientX - r.left) / r.width) * T.end);
  };

  return (
    <div className="transport">
      <button className="icon-btn" onClick={togglePause} aria-label={status === 'running' ? 'Pause' : 'Play'} title="Space">
        {status === 'running' ? <Pause size={15} /> : <Play size={15} />}
      </button>
      <button className="icon-btn" onClick={reset} aria-label="Reset demo" title="Reset (R)">
        <RotateCcw size={15} />
      </button>
      <button className="icon-btn" onClick={skip} aria-label="Skip to incident" title="Skip to incident">
        <SkipForward size={15} />
      </button>
      <div className="track" ref={trackRef} onClick={onSeek} role="slider" aria-label="Scenario timeline" aria-valuemin={0} aria-valuemax={T.end} aria-valuenow={Math.round(t)} tabIndex={0}>
        <div className="track-fill" ref={fillRef} />
        {TIMELINE_MARKERS.map((m) => (
          <span key={m.label} className={`track-mark ${t >= m.t ? 'is-past' : ''}`} style={{ left: `${(m.t / T.end) * 100}%` }} title={m.label}>
            <i />
            <em>{m.label}</em>
          </span>
        ))}
      </div>
      <span className="track-time mono tnum">{fmtTime(t)}</span>
      <span className={`track-state ${status}`}>{status === 'running' ? 'Live' : status === 'paused' ? 'Paused' : 'Complete'}</span>
    </div>
  );
}

/** Header "Scenario" popover. */
export function ScenarioMenu() {
  const open = useTwinStore((s) => s.scenarioMenu);
  const setOpen = useTwinStore((s) => s.setScenarioMenu);
  const run = useTwinStore((s) => s.run);
  const skip = useTwinStore((s) => s.skipToIncident);
  const reset = useTwinStore((s) => s.reset);
  const viewRepairPlan = useTwinStore((s) => s.viewRepairPlan);
  if (!open) return null;
  return (
    <div className="popover scenario-menu" role="dialog" aria-label="Scenario">
      <div className="popover-head">
        <div>
          <div className="popover-kicker">Guided scenario</div>
          <div className="popover-title">{INCIDENT.scenarioName}</div>
        </div>
        <button className="icon-btn sm" onClick={() => setOpen(false)} aria-label="Close">
          <X size={13} />
        </button>
      </div>
      <p className="muted">Small pressure, moisture and temperature drifts in Sector B-12 combine into a predicted water-main failure. The twin localizes it, forecasts the failure window, estimates the public impact and plans the repair.</p>
      <div className="menu-actions">
        <button className="btn-primary" onClick={run}>
          <Play size={15} /> Run from start
        </button>
        <button className="btn-ghost" onClick={skip}>
          <SkipForward size={14} /> Skip to incident
        </button>
        <button className="btn-ghost" onClick={viewRepairPlan}>
          <Wrench size={14} /> Jump to repair plan
        </button>
        <button className="btn-ghost" onClick={reset}>
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </div>
  );
}

/** Red-tinted frame + banner while viewing the predicted future. */
export function FutureOverlay() {
  const future = useTwinStore((s) => s.future);
  const setFuture = useTwinStore((s) => s.setFuture);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (future) setShown(true);
    else {
      const id = setTimeout(() => setShown(false), 500);
      return () => clearTimeout(id);
    }
  }, [future]);
  if (!shown) return null;
  return (
    <div className={`future-frame ${future ? 'is-on' : ''}`}>
      <div className="future-banner" role="status">
        <TriangleAlert size={16} />
        <div>
          <div className="future-title">Predicted state · if no action is taken</div>
          <div className="future-sub">Simulation · T+48 h · burst likely at ~44 h · zone grows to {INCIDENT.futurePopulation.toLocaleString('en-US')} residents</div>
        </div>
        <button className="btn-ghost sm" onClick={() => setFuture(false)}>
          Back to now
        </button>
      </div>
    </div>
  );
}
