import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { SECTOR_BY_ID, BUILDINGS, PLINTH } from '../data/city';
import { live } from '../simulation/runtime';
import { useTwinStore } from '../store/useTwinStore';
import { FadeHtml } from './labels/FadeHtml';

const B12 = SECTOR_BY_ID.get('B-12')!;

function sectorSummary(id: string) {
  const bs = BUILDINGS.filter((b) => b.sector === id);
  const res = bs.reduce((a, b) => a + b.occupants, 0);
  return { count: bs.length, residents: res };
}

/** Status label for the incident sector — colour/state follow the scenario. */
function AlertLabel() {
  const stateRef = useRef<HTMLSpanElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const healed = live.healed > 0.5;
    const sev = live.sectorSeverity > 0.5;
    const state = healed ? 'STABLE' : sev ? 'INCIDENT' : 'ANOMALY';
    const tone = healed ? 'ok' : sev ? 'alert' : 'warn';
    if (stateRef.current && stateRef.current.textContent !== state) stateRef.current.textContent = state;
    if (boxRef.current && boxRef.current.dataset.tone !== tone) boxRef.current.dataset.tone = tone;
  });
  return (
    <FadeHtml position={[B12.x - PLINTH / 2 + 0.5, 0.4, B12.z - PLINTH / 2 + 0.5]} opacity={() => live.sectorAlert * (1 - live.exploded)} zIndex={27}>
      <div className="sector-tag is-alert" ref={boxRef} data-tone="warn">
        <span className="sector-id mono">SECTOR B-12</span>
        <span className="sector-state" ref={stateRef}>
          ANOMALY
        </span>
      </div>
    </FadeHtml>
  );
}

function HoverLabel() {
  const hoverSector = useTwinStore((s) => s.hoverSector);
  const xray = useTwinStore((s) => s.xray);
  if (!hoverSector || xray) return null;
  const s = SECTOR_BY_ID.get(hoverSector);
  if (!s || (s.id === 'B-12' && live.sectorAlert > 0.3)) return null;
  const sum = sectorSummary(s.id);
  return (
    <Html position={[s.x - PLINTH / 2 + 0.5, 0.4, s.z - PLINTH / 2 + 0.5]} zIndexRange={[19, 19]} style={{ pointerEvents: 'none' }}>
      <div className="sector-tag">
        <span className="sector-id mono">{s.id}</span>
        <span className="sector-meta">
          {sum.count} bldg · {s.kind === 'park' ? 'park' : s.kind === 'yard' ? 'utility' : s.kind === 'campus' ? 'campus' : `${sum.residents.toLocaleString('en-US')} res.`}
        </span>
      </div>
    </Html>
  );
}

export function SectorOverlay() {
  return (
    <group>
      <AlertLabel />
      <HoverLabel />
    </group>
  );
}
