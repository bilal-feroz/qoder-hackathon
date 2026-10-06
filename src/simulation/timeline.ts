/**
 * Deterministic scenario timeline for "Sector B-12 Water Network Anomaly".
 * Everything the twin shows during the guided demo is a pure function of the
 * scenario clock `t` (seconds), so pause / seek / skip are exact and repeatable.
 */

export const T = {
  start: 0,
  anomaly: 2.5,
  correlate: 7,
  pattern: 10,
  localize: 12.5,
  open: 15,
  xray: 16.2,
  dive: 18,
  leak: 22.5,
  predict: 26,
  impact: 29.5,
  plan: 34,
  repair: 37.5,
  reroute: 39.5,
  dispatch: 41.5,
  replace: 44.5,
  restore: 46.5,
  resolved: 48.5,
  end: 54,
} as const;

export type Phase =
  | 'NORMAL'
  | 'ANOMALY'
  | 'CORRELATION'
  | 'DETECTION'
  | 'PREDICTION'
  | 'PRIORITIZATION'
  | 'ACTION_PLAN'
  | 'MITIGATION'
  | 'RESOLVED';

export const PHASES: Phase[] = ['NORMAL', 'ANOMALY', 'CORRELATION', 'DETECTION', 'PREDICTION', 'PRIORITIZATION', 'ACTION_PLAN', 'MITIGATION', 'RESOLVED'];

export function phaseAt(t: number, active: boolean): Phase {
  if (!active) return 'NORMAL';
  if (t < T.anomaly) return 'NORMAL';
  if (t < T.correlate) return 'ANOMALY';
  if (t < T.pattern) return 'CORRELATION';
  if (t < T.predict) return 'DETECTION';
  if (t < T.impact) return 'PREDICTION';
  if (t < T.plan) return 'PRIORITIZATION';
  if (t < T.repair) return 'ACTION_PLAN';
  if (t < T.resolved) return 'MITIGATION';
  return 'RESOLVED';
}

/** Workflow stage: 0 idle · 1 detect · 2 predict · 3 prioritize · 4 plan · 5 complete */
export function stageAt(t: number, active: boolean): number {
  if (!active || t < T.anomaly) return 0;
  if (t < T.leak) return 1;
  if (t < T.impact) return 2;
  if (t < T.plan) return 3;
  if (t < T.resolved) return 4;
  return 5;
}

export type Tone = 'ok' | 'info' | 'warn' | 'alert' | 'success';

export interface Caption {
  key: string;
  title: string;
  detail?: string;
  tone: Tone;
}

const CAPTIONS: (Caption & { t: number })[] = [
  { t: 0, key: 'ok', title: 'All systems operational', detail: '216 sensors streaming', tone: 'ok' },
  { t: T.anomaly, key: 'drift', title: 'Minor sensor deviations', detail: 'Sector B-12 · individually within tolerance', tone: 'info' },
  { t: T.correlate, key: 'correlate', title: 'Correlating sensor signals…', detail: '6 sensors · pressure, moisture, temperature', tone: 'warn' },
  { t: T.pattern, key: 'pattern', title: 'Pattern anomaly detected', detail: 'Sector B-12 · combined signature', tone: 'warn' },
  { t: T.localize, key: 'localize', title: 'Localizing source', detail: 'Hamdan Bin Mohammed St · ±4 m', tone: 'warn' },
  { t: T.open, key: 'open', title: 'Opening subsurface view', detail: 'Cross-section · Hamdan Bin Mohammed St', tone: 'info' },
  { t: T.dive, key: 'follow', title: 'Following water main WTR-B12-04', detail: 'Ductile iron · 600 mm · depth 2.1 m', tone: 'warn' },
  { t: T.leak, key: 'leak', title: 'Possible underground water leak', detail: '93% confidence · failure in 36–52 h', tone: 'alert' },
  { t: T.predict, key: 'predict', title: 'Forecasting failure window', detail: 'Degradation model · 72 h horizon', tone: 'alert' },
  { t: T.impact, key: 'impact', title: 'Estimating public impact', detail: '12,400 residents · hospital 320 m', tone: 'alert' },
  { t: T.plan, key: 'plan', title: 'Recommended: dispatch crew within 6 h', detail: 'Preventive repair · ~AED 660K', tone: 'warn' },
  { t: T.repair, key: 'step1', title: 'Step 1 · Isolate upstream valve', detail: 'V-B12-02 and V-B12-03 closing', tone: 'info' },
  { t: T.reroute, key: 'step2', title: 'Step 2 · Reroute water flow', detail: 'B-12 supplied via the A|B loop', tone: 'info' },
  { t: T.dispatch, key: 'step3', title: 'Step 3 · Dispatch repair crew', detail: 'Crew 07 · ETA 18 min', tone: 'info' },
  { t: T.replace, key: 'step4', title: 'Step 4 · Replace damaged pipe section', detail: 'WTR-B12-04 · 3.2 m section', tone: 'info' },
  { t: T.restore, key: 'step5', title: 'Step 5 · Pressure test and restore', detail: 'Target 3.92 bar', tone: 'info' },
  { t: T.resolved, key: 'resolved', title: 'Failure prevented', detail: '12,400 residents protected · AED 5.94M avoided', tone: 'success' },
];

export function captionAt(t: number, active: boolean): Caption {
  if (!active) return CAPTIONS[0];
  let c = CAPTIONS[0];
  for (const cap of CAPTIONS) if (t >= cap.t) c = cap;
  return c;
}

/** Markers shown on the scenario progress bar. */
export const TIMELINE_MARKERS: { t: number; label: string }[] = [
  { t: T.anomaly, label: 'Anomaly' },
  { t: T.pattern, label: 'Detect' },
  { t: T.leak, label: 'Leak' },
  { t: T.predict, label: 'Predict' },
  { t: T.impact, label: 'Impact' },
  { t: T.plan, label: 'Plan' },
  { t: T.repair, label: 'Repair' },
  { t: T.resolved, label: 'Resolved' },
];

/* ---------------- helpers ---------------- */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (v: number) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
/** 0→1 between a and b (smoothstep) */
export const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
/** rises a0→a1, holds, falls b0→b1 */
export const pulse = (t: number, a0: number, a1: number, b0: number, b1: number) => ramp(t, a0, a1) * (1 - ramp(t, b0, b1));

/** Piecewise interpolation over [t, value] keys with smoothstep easing. */
export function keys(t: number, k: [number, number][]): number {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, v0] = k[i];
    const [t1, v1] = k[i + 1];
    if (t <= t1) return v0 + (v1 - v0) * smooth((t - t0) / Math.max(1e-6, t1 - t0));
  }
  return k[k.length - 1][1];
}
