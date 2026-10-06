import { mulberry32, range, pick, type Rng } from './rng';

/**
 * City layout for the Al Danah digital twin (downtown Abu Dhabi Island, UAE).
 *
 * World units: 1 unit ≈ 10 m horizontally. Underground depths are vertically
 * exaggerated so the utility layers stay legible from a city-scale camera.
 *
 * The grid follows the real street grid (see src/data/geo.ts for the names and the
 * mapping onto the map):
 *  +z → towards the Corniche and the Arabian Gulf (real north-west),
 *  +x → south-west along Hamdan Bin Mohammed Street.
 *  E-W streets (z): local · Zayed The First St · Hamdan Bin Mohammed St · Khalifa Bin Zayed The First St · Corniche St
 *  N-S streets (x): local · Saeed Bin Ahmed Al Otaiba St · local · Sultan Bin Zayed The First St · local · local
 *  Sector grid (the twin's own asset grid): rows A–D (inland → Gulf), columns 10–14.
 *  B-12 is the centre block, on the inland side of Hamdan Bin Mohammed Street.
 */

export const UNIT_METERS = 10;

export const ROW_LABELS = ['A', 'B', 'C', 'D'] as const;
export const COL_LABELS = [10, 11, 12, 13, 14] as const;

export const BLOCK = 20;
export const SIDEWALK = 1.5;
export const PLINTH = BLOCK + SIDEWALK * 2; // 23
export const PLINTH_H = 0.12;

/** N-S street centre lines (x) and E-W street centre lines (z). */
export const STREET_X = [-70, -42, -14, 14, 42, 70] as const;
export const STREET_Z = [-58, -30, 0, 30, 58] as const;
/** Corridor widths (kerb to kerb incl. sidewalks). Hamdan Bin Mohammed Street (z = 0) is the wide one. */
export const STREET_X_W = [8, 8, 8, 8, 8, 8] as const;
export const STREET_Z_W = [8, 8, 12, 8, 8] as const;

export const BLOCK_X = [-56, -28, 0, 28, 56] as const;
export const BLOCK_Z = [-44, -16, 16, 44] as const;

/** Outer edge of the street network */
export const CITY_MIN_X = -74;
export const CITY_MAX_X = 74;
export const CITY_MIN_Z = -62;
export const CITY_MAX_Z = 62;

/** The diorama "slab" the city sits on — its cut faces expose the underground. */
export const DIORAMA = {
  minX: -80,
  maxX: 80,
  minZ: -68,
  maxZ: 92,
  bottom: -14,
} as const;

/** The Arabian Gulf off the Corniche: open water from the quay wall to the edge of the slab. */
export const SEA = { minZ: 68, maxZ: DIORAMA.maxZ, bed: -2.4, level: -1.15 } as const;

export type SectorKind = 'urban' | 'park' | 'yard' | 'campus';

export interface Sector {
  id: string; // e.g. "B-12"
  row: number;
  col: number;
  x: number;
  z: number;
  kind: SectorKind;
  index: number;
}

const SECTOR_KIND: Record<string, SectorKind> = {
  'C-12': 'park',
  'A-14': 'yard',
  'D-14': 'yard',
  'A-11': 'campus',
};

export const SECTORS: Sector[] = (() => {
  const out: Sector[] = [];
  ROW_LABELS.forEach((r, ri) => {
    COL_LABELS.forEach((c, ci) => {
      const id = `${r}-${c}`;
      out.push({ id, row: ri, col: ci, x: BLOCK_X[ci], z: BLOCK_Z[ri], kind: SECTOR_KIND[id] ?? 'urban', index: out.length });
    });
  });
  return out;
})();

export const SECTOR_BY_ID = new Map(SECTORS.map((s) => [s.id, s]));

export function sectorAt(x: number, z: number): Sector | undefined {
  let best: Sector | undefined;
  let bestD = Infinity;
  for (const s of SECTORS) {
    const d = Math.max(Math.abs(s.x - x), Math.abs(s.z - z));
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Buildings                                                           */
/* ------------------------------------------------------------------ */

/** Facade style index used by the building shader. */
export const STYLE = {
  glass: 0,
  concrete: 1,
  residential: 2,
  white: 3,
  warm: 4,
  industrial: 5,
} as const;

export type BuildingKind =
  | 'residential'
  | 'office'
  | 'mixed'
  | 'hospital'
  | 'school'
  | 'depot'
  | 'pumping'
  | 'substation'
  | 'cooling'
  | 'telecom'
  | 'civic'
  | 'mosque';

export interface Tier {
  x: number;
  z: number;
  w: number;
  d: number;
  y0: number;
  h: number;
}

export interface RoofItem {
  type: 'box' | 'cyl' | 'spire';
  x: number;
  z: number;
  y0: number;
  w: number;
  d: number;
  h: number;
}

export interface Building {
  id: number;
  code: string; // BLD-B12-02
  name: string;
  kind: BuildingKind;
  sector: string;
  x: number;
  z: number;
  height: number;
  floors: number;
  occupants: number;
  style: number;
  tint: [number, number, number];
  tiers: Tier[];
  roof: RoofItem[];
  lit: number; // fraction of lit windows
  special: boolean;
}

const KIND_LABEL: Record<BuildingKind, string> = {
  residential: 'Residential tower',
  office: 'Office tower',
  mixed: 'Mixed-use building',
  hospital: 'Hospital',
  school: 'School',
  depot: 'Maintenance depot',
  pumping: 'Water pumping station',
  substation: 'Electrical substation',
  cooling: 'District cooling plant',
  telecom: 'Telecom exchange',
  civic: 'Civic building',
  mosque: 'Mosque',
};

type Profile = 'cbd' | 'residential-high' | 'mixed' | 'low' | 'residential-mid';

const BLOCK_PROFILE: Record<string, Profile> = {
  'A-10': 'mixed',
  'A-12': 'cbd',
  'A-13': 'cbd',
  'B-10': 'residential-mid',
  'B-12': 'residential-high',
  'B-14': 'mixed',
  'C-10': 'residential-mid',
  'C-11': 'mixed',
  'C-13': 'residential-mid',
  'C-14': 'mixed',
  'D-10': 'low',
  'D-12': 'low',
  'D-13': 'residential-mid',
  'B-11': 'mixed',
  'D-11': 'low',
};

interface Lot {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Lot layouts in block-local coords (block interior spans -9..9 after a 1u setback). */
const LOT_TEMPLATES: Lot[][] = [
  // quad
  [
    { x: -4.6, z: -4.6, w: 8.4, d: 8.4 },
    { x: 4.6, z: -4.6, w: 8.4, d: 8.4 },
    { x: -4.6, z: 4.6, w: 8.4, d: 8.4 },
    { x: 4.6, z: 4.6, w: 8.4, d: 8.4 },
  ],
  // big + two
  [
    { x: -3.4, z: -2.0, w: 11, d: 13.6 },
    { x: 6.0, z: -4.6, w: 5.6, d: 8.4 },
    { x: 6.0, z: 4.6, w: 5.6, d: 8.4 },
    { x: -3.4, z: 7.4, w: 11, d: 3.6 },
  ],
  // halves + bar
  [
    { x: -4.6, z: -3.0, w: 8.4, d: 11.6 },
    { x: 4.6, z: -3.0, w: 8.4, d: 11.6 },
    { x: 0, z: 6.8, w: 17.6, d: 4.2 },
  ],
  // tower on podium + pair
  [
    { x: -2.8, z: -2.8, w: 12.2, d: 12.2 },
    { x: 7.0, z: -2.8, w: 3.8, d: 12.2 },
    { x: 0, z: 7.0, w: 17.6, d: 3.8 },
  ],
];

function heightFor(profile: Profile, rng: Rng, lotArea: number): number {
  switch (profile) {
    case 'cbd':
      return lotArea > 90 ? range(17, 27) : range(9, 15);
    case 'residential-high':
      return range(9, 15.5);
    case 'residential-mid':
      return range(4.5, 9);
    case 'mixed':
      return range(3.5, 10);
    case 'low':
      return range(2.2, 4.8);
  }
  function range(a: number, b: number) {
    return a + (b - a) * rng();
  }
}

function styleFor(profile: Profile, rng: Rng): number {
  switch (profile) {
    case 'cbd':
      return rng() < 0.75 ? STYLE.glass : STYLE.concrete;
    case 'residential-high':
    case 'residential-mid':
      return rng() < 0.7 ? STYLE.residential : STYLE.concrete;
    case 'mixed':
      return pick(rng, [STYLE.concrete, STYLE.residential, STYLE.glass, STYLE.warm]);
    case 'low':
      return pick(rng, [STYLE.warm, STYLE.concrete, STYLE.residential]);
  }
}

function kindFor(profile: Profile, rng: Rng): BuildingKind {
  switch (profile) {
    case 'cbd':
      return rng() < 0.8 ? 'office' : 'mixed';
    case 'residential-high':
    case 'residential-mid':
      return rng() < 0.85 ? 'residential' : 'mixed';
    case 'mixed':
      return pick(rng, ['mixed', 'residential', 'office'] as const);
    case 'low':
      return pick(rng, ['residential', 'mixed'] as const);
  }
}

/** Downtown Abu Dhabi palette: sand, cream and white render, pale stone, blue-green and silver glass. */
const TINTS: Record<number, [number, number, number][]> = {
  // curtain-wall glass: teal, blue, silver, bronze
  [STYLE.glass]: [
    [0.2, 0.33, 0.36],
    [0.21, 0.29, 0.38],
    [0.36, 0.4, 0.43],
    [0.34, 0.3, 0.25],
  ],
  // pale concrete / precast
  [STYLE.concrete]: [
    [0.52, 0.5, 0.46],
    [0.47, 0.45, 0.42],
    [0.56, 0.53, 0.48],
  ],
  // rendered residential: sand, cream, beige, off-white, desert rose
  [STYLE.residential]: [
    [0.66, 0.59, 0.49],
    [0.7, 0.66, 0.58],
    [0.61, 0.55, 0.46],
    [0.72, 0.71, 0.67],
    [0.64, 0.53, 0.44],
  ],
  [STYLE.white]: [[0.8, 0.82, 0.82]],
  // stone cladding (the facade shader lays it as a running bond)
  [STYLE.warm]: [
    [0.66, 0.57, 0.44],
    [0.6, 0.52, 0.41],
    [0.7, 0.63, 0.5],
  ],
  [STYLE.industrial]: [
    [0.4, 0.42, 0.44],
    [0.34, 0.38, 0.4],
  ],
};

let nextBuildingId = 0;
const sectorCounters = new Map<string, number>();

function makeCode(sector: string) {
  const n = (sectorCounters.get(sector) ?? 0) + 1;
  sectorCounters.set(sector, n);
  return `BLD-${sector.replace('-', '')}-${String(n).padStart(2, '0')}`;
}

function occupancy(kind: BuildingKind, height: number, tiers: Tier[]) {
  const floors = Math.max(1, Math.round(height / 0.42));
  const footprint = tiers.reduce((acc, t) => acc + t.w * t.d * (t.h / Math.max(height, 0.001)), 0);
  const perFloor = kind === 'residential' ? 1.15 : kind === 'mixed' ? 0.75 : kind === 'office' ? 0.08 : 0;
  return { floors, occupants: Math.round(floors * footprint * perFloor) };
}

function makeBuilding(partial: Omit<Building, 'id' | 'code' | 'floors' | 'occupants' | 'name' | 'tint'> & { name?: string; tint?: [number, number, number] }, rng: Rng): Building {
  const tints = TINTS[partial.style] ?? TINTS[STYLE.concrete];
  return {
    ...partial,
    id: nextBuildingId++,
    code: makeCode(partial.sector),
    name: partial.name ?? KIND_LABEL[partial.kind],
    tint: partial.tint ?? pick(rng, tints),
    ...occupancy(partial.kind, partial.height, partial.tiers),
  };
}

/** Turns a CBD tower into the district's ~330 m signature tower: tapering setbacks under a spire. */
function makeLandmark(b: Building) {
  const base = b.tiers[0];
  const steps: [number, number, number][] = [
    // [footprint scale, from, to]
    [1, 0, 2.4],
    [0.74, 2.4, 18],
    [0.62, 18, 26],
    [0.5, 26, 30.6],
    [0.36, 30.6, 33],
  ];
  b.tiers = steps.map(([k, y0, y1]) => ({ x: base.x, z: base.z, w: base.w * k, d: base.d * k, y0, h: y1 - y0 }));
  b.height = 33;
  b.roof = [{ type: 'spire', x: base.x, z: base.z, y0: 33, w: 0.12, d: 0.12, h: 5 }];
  b.kind = 'office';
  b.style = STYLE.glass;
  b.tint = [0.2, 0.33, 0.37];
  b.lit = 0.3;
  b.special = true;
  Object.assign(b, occupancy(b.kind, b.height, b.tiers));
}

function towerTiers(cx: number, cz: number, w: number, d: number, h: number, rng: Rng, profile: Profile): Tier[] {
  const tiers: Tier[] = [];
  const wantsPodium = profile === 'cbd' && h > 14 && rng() < 0.7;
  if (wantsPodium) {
    const ph = range(rng, 1.6, 2.6);
    tiers.push({ x: cx, z: cz, w, d, y0: 0, h: ph });
    const tw = w * range(rng, 0.62, 0.76);
    const td = d * range(rng, 0.62, 0.76);
    const ox = (w - tw) * (rng() - 0.5) * 0.6;
    const oz = (d - td) * (rng() - 0.5) * 0.6;
    const mid = h * range(rng, 0.68, 0.8);
    tiers.push({ x: cx + ox, z: cz + oz, w: tw, d: td, y0: ph, h: mid - ph });
    const cw = tw * range(rng, 0.7, 0.86);
    const cd = td * range(rng, 0.7, 0.86);
    tiers.push({ x: cx + ox, z: cz + oz, w: cw, d: cd, y0: mid, h: h - mid });
    return tiers;
  }
  if (h > 8.5 && rng() < 0.75) {
    const split = h * range(rng, 0.58, 0.76);
    tiers.push({ x: cx, z: cz, w, d, y0: 0, h: split });
    const tw = w * range(rng, 0.7, 0.86);
    const td = d * range(rng, 0.7, 0.86);
    const ox = (w - tw) * (rng() - 0.5) * 0.8;
    const oz = (d - td) * (rng() - 0.5) * 0.8;
    tiers.push({ x: cx + ox, z: cz + oz, w: tw, d: td, y0: split, h: h - split });
    return tiers;
  }
  tiers.push({ x: cx, z: cz, w, d, y0: 0, h });
  return tiers;
}

function roofFor(top: Tier, h: number, rng: Rng, allowSpire: boolean): RoofItem[] {
  const items: RoofItem[] = [];
  const n = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const w = Math.min(top.w * 0.5, range(rng, 0.9, 2.4));
    const d = Math.min(top.d * 0.5, range(rng, 0.9, 2.0));
    items.push({
      type: 'box',
      x: top.x + (rng() - 0.5) * (top.w - w) * 0.8,
      z: top.z + (rng() - 0.5) * (top.d - d) * 0.8,
      y0: top.y0 + top.h,
      w,
      d,
      h: range(rng, 0.35, 0.9),
    });
  }
  if (h < 6 && rng() < 0.45) {
    const r = range(rng, 0.45, 0.7);
    items.push({ type: 'cyl', x: top.x + (rng() - 0.5) * top.w * 0.4, z: top.z + (rng() - 0.5) * top.d * 0.4, y0: top.y0 + top.h, w: r, d: r, h: range(rng, 0.8, 1.3) });
  }
  if (allowSpire && h > 18) {
    items.push({ type: 'spire', x: top.x, z: top.z, y0: top.y0 + top.h, w: 0.09, d: 0.09, h: range(rng, 3, 5.5) });
  }
  return items;
}

function generateRegularBlock(sectorId: string, bx: number, bz: number, profile: Profile, rng: Rng, template?: number): Building[] {
  const lots = LOT_TEMPLATES[template ?? Math.floor(rng() * LOT_TEMPLATES.length)];
  const out: Building[] = [];
  for (const lot of lots) {
    if (lot.w < 3.5 && lot.d < 3.5) continue;
    const area = lot.w * lot.d;
    // thin "bar" lots become low-rise
    const bar = Math.min(lot.w, lot.d) < 4.5;
    const h = bar ? range(rng, 2, 4.2) : heightFor(profile, rng, area);
    const w = lot.w * range(rng, 0.78, 0.94);
    const d = lot.d * range(rng, 0.78, 0.94);
    const cx = bx + lot.x + (lot.w - w) * (rng() - 0.5);
    const cz = bz + lot.z + (lot.d - d) * (rng() - 0.5);
    const tiers = towerTiers(cx, cz, w, d, h, rng, profile);
    const top = tiers[tiers.length - 1];
    const style = styleFor(profile, rng);
    const kind = bar ? (rng() < 0.5 ? 'mixed' : 'residential') : kindFor(profile, rng);
    out.push(
      makeBuilding(
        {
          kind,
          sector: sectorId,
          x: cx,
          z: cz,
          height: h,
          style,
          tiers,
          roof: roofFor(top, h, rng, profile === 'cbd'),
          lit: range(rng, 0.1, 0.3),
          special: false,
        },
        rng,
      ),
    );
  }
  return out;
}

/* ---------------- special buildings ---------------- */

export interface SpecialSite {
  key: 'hospital' | 'school' | 'depot' | 'pumping' | 'substation' | 'cooling' | 'telecom' | 'mosque';
  name: string;
  sector: string;
  x: number;
  z: number;
}

export const HOSPITAL_POS = { x: 30.5, z: -16.5 };
export const SCHOOL_POS = { x: -24.5, z: -41.5 };
export const DEPOT_POS = { x: 56, z: 44 };
export const PUMP_POS = { x: -24, z: 45 };
export const SUBSTATION_POS = { x: 56, z: -44 };
export const COOLING_PLANT_POS = { x: -31, z: -19 };
export const EXCHANGE_POS = { x: -58, z: -46 };

/**
 * Neighbourhood mosque on the Corniche side of Khalifa Bin Zayed The First Street (D-12).
 * Like many mosques on Abu Dhabi's grid it sits askew to the streets: the prayer hall's
 * qibla wall (local +x) faces Mecca, bearing ≈ 260° from Al Danah, which is 27.8° from the
 * scene's +x (bearing 232.2°) towards +z.
 */
export const MOSQUE = {
  x: -4.4,
  z: 44.2,
  yaw: -0.4855,
  hall: { along: 4.6, across: 5.4, h: 1.25 },
  court: 2.6,
  minaret: 4.8,
} as const;

export const SITES: SpecialSite[] = [
  { key: 'hospital', name: 'General hospital', sector: 'B-13', ...HOSPITAL_POS },
  { key: 'school', name: 'Public school', sector: 'A-11', ...SCHOOL_POS },
  { key: 'depot', name: 'Utility operations depot', sector: 'D-14', ...DEPOT_POS },
  { key: 'pumping', name: 'Water pumping station', sector: 'D-11', ...PUMP_POS },
  { key: 'substation', name: 'Electrical substation', sector: 'A-14', ...SUBSTATION_POS },
  { key: 'cooling', name: 'District cooling plant', sector: 'B-11', ...COOLING_PLANT_POS },
  { key: 'telecom', name: 'Telecom exchange', sector: 'A-10', ...EXCHANGE_POS },
  { key: 'mosque', name: 'Mosque', sector: 'D-12', x: MOSQUE.x, z: MOSQUE.z },
];

function generateSpecials(rng: Rng): Building[] {
  const out: Building[] = [];
  // General hospital — white podium + slab tower (B-13)
  out.push(
    makeBuilding(
      {
        name: 'General hospital',
        kind: 'hospital',
        sector: 'B-13',
        x: HOSPITAL_POS.x,
        z: HOSPITAL_POS.z,
        height: 11.5,
        style: STYLE.white,
        tiers: [
          { x: 28, z: -14.5, w: 17, d: 15.5, y0: 0, h: 2.6 },
          { x: HOSPITAL_POS.x, z: HOSPITAL_POS.z, w: 10.5, d: 6.2, y0: 2.6, h: 8.9 },
          { x: 22.5, z: -19, w: 4.2, d: 6, y0: 2.6, h: 3.4 },
        ],
        roof: [{ type: 'box', x: 34.2, z: -17.5, y0: 11.5, w: 1.6, d: 1.6, h: 0.7 }],
        lit: 0.62,
        special: true,
      },
      rng,
    ),
  );
  // Public school — L-shaped low campus (A-11)
  out.push(
    makeBuilding(
      {
        name: 'Public school',
        kind: 'school',
        sector: 'A-11',
        x: SCHOOL_POS.x,
        z: SCHOOL_POS.z,
        height: 2.6,
        style: STYLE.warm,
        tiers: [
          { x: -27.5, z: -48.8, w: 15.5, d: 4.6, y0: 0, h: 2.6 },
          { x: -22.2, z: -42.5, w: 4.8, d: 8.4, y0: 0, h: 2.2 },
        ],
        roof: [{ type: 'box', x: -30, z: -48.8, y0: 2.6, w: 1.6, d: 1.4, h: 0.5 }],
        lit: 0.5,
        special: true,
      },
      rng,
    ),
  );
  // Utility operations depot — shed + office (D-14)
  out.push(
    makeBuilding(
      {
        name: 'Utility operations depot',
        kind: 'depot',
        sector: 'D-14',
        x: DEPOT_POS.x,
        z: DEPOT_POS.z,
        height: 3.2,
        style: STYLE.industrial,
        tiers: [
          { x: 59, z: 48.5, w: 11, d: 7.5, y0: 0, h: 3.2 },
          { x: 50.5, z: 49.5, w: 5, d: 5, y0: 0, h: 2.1 },
        ],
        roof: [{ type: 'box', x: 61, z: 48, y0: 3.2, w: 2, d: 1.4, h: 0.5 }],
        lit: 0.55,
        special: true,
      },
      rng,
    ),
  );
  // Pumping station (D-11)
  out.push(
    makeBuilding(
      {
        name: 'Water pumping station',
        kind: 'pumping',
        sector: 'D-11',
        x: PUMP_POS.x,
        z: PUMP_POS.z,
        height: 3.0,
        style: STYLE.industrial,
        tiers: [{ x: -22.5, z: 47.5, w: 8, d: 6, y0: 0, h: 3.0 }],
        roof: [],
        lit: 0.4,
        special: true,
      },
      rng,
    ),
  );
  // Substation control building (A-14)
  out.push(
    makeBuilding(
      {
        name: 'Electrical substation',
        kind: 'substation',
        sector: 'A-14',
        x: SUBSTATION_POS.x,
        z: SUBSTATION_POS.z,
        height: 2.4,
        style: STYLE.industrial,
        tiers: [{ x: 50.5, z: -50, w: 6, d: 4.5, y0: 0, h: 2.4 }],
        roof: [],
        lit: 0.3,
        special: true,
      },
      rng,
    ),
  );
  // District cooling plant (B-11)
  out.push(
    makeBuilding(
      {
        name: 'District cooling plant',
        kind: 'cooling',
        sector: 'B-11',
        x: COOLING_PLANT_POS.x,
        z: COOLING_PLANT_POS.z,
        height: 4.2,
        style: STYLE.industrial,
        tiers: [{ x: COOLING_PLANT_POS.x, z: COOLING_PLANT_POS.z, w: 12, d: 8.5, y0: 0, h: 4.2 }],
        roof: [],
        lit: 0.35,
        special: true,
      },
      rng,
    ),
  );
  // Telecom exchange (A-10)
  out.push(
    makeBuilding(
      {
        name: 'Telecom exchange',
        kind: 'telecom',
        sector: 'A-10',
        x: EXCHANGE_POS.x,
        z: EXCHANGE_POS.z,
        height: 6.5,
        style: STYLE.concrete,
        tiers: [{ x: EXCHANGE_POS.x, z: EXCHANGE_POS.z, w: 9, d: 8, y0: 0, h: 6.5 }],
        roof: [
          { type: 'spire', x: -59.5, z: -47, y0: 6.5, w: 0.12, d: 0.12, h: 7 },
          { type: 'box', x: -56, z: -44.5, y0: 6.5, w: 2, d: 1.6, h: 0.6 },
        ],
        lit: 0.3,
        special: true,
      },
      rng,
    ),
  );
  return out;
}

/** Partial blocks: specials occupy part of these sectors, regular buildings fill the rest. */
function generatePartialBlocks(rng: Rng): Building[] {
  const out: Building[] = [];
  const add = (sector: string, lots: Lot[], profile: Profile) => {
    const s = SECTOR_BY_ID.get(sector)!;
    for (const lot of lots) {
      const h = heightFor(profile, rng, lot.w * lot.d);
      const w = lot.w * range(rng, 0.82, 0.94);
      const d = lot.d * range(rng, 0.82, 0.94);
      const cx = s.x + lot.x;
      const cz = s.z + lot.z;
      const tiers = towerTiers(cx, cz, w, d, h, rng, profile);
      out.push(
        makeBuilding(
          {
            kind: kindFor(profile, rng),
            sector,
            x: cx,
            z: cz,
            height: h,
            style: styleFor(profile, rng),
            tiers,
            roof: roofFor(tiers[tiers.length - 1], h, rng, false),
            lit: range(rng, 0.1, 0.28),
            special: false,
          },
          rng,
        ),
      );
    }
  };
  // A-10: exchange in NW corner → two buildings on the east/south
  add('A-10', [
    { x: 6, z: -3, w: 7, d: 11 },
    { x: -1, z: 6.5, w: 15, d: 4.5 },
  ], 'mixed');
  // B-11: cooling plant on the west → residential to the east
  add('B-11', [
    { x: 6.4, z: -4, w: 6.5, d: 9 },
    { x: 3.5, z: 6, w: 12, d: 5 },
  ], 'residential-mid');
  // D-11: pumping station in the SE → buildings to the north/west
  add('D-11', [
    { x: -4.5, z: -4.5, w: 8.5, d: 8.5 },
    { x: 5, z: -5, w: 7, d: 7.5 },
  ], 'low');
  return out;
}

function generateCity(): Building[] {
  nextBuildingId = 0;
  sectorCounters.clear();
  const rng = mulberry32(20261006);
  const buildings: Building[] = [];
  buildings.push(...generateSpecials(rng));
  buildings.push(...generatePartialBlocks(rng));
  const templates: Record<string, number> = {
    'A-12': 3,
    'A-13': 1,
    'B-12': 0,
    'B-10': 2,
    'B-14': 1,
    'C-10': 0,
    'C-11': 2,
    'C-13': 0,
    'C-14': 3,
    'D-10': 0,
    'D-12': 2,
    'D-13': 1,
  };
  for (const s of SECTORS) {
    const profile = BLOCK_PROFILE[s.id];
    if (!profile) continue;
    if (['A-10', 'B-11', 'D-11'].includes(s.id)) continue; // handled as partial blocks
    let block = generateRegularBlock(s.id, s.x, s.z, profile, rng, templates[s.id]);
    // D-12: the mosque and its Corniche-side forecourt take the (−x) half and the bar lot;
    // the block is still generated in full so the random sequence for later blocks is unchanged
    if (s.id === 'D-12') block = block.filter((b) => b.x > s.x && b.z < s.z + 4.5);
    buildings.push(...block);
  }
  makeLandmark(buildings.filter((b) => b.sector === 'A-12').sort((a, b) => b.height - a.height)[0]);
  buildings.push(
    makeBuilding(
      {
        kind: 'mosque',
        sector: 'D-12',
        x: MOSQUE.x,
        z: MOSQUE.z,
        height: MOSQUE.minaret,
        style: STYLE.white,
        tint: [0.86, 0.84, 0.8],
        tiers: [], // drawn by three/Mosque.tsx (it sits askew to the grid, facing the qibla)
        roof: [],
        lit: 0,
        special: true,
      },
      rng,
    ),
  );
  return buildings;
}

export const BUILDINGS: Building[] = generateCity();
export const BUILDING_BY_ID = new Map(BUILDINGS.map((b) => [b.id, b]));

export function buildingLabel(kind: BuildingKind) {
  return KIND_LABEL[kind];
}
