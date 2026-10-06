import { STREET_X, STREET_Z } from './city';
import { LAYERS, type LayerId } from './networks';

export type SensorType = 'pressure' | 'moisture' | 'temperature' | 'flow' | 'voltage' | 'fiber' | 'level' | 'thermal';

export interface Sensor {
  index: number;
  id: string;
  type: SensorType;
  layer: LayerId;
  x: number;
  y: number;
  z: number;
  /** part of the B-12 incident correlation cluster */
  cluster: boolean;
}

const W = LAYERS.water;
const wx = (i: number) => STREET_X[i] + W.offset;
const wz = (j: number) => STREET_Z[j] + W.offset;
const lx = (l: LayerId, i: number) => STREET_X[i] + LAYERS[l].offset;
const lz = (l: LayerId, j: number) => STREET_Z[j] + LAYERS[l].offset;

type Def = Omit<Sensor, 'index'>;

const DEFS: Def[] = [
  // ---- incident cluster (Sector B-12 / Riverside Avenue) ----
  { id: 'P-14', type: 'pressure', layer: 'water', x: wx(2), y: W.depth, z: wz(2), cluster: true },
  { id: 'P-17', type: 'pressure', layer: 'water', x: -2.4, y: W.depth, z: wz(2), cluster: true },
  { id: 'P-22', type: 'pressure', layer: 'water', x: wx(3), y: W.depth, z: wz(2), cluster: true },
  { id: 'M-06', type: 'moisture', layer: 'water', x: -0.6, y: W.depth + 0.9, z: wz(2) - 1.5, cluster: true },
  { id: 'M-07', type: 'moisture', layer: 'water', x: 6.4, y: W.depth + 1.1, z: wz(2) + 1.7, cluster: true },
  { id: 'T-03', type: 'temperature', layer: 'water', x: -6.2, y: W.depth + 0.6, z: wz(2) + 1.3, cluster: true },
  // ---- healthy network sensors ----
  { id: 'F-09', type: 'flow', layer: 'water', x: wx(2), y: W.depth, z: -16, cluster: false },
  { id: 'P-03', type: 'pressure', layer: 'water', x: wx(1), y: W.depth, z: wz(1), cluster: false },
  { id: 'P-08', type: 'pressure', layer: 'water', x: wx(1), y: W.depth, z: wz(3), cluster: false },
  { id: 'P-11', type: 'pressure', layer: 'water', x: wx(4), y: W.depth, z: wz(1), cluster: false },
  { id: 'P-19', type: 'pressure', layer: 'water', x: wx(4), y: W.depth, z: wz(3), cluster: false },
  { id: 'P-25', type: 'pressure', layer: 'water', x: wx(3), y: W.depth, z: wz(4), cluster: false },
  { id: 'P-29', type: 'pressure', layer: 'water', x: wx(2), y: W.depth, z: wz(0), cluster: false },
  { id: 'E-04', type: 'voltage', layer: 'electric', x: lx('electric', 4), y: LAYERS.electric.depth, z: lz('electric', 1), cluster: false },
  { id: 'E-09', type: 'voltage', layer: 'electric', x: lx('electric', 1), y: LAYERS.electric.depth, z: lz('electric', 3), cluster: false },
  { id: 'E-12', type: 'voltage', layer: 'electric', x: lx('electric', 4), y: LAYERS.electric.depth, z: lz('electric', 3), cluster: false },
  { id: 'C-05', type: 'fiber', layer: 'telecom', x: lx('telecom', 1), y: LAYERS.telecom.depth, z: lz('telecom', 2), cluster: false },
  { id: 'C-12', type: 'fiber', layer: 'telecom', x: lx('telecom', 4), y: LAYERS.telecom.depth, z: lz('telecom', 1), cluster: false },
  { id: 'C-16', type: 'fiber', layer: 'telecom', x: lx('telecom', 3), y: LAYERS.telecom.depth, z: lz('telecom', 3), cluster: false },
  { id: 'S-02', type: 'level', layer: 'sewage', x: lx('sewage', 2), y: LAYERS.sewage.depth, z: lz('sewage', 3), cluster: false },
  { id: 'S-07', type: 'level', layer: 'sewage', x: lx('sewage', 3), y: LAYERS.sewage.depth, z: lz('sewage', 4), cluster: false },
  { id: 'S-10', type: 'level', layer: 'sewage', x: lx('sewage', 4), y: LAYERS.sewage.depth, z: lz('sewage', 2), cluster: false },
  { id: 'K-01', type: 'thermal', layer: 'cooling', x: lx('cooling', 2) - 0.5, y: LAYERS.cooling.depth, z: lz('cooling', 1) - 0.5, cluster: false },
  { id: 'K-04', type: 'thermal', layer: 'cooling', x: lx('cooling', 3) - 0.5, y: LAYERS.cooling.depth, z: -12, cluster: false },
];

const ON_PIPE: SensorType[] = ['pressure', 'flow', 'voltage', 'fiber', 'level', 'thermal'];

/** Pipe-mounted instruments sit on the crown of their pipe so they stay visible. */
export const SENSORS: Sensor[] = DEFS.map((d, index) => ({
  ...d,
  y: ON_PIPE.includes(d.type) ? LAYERS[d.layer].depth + LAYERS[d.layer].radius * 1.3 + 0.32 : d.y,
  index,
}));
export const SENSOR_BY_ID = new Map(SENSORS.map((s) => [s.id, s]));

export const SENSOR_TYPE_LABEL: Record<SensorType, string> = {
  pressure: 'Pressure Sensor',
  moisture: 'Soil Moisture Probe',
  temperature: 'Ground Temperature Probe',
  flow: 'Flow Meter',
  voltage: 'Feeder Monitor',
  fiber: 'Fiber Monitor',
  level: 'Sewer Level Sensor',
  thermal: 'Thermal Meter',
};
