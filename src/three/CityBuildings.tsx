import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, CylinderGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, SphereGeometry, Vector3, type Raycaster, type Intersection } from 'three';
import { BUILDINGS, BUILDING_BY_ID, PLINTH_H } from '../data/city';
import { live } from '../simulation/runtime';
import { G } from './shaders/globals';
import { useTwinStore } from '../store/useTwinStore';
import { createBuildingGhostMaterial, createBuildingSolidMaterial } from './materials/buildingMaterials';
import { createGlowMaterial, createPropMaterial } from './materials/surfaceMaterials';

const noRaycast = (_r: Raycaster, _i: Intersection[]) => {};

interface TierRef {
  buildingId: number;
}

export function CityBuildings() {
  const tiers = useMemo(() => BUILDINGS.flatMap((b) => b.tiers.map((t) => ({ b, t }))), []);
  const tierOwner = useMemo<TierRef[]>(() => tiers.map(({ b }) => ({ buildingId: b.id })), [tiers]);

  const geometry = useMemo(() => {
    const g = new BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    const n = tiers.length;
    const aSeed = new Float32Array(n);
    const aBldg = new Float32Array(n);
    const aStyle = new Float32Array(n);
    const aLit = new Float32Array(n);
    const aPoi = new Float32Array(n);
    const aShop = new Float32Array(n);
    const aTint = new Float32Array(n * 3);
    const aCenter = new Float32Array(n * 2);
    tiers.forEach(({ b, t }, i) => {
      aSeed[i] = ((b.id * 0.618034) % 1) * 9.7 + 0.3;
      aBldg[i] = b.id;
      aStyle[i] = b.style;
      aLit[i] = b.lit;
      aPoi[i] = b.kind === 'hospital' || b.kind === 'school' ? 1 : 0;
      aShop[i] = (b.kind === 'mixed' || b.kind === 'office') && t.y0 === 0 ? 1 : 0;
      aTint.set(b.tint, i * 3);
      aCenter.set([b.x, b.z], i * 2);
    });
    g.setAttribute('aSeed', new InstancedBufferAttribute(aSeed, 1));
    g.setAttribute('aBldg', new InstancedBufferAttribute(aBldg, 1));
    g.setAttribute('aStyle', new InstancedBufferAttribute(aStyle, 1));
    g.setAttribute('aLit', new InstancedBufferAttribute(aLit, 1));
    g.setAttribute('aPoi', new InstancedBufferAttribute(aPoi, 1));
    g.setAttribute('aShop', new InstancedBufferAttribute(aShop, 1));
    g.setAttribute('aTint', new InstancedBufferAttribute(aTint, 3));
    g.setAttribute('aCenter', new InstancedBufferAttribute(aCenter, 2));
    return g;
  }, [tiers]);

  const solidMat = useMemo(() => createBuildingSolidMaterial(), []);
  const ghostMat = useMemo(() => createBuildingGhostMaterial(), []);
  const solidRef = useRef<InstancedMesh>(null);
  const ghostRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const solid = solidRef.current!;
    const ghost = ghostRef.current!;
    const m = new Matrix4();
    const q = new Quaternion();
    tiers.forEach(({ t }, i) => {
      m.compose(new Vector3(t.x, t.y0 + PLINTH_H, t.z), q, new Vector3(t.w, t.h, t.d));
      solid.setMatrixAt(i, m);
    });
    solid.instanceMatrix.needsUpdate = true;
    ghost.instanceMatrix = solid.instanceMatrix;
    solid.computeBoundingSphere();
    ghost.computeBoundingSphere();
  }, [tiers]);

  useFrame(() => {
    const solid = solidRef.current;
    const ghost = ghostRef.current;
    if (!solid || !ghost) return;
    const gx = G.uXray.value;
    solid.visible = gx < 0.995;
    ghost.visible = gx > 0.004;
    solidMat.depthWrite = gx < 0.55;
    solid.castShadow = gx < 0.5;
    solid.raycast = gx > 0.5 || live.exploded > 0.3 ? noRaycast : InstancedMesh.prototype.raycast;
  });

  const setHover = useTwinStore((s) => s.setHover);
  const setHoverSector = useTwinStore((s) => s.setHoverSector);
  const select = useTwinStore((s) => s.select);

  return (
    <group>
      <instancedMesh
        ref={solidRef}
        args={[geometry, solidMat, tiers.length]}
        castShadow
        receiveShadow
        onPointerMove={(e) => {
          if (e.instanceId === undefined) return;
          e.stopPropagation();
          const b = BUILDING_BY_ID.get(tierOwner[e.instanceId].buildingId)!;
          setHover({ kind: 'building', id: b.id });
          setHoverSector(b.sector);
        }}
        onPointerOut={() => {
          setHover(null);
        }}
        onClick={(e) => {
          if (e.delta > 4 || e.instanceId === undefined) return;
          e.stopPropagation();
          const b = BUILDING_BY_ID.get(tierOwner[e.instanceId].buildingId)!;
          select({ info: { kind: 'building', id: b.id }, point: [e.point.x, e.point.y, e.point.z] });
        }}
      />
      <instancedMesh ref={ghostRef} args={[geometry, ghostMat, tiers.length]} frustumCulled={false} raycast={noRaycast} renderOrder={5} />
      <RoofDetails />
    </group>
  );
}

function RoofDetails() {
  const items = useMemo(() => BUILDINGS.flatMap((b) => b.roof), []);
  const boxes = useMemo(() => items.filter((r) => r.type === 'box'), [items]);
  const cyls = useMemo(() => items.filter((r) => r.type === 'cyl'), [items]);
  const spires = useMemo(() => items.filter((r) => r.type === 'spire'), [items]);

  const boxGeo = useMemo(() => new BoxGeometry(1, 1, 1).translate(0, 0.5, 0), []);
  const cylGeo = useMemo(() => new CylinderGeometry(1, 1, 1, 14).translate(0, 0.5, 0), []);
  const spireGeo = useMemo(() => new CylinderGeometry(0.25, 1, 1, 6).translate(0, 0.5, 0), []);
  const lightGeo = useMemo(() => new SphereGeometry(0.16, 10, 8), []);

  const boxMat = useMemo(() => createPropMaterial({ color: '#4a5260', roughness: 0.7, metalness: 0.2 }), []);
  const tankMat = useMemo(() => createPropMaterial({ color: '#5a6170', roughness: 0.6, metalness: 0.3 }), []);
  const spireMat = useMemo(() => createPropMaterial({ color: '#8a93a3', roughness: 0.4, metalness: 0.7 }), []);
  const aviationMat = useMemo(() => createGlowMaterial('#ff3b30', 6, 0.5), []);

  const boxRef = useRef<InstancedMesh>(null);
  const cylRef = useRef<InstancedMesh>(null);
  const spireRef = useRef<InstancedMesh>(null);
  const lightRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new Matrix4();
    const q = new Quaternion();
    boxes.forEach((r, i) => {
      m.compose(new Vector3(r.x, r.y0 + PLINTH_H, r.z), q, new Vector3(r.w, r.h, r.d));
      boxRef.current!.setMatrixAt(i, m);
    });
    cyls.forEach((r, i) => {
      m.compose(new Vector3(r.x, r.y0 + PLINTH_H, r.z), q, new Vector3(r.w, r.h, r.d));
      cylRef.current!.setMatrixAt(i, m);
    });
    spires.forEach((r, i) => {
      m.compose(new Vector3(r.x, r.y0 + PLINTH_H, r.z), q, new Vector3(r.w, r.h, r.d));
      spireRef.current!.setMatrixAt(i, m);
      m.compose(new Vector3(r.x, r.y0 + PLINTH_H + r.h + 0.05, r.z), q, new Vector3(1, 1, 1));
      lightRef.current!.setMatrixAt(i, m);
    });
    [boxRef, cylRef, spireRef, lightRef].forEach((r) => {
      r.current!.instanceMatrix.needsUpdate = true;
      r.current!.computeBoundingSphere();
    });
  }, [boxes, cyls, spires]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const on = (Math.sin(t * 2.6) > 0.55 ? 1 : 0.08) * (1 - G.uXray.value * 0.6);
    aviationMat.color.setRGB(6 * on, 0.35 * on, 0.3 * on);
    if (boxRef.current) boxRef.current.castShadow = G.uXray.value < 0.5;
  });

  return (
    <group>
      <instancedMesh ref={boxRef} args={[boxGeo, boxMat, Math.max(1, boxes.length)]} castShadow receiveShadow raycast={noRaycast} />
      <instancedMesh ref={cylRef} args={[cylGeo, tankMat, Math.max(1, cyls.length)]} castShadow raycast={noRaycast} />
      <instancedMesh ref={spireRef} args={[spireGeo, spireMat, Math.max(1, spires.length)]} castShadow raycast={noRaycast} />
      <instancedMesh ref={lightRef} args={[lightGeo, aviationMat, Math.max(1, spires.length)]} raycast={noRaycast} />
    </group>
  );
}
