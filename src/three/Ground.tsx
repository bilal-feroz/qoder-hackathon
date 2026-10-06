import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { BoxGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, PlaneGeometry, Quaternion, Vector3 } from 'three';
import { SECTORS, PLINTH, PLINTH_H, DIORAMA, RIVER } from '../data/city';
import { TRENCH } from '../data/incident';
import { live } from '../simulation/runtime';
import { useTwinStore } from '../store/useTwinStore';
import { createAsphaltMaterial, createPlinthMaterial, createPropMaterial, createSoilMaterial, createUndersideMaterial } from './materials/surfaceMaterials';
import { G } from './shaders/globals';
import { patchMaterial, WORLDPOS_FRAG_HEAD, WORLDPOS_VERT_END, WORLDPOS_VERT_HEAD } from './shaders/patch';
import { GLSL_COMMON } from './shaders/glsl';

const KIND_INDEX = { urban: 0, park: 1, yard: 2, campus: 3 } as const;

/** Stops pointer events from reaching underground assets while the surface is opaque. */
export function blockIfSolid(e: ThreeEvent<PointerEvent | MouseEvent>) {
  if (live.xray > 0.5 || live.exploded > 0.3) return;
  const p = e.point;
  if (live.trench > 0.5 && p.x > TRENCH.minX && p.x < TRENCH.maxX && p.z > TRENCH.minZ && p.z < TRENCH.maxZ) return;
  e.stopPropagation();
}

function Plinths() {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new BoxGeometry(1, 1, 1);
    const kinds = new Float32Array(SECTORS.length);
    const sec = new Float32Array(SECTORS.length);
    SECTORS.forEach((s, i) => {
      kinds[i] = KIND_INDEX[s.kind];
      sec[i] = s.index;
    });
    g.setAttribute('aKind', new InstancedBufferAttribute(kinds, 1));
    g.setAttribute('aSector', new InstancedBufferAttribute(sec, 1));
    return g;
  }, []);
  const material = useMemo(() => createPlinthMaterial(), []);

  useLayoutEffect(() => {
    const m = new Matrix4();
    const q = new Quaternion();
    const s = new Vector3(PLINTH, PLINTH_H, PLINTH);
    SECTORS.forEach((sec, i) => {
      m.compose(new Vector3(sec.x, PLINTH_H / 2, sec.z), q, s);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, []);

  const setHoverSector = useTwinStore((s) => s.setHoverSector);
  const select = useTwinStore((s) => s.select);
  const setPreset = useTwinStore((s) => s.setPreset);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, SECTORS.length]}
      receiveShadow
      onPointerMove={(e) => {
        if (e.instanceId !== undefined) setHoverSector(SECTORS[e.instanceId].id);
        blockIfSolid(e);
      }}
      onPointerOut={() => setHoverSector(null)}
      onClick={(e) => {
        if (e.delta > 4 || e.instanceId === undefined) return;
        if (live.xray > 0.5 || live.exploded > 0.3) return;
        e.stopPropagation();
        const s = SECTORS[e.instanceId];
        select({ info: { kind: 'sector', id: s.id }, point: [s.x, 0.4, s.z] });
        if (s.id === 'B-12') setPreset('sector');
      }}
    />
  );
}

function RiverWater() {
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({ color: '#0b2232', roughness: 0.12, metalness: 0.65, transparent: true, envMapIntensity: 1.1 });
    return patchMaterial(m, {
      key: 'river',
      uniforms: { uTime: G.uTime, uXray: G.uXray },
      vertexHead: WORLDPOS_VERT_HEAD,
      vertexEnd: WORLDPOS_VERT_END,
      fragmentHead: WORLDPOS_FRAG_HEAD + 'uniform float uTime; uniform float uXray;' + GLSL_COMMON,
      fragmentEmissive: /* glsl */ `
        {
          vec2 rp = vWPos.xz;
          float n = gfbm(vec2(rp.x * 0.08 - uTime * 0.12, rp.y * 0.35));
          float streak = smoothstep(0.66, 0.8, gnoise(vec2(rp.x * 0.09 - uTime * 0.25, rp.y * 0.9)));
          totalEmissiveRadiance += vec3(0.03, 0.09, 0.14) * (n * 0.3 + streak * 0.25);
          roughnessFactor = clamp(roughnessFactor + n * 0.25, 0.0, 1.0);
        }
      `,
      fragmentOutput: 'diffuseColor.a = mix(0.94, 0.25, uXray);',
    });
  }, []);
  const side = useMemo(() => createPropMaterial({ color: '#0e3a52', roughness: 0.2, metalness: 0.2, opacity: 0.7, emissive: '#06283a', emissiveIntensity: 0.6 }), []);
  const w = DIORAMA.maxX - DIORAMA.minX;
  const d = RIVER.maxZ - RIVER.minZ;
  const cz = (RIVER.minZ + RIVER.maxZ) / 2;
  const h = RIVER.level - RIVER.bed;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, RIVER.level, cz]} material={mat} receiveShadow>
        <planeGeometry args={[w, d, 1, 1]} />
      </mesh>
      {/* water cross-section on the diorama cut faces */}
      <mesh position={[DIORAMA.minX, RIVER.bed + h / 2, cz]} rotation-y={-Math.PI / 2} material={side}>
        <planeGeometry args={[d, h]} />
      </mesh>
      <mesh position={[DIORAMA.maxX, RIVER.bed + h / 2, cz]} rotation-y={Math.PI / 2} material={side}>
        <planeGeometry args={[d, h]} />
      </mesh>
    </group>
  );
}

/** The cut faces of the diorama slab: soil strata exposed on every side. */
export function Diorama() {
  const soil = useMemo(() => createSoilMaterial(), []);
  const bed = useMemo(() => createPropMaterial({ color: '#0d1114', roughness: 1 }), []);
  const B = DIORAMA.bottom;
  const W = DIORAMA.maxX - DIORAMA.minX;
  const faces = useMemo(() => {
    type F = { pos: [number, number, number]; rotY: number; w: number; h: number };
    const list: F[] = [];
    const mainD = RIVER.minZ - DIORAMA.minZ; // 136
    const mainCz = (RIVER.minZ + DIORAMA.minZ) / 2;
    const chD = RIVER.maxZ - RIVER.minZ;
    const chCz = (RIVER.minZ + RIVER.maxZ) / 2;
    const bankD = DIORAMA.maxZ - RIVER.maxZ;
    const bankCz = (RIVER.maxZ + DIORAMA.maxZ) / 2;
    const fullH = -B;
    // north face (faces -z)
    list.push({ pos: [0, B / 2, DIORAMA.minZ], rotY: Math.PI, w: W, h: fullH });
    // south face of the far bank (faces +z)
    list.push({ pos: [0, B / 2, DIORAMA.maxZ], rotY: 0, w: W, h: fullH });
    // west/east faces of the main slab
    list.push({ pos: [DIORAMA.minX, B / 2, mainCz], rotY: -Math.PI / 2, w: mainD, h: fullH });
    list.push({ pos: [DIORAMA.maxX, B / 2, mainCz], rotY: Math.PI / 2, w: mainD, h: fullH });
    // channel block (below the river bed)
    const chH = RIVER.bed - B;
    list.push({ pos: [DIORAMA.minX, B + chH / 2, chCz], rotY: -Math.PI / 2, w: chD, h: chH });
    list.push({ pos: [DIORAMA.maxX, B + chH / 2, chCz], rotY: Math.PI / 2, w: chD, h: chH });
    // far bank west/east
    list.push({ pos: [DIORAMA.minX, B / 2, bankCz], rotY: -Math.PI / 2, w: bankD, h: fullH });
    list.push({ pos: [DIORAMA.maxX, B / 2, bankCz], rotY: Math.PI / 2, w: bankD, h: fullH });
    // quay walls
    const qh = -RIVER.bed;
    list.push({ pos: [0, RIVER.bed / 2, RIVER.minZ], rotY: 0, w: W, h: qh });
    list.push({ pos: [0, RIVER.bed / 2, RIVER.maxZ], rotY: Math.PI, w: W, h: qh });
    return list;
  }, [B, W]);

  return (
    <group>
      {faces.map((f, i) => (
        <mesh key={i} position={f.pos} rotation-y={f.rotY} material={soil}>
          <planeGeometry args={[f.w, f.h, 1, 1]} />
        </mesh>
      ))}
      {/* river bed */}
      <mesh rotation-x={-Math.PI / 2} position={[0, RIVER.bed, (RIVER.minZ + RIVER.maxZ) / 2]} material={bed}>
        <planeGeometry args={[W, RIVER.maxZ - RIVER.minZ]} />
      </mesh>
      {/* bottom of the slab */}
      <mesh rotation-x={Math.PI / 2} position={[0, B, (DIORAMA.minZ + DIORAMA.maxZ) / 2]} material={bed}>
        <planeGeometry args={[W, DIORAMA.maxZ - DIORAMA.minZ]} />
      </mesh>
    </group>
  );
}

export function Ground() {
  const asphalt = useMemo(() => createAsphaltMaterial(), []);
  const underside = useMemo(() => createUndersideMaterial(), []);
  const bankGeo = useMemo(() => new PlaneGeometry(DIORAMA.maxX - DIORAMA.minX, DIORAMA.maxZ - RIVER.maxZ, 1, 1), []);
  const groundGeo = useMemo(() => new PlaneGeometry(DIORAMA.maxX - DIORAMA.minX, RIVER.minZ - DIORAMA.minZ, 1, 1), []);
  const select = useTwinStore((s) => s.select);
  const undersideRef = useRef<Mesh>(null);

  useFrame(() => {
    if (undersideRef.current) undersideRef.current.visible = live.xray < 0.98 && live.exploded < 0.98;
  });

  return (
    <group>
      <mesh
        geometry={groundGeo}
        rotation-x={-Math.PI / 2}
        position={[0, 0, (DIORAMA.minZ + RIVER.minZ) / 2]}
        material={asphalt}
        receiveShadow
        onPointerMove={blockIfSolid}
        onClick={(e) => {
          if (e.delta > 4) return;
          blockIfSolid(e);
        }}
        onDoubleClick={() => select(null)}
      />
      <mesh geometry={bankGeo} rotation-x={-Math.PI / 2} position={[0, 0, (RIVER.maxZ + DIORAMA.maxZ) / 2]} material={asphalt} receiveShadow />
      <mesh ref={undersideRef} rotation-x={Math.PI / 2} position={[0, -0.04, (DIORAMA.minZ + RIVER.minZ) / 2]} material={underside}>
        <planeGeometry args={[DIORAMA.maxX - DIORAMA.minX, RIVER.minZ - DIORAMA.minZ]} />
      </mesh>
      <Plinths />
      <RiverWater />
    </group>
  );
}
