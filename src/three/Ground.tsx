import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { BoxGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, PlaneGeometry, Quaternion, Vector3 } from 'three';
import { SECTORS, PLINTH, PLINTH_H, DIORAMA, SEA } from '../data/city';
import { TRENCH } from '../data/incident';
import { live } from '../simulation/runtime';
import { useTwinStore } from '../store/useTwinStore';
import { createAsphaltMaterial, createPlinthMaterial, createPropMaterial, createSoilMaterial, createUndersideMaterial } from './materials/surfaceMaterials';

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

/** The cut faces of the diorama slab: soil strata exposed on every side. */
export function Diorama() {
  const soil = useMemo(() => createSoilMaterial(), []);
  const bed = useMemo(() => createPropMaterial({ color: '#0d1114', roughness: 1 }), []);
  const B = DIORAMA.bottom;
  const W = DIORAMA.maxX - DIORAMA.minX;
  const faces = useMemo(() => {
    type F = { pos: [number, number, number]; rotY: number; w: number; h: number };
    const list: F[] = [];
    const mainD = SEA.minZ - DIORAMA.minZ; // 136
    const mainCz = (SEA.minZ + DIORAMA.minZ) / 2;
    const seaD = SEA.maxZ - SEA.minZ;
    const seaCz = (SEA.minZ + SEA.maxZ) / 2;
    const fullH = -B;
    const seabedH = SEA.bed - B;
    // north face (faces -z)
    list.push({ pos: [0, B / 2, DIORAMA.minZ], rotY: Math.PI, w: W, h: fullH });
    // west/east faces of the main slab
    list.push({ pos: [DIORAMA.minX, B / 2, mainCz], rotY: -Math.PI / 2, w: mainD, h: fullH });
    list.push({ pos: [DIORAMA.maxX, B / 2, mainCz], rotY: Math.PI / 2, w: mainD, h: fullH });
    // ground below the sea bed: west/east and the open-water edge (faces +z)
    list.push({ pos: [DIORAMA.minX, B + seabedH / 2, seaCz], rotY: -Math.PI / 2, w: seaD, h: seabedH });
    list.push({ pos: [DIORAMA.maxX, B + seabedH / 2, seaCz], rotY: Math.PI / 2, w: seaD, h: seabedH });
    list.push({ pos: [0, B + seabedH / 2, SEA.maxZ], rotY: 0, w: W, h: seabedH });
    // Corniche quay wall
    const qh = -SEA.bed;
    list.push({ pos: [0, SEA.bed / 2, SEA.minZ], rotY: 0, w: W, h: qh });
    return list;
  }, [B, W]);

  return (
    <group>
      {faces.map((f, i) => (
        <mesh key={i} position={f.pos} rotation-y={f.rotY} material={soil}>
          <planeGeometry args={[f.w, f.h, 1, 1]} />
        </mesh>
      ))}
      {/* sea bed */}
      <mesh rotation-x={-Math.PI / 2} position={[0, SEA.bed, (SEA.minZ + SEA.maxZ) / 2]} material={bed}>
        <planeGeometry args={[W, SEA.maxZ - SEA.minZ]} />
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
  const groundGeo = useMemo(() => new PlaneGeometry(DIORAMA.maxX - DIORAMA.minX, SEA.minZ - DIORAMA.minZ, 1, 1), []);
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
        position={[0, 0, (DIORAMA.minZ + SEA.minZ) / 2]}
        material={asphalt}
        receiveShadow
        onPointerMove={blockIfSolid}
        onClick={(e) => {
          if (e.delta > 4) return;
          blockIfSolid(e);
        }}
        onDoubleClick={() => select(null)}
      />
      <mesh ref={undersideRef} rotation-x={Math.PI / 2} position={[0, -0.04, (DIORAMA.minZ + SEA.minZ) / 2]} material={underside}>
        <planeGeometry args={[DIORAMA.maxX - DIORAMA.minX, SEA.minZ - DIORAMA.minZ]} />
      </mesh>
      <Plinths />
    </group>
  );
}
