import { useCallback, useEffect, useRef, useState } from 'react';
import { Info, Layers, LayoutGrid, PlayCircle } from 'lucide-react';
import { useTwinStore } from '../../store/useTwinStore';
import { useDismiss } from '../../hooks/useDismiss';
import { PLACE } from '../../data/geo';

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden className="logo-mark">
      <path d="M16 3.5 27 9.8v12.4L16 28.5 5 22.2V9.8z" fill="none" stroke="var(--cyan)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10.5 19.8v-4.6M16 22v-9.6M21.5 19.8v-4.6" stroke="var(--text-0)" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="16" cy="25.2" r="1.3" fill="var(--emerald)" />
    </svg>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hdr-clock" title={`${PLACE.city} local time (Gulf Standard Time, UTC+4)`}>
      <span className="mono tnum">{now.toLocaleTimeString('en-GB', { hour12: false, timeZone: PLACE.timeZone })}</span>
      <span className="hdr-tz">{PLACE.timeZoneLabel}</span>
    </div>
  );
}

function StatusPill() {
  const phase = useTwinStore((s) => s.snap.phase);
  const localized = useTwinStore((s) => s.snap.localized);
  const future = useTwinStore((s) => s.future);
  let tone = 'ok';
  let text = 'All systems operational';
  if (phase === 'ANOMALY' || phase === 'CORRELATION' || (phase === 'DETECTION' && !localized)) {
    tone = 'warn';
    text = 'Anomaly under analysis · Sector B-12';
  } else if (phase === 'DETECTION' || phase === 'PREDICTION' || phase === 'PRIORITIZATION' || phase === 'ACTION_PLAN') {
    tone = 'alert';
    text = 'Incident · Sector B-12 water main';
  } else if (phase === 'MITIGATION') {
    tone = 'info';
    text = 'Intervention in progress · Sector B-12';
  } else if (phase === 'RESOLVED') {
    tone = 'ok';
    text = 'Failure prevented · Sector B-12 stable';
  }
  if (future) {
    tone = 'alert';
    text = 'Viewing simulated future · T+48 h';
  }
  return (
    <div className={`hdr-status tone-${tone}`} role="status" aria-live="polite">
      <span className="live-dot" aria-hidden />
      <span className="hdr-live">LIVE CITY TWIN</span>
      <span className="hdr-sep" aria-hidden />
      <span className="hdr-status-text">{text}</span>
    </div>
  );
}

export function Header() {
  const layerPanel = useTwinStore((s) => s.layerPanel);
  const setLayerPanel = useTwinStore((s) => s.setLayerPanel);
  const scenarioMenu = useTwinStore((s) => s.scenarioMenu);
  const setScenarioMenu = useTwinStore((s) => s.setScenarioMenu);
  const resetView = useTwinStore((s) => s.resetView);
  const activePreset = useTwinStore((s) => s.activePreset);
  const infoOpen = useTwinStore((s) => s.infoOpen);
  const setInfoOpen = useTwinStore((s) => s.setInfoOpen);
  const infoRef = useRef<HTMLDivElement>(null);
  const closeInfo = useCallback(() => setInfoOpen(false), [setInfoOpen]);
  useDismiss(infoRef, infoOpen, closeInfo, '[data-popover-toggle="info"]');

  return (
    <header className="hdr panel-enter" style={{ ['--enter-delay' as string]: '0ms' }}>
      <div className="hdr-brand">
        <LogoMark />
        <div>
          <div className="hdr-title">UnderGrid</div>
          <div className="hdr-tagline">The City That Heals Itself</div>
        </div>
      </div>

      <StatusPill />

      <div className="hdr-right">
        <nav className="seg" aria-label="Views">
          <button className={`seg-btn ${activePreset === 'city' ? 'is-on' : ''}`} onClick={() => resetView()} title="Overview (0)">
            <LayoutGrid size={14} />
            Overview
          </button>
          <button className={`seg-btn ${layerPanel ? 'is-on' : ''}`} onClick={() => setLayerPanel(!layerPanel)} aria-pressed={layerPanel} title="Infrastructure layers (L)">
            <Layers size={14} />
            Layers
          </button>
          <button className={`seg-btn ${scenarioMenu ? 'is-on' : ''}`} onClick={() => setScenarioMenu(!scenarioMenu)} aria-pressed={scenarioMenu} title="Scenario" data-popover-toggle="scenario">
            <PlayCircle size={14} />
            Scenario
          </button>
        </nav>
        <Clock />
        <div className="hdr-info">
          <button className="icon-btn" aria-label="About this prototype" aria-expanded={infoOpen} onClick={() => setInfoOpen(!infoOpen)} data-popover-toggle="info">
            <Info size={16} />
          </button>
          {infoOpen && (
            <div className="popover hdr-info-pop" role="dialog" ref={infoRef}>
              <div className="popover-title">About this prototype</div>
              <p>Prototype using simulated infrastructure telemetry. It is not connected to a real municipal network — all sensors, assets, costs and forecasts are demo simulation.</p>
              <p className="muted">
                Shortcuts: <kbd>Space</kbd> run / pause · <kbd>X</kbd> X-ray · <kbd>E</kbd> exploded view · <kbd>1–5</kbd> camera presets · <kbd>R</kbd> reset
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
