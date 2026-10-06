import { useMemo } from 'react';
import { DoubleSide, MeshStandardMaterial, PlaneGeometry } from 'three';
import { DIORAMA, RIVER } from '../data/city';
import { AD } from '../data/abudhabi';
import { G } from './shaders/globals';
import { GLSL_COMMON } from './shaders/glsl';
import { patchMaterial, WORLDPOS_FRAG_HEAD, WORLDPOS_VERT_END, WORLDPOS_VERT_HEAD } from './shaders/patch';
import { GROUND_MAP_UNIFORMS, createPropMaterial } from './materials/surfaceMaterials';
import { wall } from './Ground';

const W = DIORAMA.maxX - DIORAMA.minX;
const D = DIORAMA.maxZ - DIORAMA.minZ;
const CX = (DIORAMA.minX + DIORAMA.maxX) / 2;
const CZ = (DIORAMA.minZ + DIORAMA.maxZ) / 2;

const LAND_MASK = /* glsl */ `
uniform sampler2D uGroundMap;
uniform vec4 uGroundRect;
float landAt(vec2 p) {
  vec2 uv = (p - uGroundRect.xy) * uGroundRect.zw;
  return texture2D(uGroundMap, vec2(uv.x, 1.0 - uv.y)).a;
}
`;

/** The Gulf off the Corniche: turquoise near the seawall, deeper blue further out, small moving waves. */
function createSeaMaterial() {
  const mat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.12, metalness: 0.0, transparent: true, envMapIntensity: 1.1 });
  return patchMaterial(mat, {
    key: 'sea',
    uniforms: { ...GROUND_MAP_UNIFORMS, uTime: G.uTime, uXray: G.uXray },
    vertexHead: WORLDPOS_VERT_HEAD,
    vertexEnd: WORLDPOS_VERT_END,
    fragmentHead: WORLDPOS_FRAG_HEAD + 'uniform float uTime;\nuniform float uXray;\n' + GLSL_COMMON + LAND_MASK,
    fragmentColor: /* glsl */ `
      vec2 sp = vWPos.xz;
      if (landAt(sp) > 0.5) discard;
      // distance from shore, read from the land mask a few steps inland
      float shore = landAt(sp - vec2(0.0, 2.2)) + landAt(sp - vec2(0.0, 4.4)) + landAt(sp - vec2(0.0, 6.6)) + landAt(sp - vec2(0.0, 8.8));
      float shallow = clamp(shore / 2.0, 0.0, 1.0);
      vec3 deep = vec3(0.03, 0.17, 0.25);
      vec3 near = vec3(0.12, 0.42, 0.44);
      diffuseColor.rgb = mix(deep, near, shallow * 0.85);
    `,
    fragmentEmissive: /* glsl */ `
      float w1 = gnoise(sp * 0.9 + vec2(uTime * 0.25, uTime * 0.12));
      float w2 = gnoise(sp * 2.3 - vec2(uTime * 0.18, -uTime * 0.31));
      vec3 wn = vec3((w1 - 0.5) * 0.22 + (w2 - 0.5) * 0.12, 0.0, (w2 - 0.5) * 0.2);
      normal = normalize(normal + (viewMatrix * vec4(wn, 0.0)).xyz);
      totalEmissiveRadiance += vec3(0.6, 0.85, 0.9) * smoothstep(0.82, 0.95, w2) * 0.03;
    `,
    fragmentOutput: /* glsl */ `
      diffuseColor.a = mix(0.94, 0.25, uXray);
    `,
  });
}

function createSeabedMaterial() {
  const mat = new MeshStandardMaterial({ color: '#c2b08f', roughness: 1, metalness: 0, transparent: true });
  return patchMaterial(mat, {
    key: 'seabed',
    uniforms: { ...GROUND_MAP_UNIFORMS, uXray: G.uXray },
    vertexHead: WORLDPOS_VERT_HEAD,
    vertexEnd: WORLDPOS_VERT_END,
    fragmentHead: WORLDPOS_FRAG_HEAD + 'uniform float uXray;\n' + LAND_MASK,
    fragmentColor: 'if (landAt(vWPos.xz) > 0.5) discard;',
    fragmentOutput: 'diffuseColor.a = mix(1.0, 0.15, uXray);',
  });
}

/** The Corniche: sea, sea bed, the stone seawall along the real coastline and the water's cut face at the slab edge. */
export function Sea() {
  const sea = useMemo(() => createSeaMaterial(), []);
  const seabed = useMemo(() => createSeabedMaterial(), []);
  const stone = useMemo(() => createPropMaterial({ color: '#d9cdb5', roughness: 0.85, side: DoubleSide }), []);
  const plane = useMemo(() => new PlaneGeometry(W, D, 1, 1), []);
  const seawall = useMemo(() => wall(AD.coast, RIVER.bed, 0.02), []);

  return (
    <group>
      <mesh geometry={plane} rotation-x={-Math.PI / 2} position={[CX, RIVER.level, CZ]} material={sea} renderOrder={2} />
      <mesh geometry={plane} rotation-x={-Math.PI / 2} position={[CX, RIVER.bed, CZ]} material={seabed} receiveShadow />
      <mesh geometry={seawall} material={stone} castShadow receiveShadow />
    </group>
  );
}
