import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, Color, InstancedMesh, Matrix4, Quaternion, Vector3, type Intersection, type Raycaster } from 'three';
import { STREET_X, STREET_Z } from '../data/city';
import { mulberry32 } from '../data/rng';
import { createGlowMaterial, createPropMaterial } from './materials/surfaceMaterials';
import { live } from '../simulation/runtime';

const noRaycast = (_r: Raycaster, _i: Intersection[]) => {};

interface Loop {
  pts: Vector3[];
  lengths: number[];
  total: number;
}

/** Rectangular block loops in lattice indices; none crosses the excavation on Riverside Avenue. */
const LOOP_DEFS: [number, number, number, number, number][] = [
  // i0, j0, i1, j1, cars
  [0, 0, 2, 1, 4],
  [2, 0, 5, 1, 5],
  [0, 1, 2, 3, 5],
  [3, 1, 5, 3, 5],
  [0, 3, 5, 4, 6],
  [2, 3, 4, 4, 3],
  [0, 0, 5, 4, 8],
  [2, 0, 3, 4, 4],
  [1, 2, 2, 4, 3],
  [3, 2, 4, 4, 3],
];

function laneOffset(j: number) {
  return j === 2 ? 2.25 : 1.25;
}

function buildLoop(i0: number, j0: number, i1: number, j1: number, reverse: boolean): Loop {
  const X0 = STREET_X[i0];
  const X1 = STREET_X[i1];
  const Z0 = STREET_Z[j0];
  const Z1 = STREET_Z[j1];
  let corners = [
    { x: X0, z: Z0, jz: j0 },
    { x: X1, z: Z0, jz: j0 },
    { x: X1, z: Z1, jz: j1 },
    { x: X0, z: Z1, jz: j1 },
  ];
  if (reverse) corners = corners.reverse();
  // offset each edge to its right-hand lane and intersect consecutive offset lines (axis-aligned)
  const n = corners.length;
  const edges = corners.map((c, k) => {
    const d = corners[(k + 1) % n];
    const dir = new Vector3(d.x - c.x, 0, d.z - c.z).normalize();
    const right = new Vector3(-dir.z, 0, dir.x);
    const horizontal = Math.abs(dir.x) > 0.5;
    const off = horizontal ? laneOffset(c.jz) : 1.25;
    return { a: new Vector3(c.x, 0, c.z).addScaledVector(right, off), dir, horizontal };
  });
  const pts: Vector3[] = [];
  for (let k = 0; k < n; k++) {
    const e1 = edges[(k + n - 1) % n];
    const e2 = edges[k];
    // corner where previous edge line meets this edge line
    const p = e1.horizontal ? new Vector3(e2.a.x, 0.02, e1.a.z) : new Vector3(e1.a.x, 0.02, e2.a.z);
    pts.push(p);
  }
  pts.push(pts[0].clone());
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, lengths, total: lengths[lengths.length - 1] };
}

interface Car {
  loop: Loop;
  offset: number;
  speed: number;
}

export function Traffic() {
  const { cars, colors } = useMemo(() => {
    const rng = mulberry32(4242);
    const list: Car[] = [];
    LOOP_DEFS.forEach(([i0, j0, i1, j1, count], li) => {
      const loop = buildLoop(i0, j0, i1, j1, li % 2 === 1);
      for (let c = 0; c < count; c++) {
        list.push({ loop, offset: (c / count) * loop.total + rng() * 4, speed: 2.4 + rng() * 1.2 });
      }
    });
    const palette = ['#d9dde2', '#9aa3ad', '#2a2f37', '#1b2a44', '#6b1f24', '#c9c2b4', '#3e4a5a'];
    return { cars: list, colors: list.map(() => new Color(palette[Math.floor(rng() * palette.length)])) };
  }, []);

  const bodyRef = useRef<InstancedMesh>(null);
  const lightRef = useRef<InstancedMesh>(null);
  const bodyGeo = useMemo(() => new BoxGeometry(0.22, 0.16, 0.48).translate(0, 0.1, 0), []);
  const lightGeo = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const bodyMat = useMemo(() => createPropMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.55 }), []);
  const lightMat = useMemo(() => createGlowMaterial('#ffffff', 1, 0.1), []);

  const m = useMemo(() => new Matrix4(), []);
  const q = useMemo(() => new Quaternion(), []);
  const pos = useMemo(() => new Vector3(), []);
  const one = useMemo(() => new Vector3(1, 1, 1), []);
  const lightScale = useMemo(() => new Vector3(0.18, 0.05, 0.03), []);
  const head = useMemo(() => new Color('#fff1d6').multiplyScalar(4.5), []);
  const tail = useMemo(() => new Color('#ff2a1f').multiplyScalar(3.2), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);
  const initialized = useRef(false);

  useFrame(({ clock }) => {
    const body = bodyRef.current;
    const lights = lightRef.current;
    if (!body || !lights) return;
    const t = clock.elapsedTime;
    const fade = 1 - live.exploded;
    cars.forEach((car, i) => {
      const L = car.loop;
      const d = (car.offset + t * car.speed) % L.total;
      let k = 1;
      while (k < L.lengths.length - 1 && L.lengths[k] < d) k++;
      const a = L.pts[k - 1];
      const b = L.pts[k];
      const f = (d - L.lengths[k - 1]) / (L.lengths[k] - L.lengths[k - 1]);
      pos.copy(a).lerp(b, f);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      q.setFromAxisAngle(up, yaw);
      m.compose(pos, q, one);
      body.setMatrixAt(i, m);
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      m.compose(new Vector3(pos.x + fx * 0.245, pos.y + 0.12, pos.z + fz * 0.245), q, lightScale);
      lights.setMatrixAt(i * 2, m);
      m.compose(new Vector3(pos.x - fx * 0.245, pos.y + 0.12, pos.z - fz * 0.245), q, lightScale);
      lights.setMatrixAt(i * 2 + 1, m);
      if (!initialized.current) {
        body.setColorAt(i, colors[i]);
        lights.setColorAt(i * 2, head);
        lights.setColorAt(i * 2 + 1, tail);
      }
    });
    if (!initialized.current) {
      initialized.current = true;
      if (body.instanceColor) body.instanceColor.needsUpdate = true;
      if (lights.instanceColor) lights.instanceColor.needsUpdate = true;
    }
    body.instanceMatrix.needsUpdate = true;
    lights.instanceMatrix.needsUpdate = true;
    body.visible = lights.visible = fade > 0.05;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[bodyGeo, bodyMat, cars.length]} frustumCulled={false} raycast={noRaycast} castShadow />
      <instancedMesh ref={lightRef} args={[lightGeo, lightMat, cars.length * 2]} frustumCulled={false} raycast={noRaycast} />
    </group>
  );
}
