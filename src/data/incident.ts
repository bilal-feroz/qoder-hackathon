import { STREET_Z, HOSPITAL_POS, SCHOOL_POS, DEPOT_POS, BUILDINGS } from './city';
import { LAYERS, INCIDENT_SEGMENT } from './networks';

/**
 * Scenario constants for "Sector B-12 Water Network Anomaly".
 * Prototype data — every figure here is a demo simulation, not a measurement.
 */

const WATER_Z = STREET_Z[2] + LAYERS.water.offset; // -2.4

export const LEAK = { x: 1.5, y: LAYERS.water.depth, z: WATER_Z } as const;
export const LEAK_SURFACE = { x: LEAK.x, z: LEAK.z } as const;

/** Excavation trench under Riverside Avenue, between the two intersections that bound B-12. */
export const TRENCH = { minX: -11.5, maxX: 11.5, minZ: -4.5, maxZ: 4.5, floor: -12.2 } as const;

const IMPACT_RADIUS = 54;
const IMPACT_FUTURE_RADIUS = 79;
const POPULATION = 12400;

/**
 * Calibrate the procedural occupancy so that the residents living inside the
 * impact radius add up to the scenario's headline figure — tooltips, sector
 * labels and the recommendation then all tell the same story.
 */
const residentsWithin = (r: number) =>
  BUILDINGS.filter((b) => b.kind !== 'office' && Math.hypot(b.x - LEAK.x, b.z - LEAK.z) <= r).reduce((a, b) => a + b.occupants, 0);
(() => {
  const k = POPULATION / Math.max(1, residentsWithin(IMPACT_RADIUS));
  for (const b of BUILDINGS) b.occupants = Math.round(b.occupants * k);
})();
const FUTURE_POPULATION = Math.round(residentsWithin(IMPACT_FUTURE_RADIUS) / 100) * 100;

export const INCIDENT = {
  scenarioName: 'Sector B-12 Water Network Anomaly',
  sector: 'B-12',
  asset: INCIDENT_SEGMENT.id,
  road: 'Riverside Avenue',
  confidence: 93,
  failureWindow: [36, 52] as [number, number],
  horizonHours: 72,
  population: POPULATION,
  futurePopulation: FUTURE_POPULATION,
  respondWithinHours: 6,
  riskBefore: 87,
  riskFuture: 98,
  riskAfter: 21,
  pressureBaselineBar: 3.926,
} as const;

export const COSTS = {
  preventive: 180_000,
  preventiveRange: [120_000, 250_000] as [number, number],
  failure: 1_800_000,
  avoided: 1_620_000,
} as const;

export const IMPACT = {
  center: LEAK_SURFACE,
  radius: IMPACT_RADIUS,
  futureRadius: IMPACT_FUTURE_RADIUS,
} as const;

export const POI = {
  hospital: { name: 'Central Medical Center', distanceM: 320, x: HOSPITAL_POS.x, z: HOSPITAL_POS.z, y: 11.5 },
  school: { name: 'Riverside Academy', distanceM: 480, x: SCHOOL_POS.x, z: SCHOOL_POS.z, y: 2.6 },
  depot: { name: 'Utility Operations Depot', x: DEPOT_POS.x, z: DEPOT_POS.z, y: 3.2 },
} as const;

export interface ValveDef {
  id: string;
  x: number;
  z: number;
  isolation: boolean;
}

export const VALVES: ValveDef[] = [
  { id: 'V-B12-02', x: -9.5, z: WATER_Z, isolation: true },
  { id: 'V-B12-03', x: 9.0, z: WATER_Z, isolation: true },
  { id: 'V-A12-01', x: -2, z: STREET_Z[1] + LAYERS.water.offset, isolation: false },
  { id: 'V-B13-05', x: 26, z: WATER_Z, isolation: false },
  { id: 'V-C11-02', x: -16.4, z: 14, isolation: false },
  { id: 'V-D12-01', x: 0, z: STREET_Z[3] + LAYERS.water.offset, isolation: false },
  { id: 'V-B10-03', x: -44.4, z: -16, isolation: false },
];

export interface RepairStep {
  id: number;
  title: string;
  detail: string;
}

export const REPAIR_STEPS: RepairStep[] = [
  { id: 1, title: 'Isolate upstream valve', detail: 'Close V-B12-02 and V-B12-03' },
  { id: 2, title: 'Reroute water flow', detail: 'Supply B-12 via the A|B loop' },
  { id: 3, title: 'Dispatch repair crew', detail: 'Crew 07 from Utility Operations Depot' },
  { id: 4, title: 'Replace damaged pipe section', detail: `${INCIDENT_SEGMENT.id} · 3.2 m ductile iron` },
  { id: 5, title: 'Pressure test and restore', detail: 'Reopen valves · verify 3.92 bar' },
];

/** Crew route from the depot gate to the work zone, along street lanes (xz). */
export const CREW_ROUTE: [number, number][] = [
  [52.5, 41],
  [52.5, 28.75],
  [15.25, 28.75],
  [15.25, -1.4],
  [12.9, -1.4],
];

export const EXPLAIN_FEATURES = [
  { label: 'Pressure deviation', level: 'HIGH', weight: 0.86 },
  { label: 'Moisture correlation', level: 'HIGH', weight: 0.81 },
  { label: 'Flow imbalance', level: 'MEDIUM', weight: 0.52 },
  { label: 'Temperature variance', level: 'LOW', weight: 0.24 },
] as const;

export function formatMoney(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 1 : 2).replace(/\.?0+$/, '')}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${v}`;
}
