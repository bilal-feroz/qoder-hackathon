import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, ShaderMaterial, Vector2, type Intersection, type Raycaster } from 'three';
import { Truck } from 'lucide-react';
import { CREW_ROUTE, POI, TRENCH } from '../data/incident';
import { live } from '../simulation/runtime';
import { G } from './shaders/globals';
import { FadeHtml } from './labels/FadeHtml';
import { createGlowMaterial, createPropMaterial } from './materials/surfaceMaterials';
import { useRaf } from '../hooks/useRaf';

const noRaycast = (_r: Raycaster, _i: Intersection[]) => {};
const Y = 0.17;

/** Polyline with rounded corners, sampled by arc length. */
function sampleRoute(pts: [number, number][], radius = 1.6, step = 0.25) {
  const out: Vector2[] = [];
  const P = pts.map((p) => new Vector2(p[0], p[1]));
  out.push(P[0].clone());
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1];
    const b = P[i];
    const c = P[i + 1];
    const dirIn = b.clone().sub(a).normalize();
    const segLen = a.distanceTo(b);
    const r = c ? Math.min(radius, segLen / 2, b.distanceTo(c) / 2) : 0;
    const end = b.clone().addScaledVector(dirIn, -r);
    const last = out[out.length - 1];
    const n = Math.max(1, Math.floor(last.distanceTo(end) / step));
    for (let k = 1; k <= n; k++) out.push(last.clone().lerp(end, k / n));
    if (c && r > 0) {
      const dirOut = c.clone().sub(b).normalize();
      const start = b.clone().addScaledVector(dirOut, r);
      for (let k = 1; k <= 8; k++) {
        const t = k / 8;
        const p = end
          .clone()
          .multiplyScalar((1 - t) * (1 - t))
          .add(b.clone().multiplyScalar(2 * (1 - t) * t))
          .add(start.clone().multiplyScalar(t * t));
        out.push(p);
      }
    }
  }
  const lengths = [0];
  for (let i = 1; i < out.length; i++) lengths.push(lengths[i - 1] + out[i].distanceTo(out[i - 1]));
  return { points: out, lengths, total: lengths[lengths.length - 1] };
}

const ROUTE = sampleRoute(CREW_ROUTE);

function pointAt(d: number) {
  const { points, lengths } = ROUTE;
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < d) i++;
  const t = (d - lengths[i - 1]) / Math.max(1e-6, lengths[i] - lengths[i - 1]);
  const p = points[i - 1].clone().lerp(points[i], Math.min(1, Math.max(0, t)));
  const dir = points[i].clone().sub(points[i - 1]).normalize();
  return { p, dir };
}

function RouteRibbon() {
  const geo = useMemo(() => {
    const { points, lengths } = ROUTE;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const w = 0.55;
    for (let i = 0; i < points.length; i++) {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const t = next.clone().sub(prev).normalize();
      const n = new Vector2(-t.y, t.x);
      const p = points[i];
      pos.push(p.x + n.x * w, Y, p.y + n.y * w, p.x - n.x * w, Y, p.y - n.y * w);
      uv.push(lengths[i], 0, lengths[i], 1);
      if (i < points.length - 1) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: G.uTime,
          uProgress: { value: 0 },
          uAmount: { value: 0 },
          uTotal: { value: ROUTE.total },
          uColor: { value: new Color('#f2f6ff').multiplyScalar(1.9) },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uProgress;
          uniform float uAmount;
          uniform float uTotal;
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            float s = vUv.x;
            float head = uProgress * uTotal;
            if (s > head) discard;
            float cell = fract(s / 0.9 - uTime * 2.2);
            vec2 q = vec2((cell - 0.5) * 0.9, (vUv.y - 0.5) * 1.1);
            float dotM = 1.0 - smoothstep(0.17, 0.24, length(q));
            float core = 1.0 - smoothstep(0.0, 0.08, abs(vUv.y - 0.5));
            float headGlow = exp(-(head - s) * 1.2);
            float a = (dotM * 0.9 + core * 0.12 + headGlow * 0.8) * uAmount;
            gl_FragColor = vec4(uColor * a, 1.0);
          }
        `,
      }),
    [],
  );
  useFrame(() => {
    mat.uniforms.uProgress.value = live.route;
    mat.uniforms.uAmount.value = live.routeVisible;
  });
  return <mesh geometry={geo} material={mat} raycast={noRaycast} renderOrder={8} />;
}

function CrewTruck() {
  const ref = useRef<Group>(null);
  const body = useMemo(() => createPropMaterial({ color: '#d9dde3', roughness: 0.45, metalness: 0.2 }), []);
  const accent = useMemo(() => createPropMaterial({ color: '#f08a24', roughness: 0.5, metalness: 0.1, emissive: '#f08a24', emissiveIntensity: 0.25 }), []);
  const beacon = useMemo(() => createGlowMaterial('#ffb02e', 6, 0.6), []);
  const beaconRef = useRef<Mesh>(null);
  const haloMat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uTime: G.uTime, uColor: { value: new Color('#ffc46b').multiplyScalar(1.4) } },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform vec3 uColor; varying vec2 vP;
          void main() {
            float d = length(vP) / 3.0;
            float ring = (1.0 - smoothstep(0.0, 0.06, abs(d - fract(uTime * 0.9)))) * (1.0 - fract(uTime * 0.9));
            float core = exp(-d * d * 18.0) * 0.5;
            gl_FragColor = vec4(uColor * (ring * 0.8 + core), 1.0);
          }
        `,
      }),
    [],
  );
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const vis = live.routeVisible;
    g.visible = vis > 0.02;
    const { p, dir } = pointAt(live.truck * ROUTE.total);
    g.position.set(p.x, 0.02, p.y);
    g.rotation.y = Math.atan2(dir.x, dir.y);
    g.scale.setScalar(Math.max(0.001, vis));
    const on = Math.sin(clock.elapsedTime * 10) > 0 ? 1 : 0.15;
    beacon.color.setRGB(6 * on, 3.4 * on, 0.4 * on);
    if (beaconRef.current) beaconRef.current.visible = on > 0.5;
  });
  return (
    <group ref={ref}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.2, 0]} material={haloMat}>
        <planeGeometry args={[6, 6]} />
      </mesh>
      <group scale={3.1}>
        <mesh position={[0, 0.16, -0.12]} material={body} castShadow>
          <boxGeometry args={[0.36, 0.3, 0.62]} />
        </mesh>
        <mesh position={[0, 0.13, 0.28]} material={accent} castShadow>
          <boxGeometry args={[0.34, 0.24, 0.2]} />
        </mesh>
        <mesh position={[0, 0.06, -0.12]} material={accent}>
          <boxGeometry args={[0.37, 0.04, 0.63]} />
        </mesh>
        <mesh ref={beaconRef} position={[0, 0.28, 0.26]} material={beacon}>
          <boxGeometry args={[0.18, 0.05, 0.06]} />
        </mesh>
      </group>
      <FadeHtml position={[0, 2.6, 0]} opacity={() => live.routeVisible * (1 - live.exploded)} zIndex={32} center>
        <TruckLabel />
      </FadeHtml>
    </group>
  );
}

function TruckLabel() {
  const ref = useRef<HTMLSpanElement>(null);
  useRaf(() => {
    if (!ref.current) return;
    const txt = live.truck > 0.985 ? 'ON SITE' : `ETA ${Math.max(1, Math.round(18 * (1 - live.truck)))} min`;
    if (ref.current.textContent !== txt) ref.current.textContent = txt;
  });
  return (
    <div className="crew-chip">
      <Truck size={13} strokeWidth={2.2} />
      <span>Crew 07</span>
      <b className="tnum" ref={ref}>
        ETA 18 min
      </b>
    </div>
  );
}

function DepotBeacon() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uTime: G.uTime, uAmount: { value: 0 }, uColor: { value: new Color('#dfe8ff').multiplyScalar(1.6) } },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform float uAmount; uniform vec3 uColor; varying vec2 vP;
          void main() {
            float d = length(vP) / 4.0;
            float a = 0.0;
            for (int k = 0; k < 2; k++) {
              float r = fract(uTime * 0.6 + float(k) * 0.5);
              a += (1.0 - smoothstep(0.0, 0.05, abs(d - r))) * (1.0 - r);
            }
            gl_FragColor = vec4(uColor * a * uAmount, 1.0);
          }
        `,
      }),
    [],
  );
  useFrame(() => {
    mat.uniforms.uAmount.value = live.routeVisible * (1 - live.truck * 0.6);
  });
  const start = CREW_ROUTE[0];
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[start[0], 0.2, start[1]]} material={mat} raycast={noRaycast}>
        <planeGeometry args={[8, 8]} />
      </mesh>
      <FadeHtml position={[POI.depot.x, POI.depot.y + 2.4, POI.depot.z]} opacity={() => live.routeVisible * (1 - live.truck)} zIndex={21}>
        <div className="poi-badge is-depot">
          <span className="poi-icon">
            <Truck size={14} strokeWidth={2.2} />
          </span>
          <div>
            <div className="poi-name">{POI.depot.name}</div>
            <div className="poi-meta">Crew 07 available · 3 technicians</div>
          </div>
        </div>
      </FadeHtml>
    </group>
  );
}

/** Barriers around the work zone once the crew is on site. */
function WorkZone() {
  const ref = useRef<Group>(null);
  const white = useMemo(() => createPropMaterial({ color: '#e8ebef', roughness: 0.5 }), []);
  const orange = useMemo(() => createPropMaterial({ color: '#f07c1e', roughness: 0.5, emissive: '#f07c1e', emissiveIntensity: 0.35 }), []);
  const barriers = useMemo(() => {
    const out: { x: number; z: number; r: number }[] = [];
    for (let x = TRENCH.minX; x <= TRENCH.maxX; x += 2.3) {
      out.push({ x, z: TRENCH.minZ - 0.5, r: 0 });
      out.push({ x, z: TRENCH.maxZ + 0.5, r: 0 });
    }
    out.push({ x: TRENCH.minX - 0.5, z: 0, r: Math.PI / 2 });
    out.push({ x: TRENCH.maxX + 0.5, z: -2.2, r: Math.PI / 2 });
    out.push({ x: TRENCH.maxX + 0.5, z: 2.2, r: Math.PI / 2 });
    return out;
  }, []);
  useFrame(() => {
    if (!ref.current) return;
    const v = live.truck > 0.98 ? live.routeVisible : 0;
    ref.current.visible = v > 0.02;
    ref.current.scale.y = Math.max(0.001, v);
  });
  return (
    <group ref={ref}>
      {barriers.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation-y={b.r}>
          <mesh position={[0, 0.32, 0]} material={i % 2 ? white : orange}>
            <boxGeometry args={[1.7, 0.16, 0.08]} />
          </mesh>
          <mesh position={[-0.75, 0.2, 0]} material={white}>
            <boxGeometry args={[0.06, 0.4, 0.06]} />
          </mesh>
          <mesh position={[0.75, 0.2, 0]} material={white}>
            <boxGeometry args={[0.06, 0.4, 0.06]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function RepairRoute() {
  return (
    <group>
      <RouteRibbon />
      <CrewTruck />
      <DepotBeacon />
      <WorkZone />
    </group>
  );
}
