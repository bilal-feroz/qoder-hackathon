import { AdditiveBlending, MeshStandardMaterial, ShaderMaterial } from 'three';
import { G } from '../shaders/globals';
import { GLSL_COMMON } from '../shaders/glsl';
import { patchMaterial } from '../shaders/patch';
import { FOG_DENSITY } from '../sceneConfig';

const INSTANCE_ATTRS = /* glsl */ `
attribute float aSeed;
attribute float aBldg;
attribute float aStyle;
attribute float aLit;
attribute float aPoi;
attribute float aShop;
attribute vec3 aTint;
attribute vec2 aCenter;
`;

const BUILDING_VARYINGS = /* glsl */ `
varying vec3 vBox;
varying vec3 vSize;
varying vec3 vObjN;
varying vec3 vLocal;
varying vec2 vCenter;
varying float vSeed;
varying float vBldg;
varying float vStyle;
varying float vLit;
varying float vPoi;
varying float vShop;
varying vec3 vTint;
`;

const BUILDING_VERTEX_ASSIGN = /* glsl */ `
vBox = position;
vObjN = normal;
vSize = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
vLocal = (instanceMatrix * vec4(position, 1.0)).xyz;
vCenter = aCenter;
vSeed = aSeed;
vBldg = aBldg;
vStyle = aStyle;
vLit = aLit;
vPoi = aPoi;
vShop = aShop;
vTint = aTint;
`;

/** Window grid + facade logic shared by the solid and ghost materials. */
const FACADE_GLSL = /* glsl */ `
struct Facade {
  float side;
  float top;
  float win;
  float lit;
  float warm;
  float edgeDist;
  float floorLine;
};

Facade facade() {
  Facade f;
  vec3 n = vObjN;
  f.top = step(0.5, n.y);
  float bottom = step(0.5, -n.y);
  f.side = 1.0 - f.top - bottom;
  bool xFace = abs(n.x) > 0.5;
  float u = xFace ? vLocal.z : vLocal.x;
  float v = vLocal.y;

  // style table
  float colW = 0.6; float winW = 0.5; float winH = 0.5; float floorH = 0.42;
  if (vStyle < 0.5) { colW = 0.5; winW = 0.84; winH = 0.66; }
  else if (vStyle < 1.5) { colW = 0.62; winW = 0.5; winH = 0.5; }
  else if (vStyle < 2.5) { colW = 0.74; winW = 0.46; winH = 0.52; }
  else if (vStyle < 3.5) { colW = 0.56; winW = 0.62; winH = 0.46; }
  else if (vStyle < 4.5) { colW = 0.6; winW = 0.42; winH = 0.56; }
  else { colW = 1.25; winW = 0.72; winH = 0.26; floorH = 0.7; }

  vec2 cell = vec2(u / colW, v / floorH);
  vec2 fw = fwidth(cell);
  vec2 ci = floor(cell);
  vec2 cf = fract(cell);
  float wx = 1.0 - smoothstep(winW * 0.5 - fw.x, winW * 0.5 + fw.x, abs(cf.x - 0.5));
  float wy = 1.0 - smoothstep(winH * 0.5 - fw.y, winH * 0.5 + fw.y, abs(cf.y - 0.55));
  float win = wx * wy;

  // half extents of this face (world units) and distance to its border
  vec2 hb = xFace ? vec2(vSize.z * 0.5, vSize.y * 0.5) : vec2(vSize.x * 0.5, vSize.y * 0.5);
  vec2 fc = xFace ? vec2(vBox.z * vSize.z, (vBox.y - 0.5) * vSize.y) : vec2(vBox.x * vSize.x, (vBox.y - 0.5) * vSize.y);
  if (f.top > 0.5) {
    hb = vec2(vSize.x * 0.5, vSize.z * 0.5);
    fc = vec2(vBox.x * vSize.x, vBox.z * vSize.z);
  }
  vec2 dEdge = hb - abs(fc);
  f.edgeDist = min(dEdge.x, dEdge.y);

  // solid corners, parapet band and the ground floor carry no windows
  win *= step(0.32, dEdge.x);
  win *= step(0.3, (1.0 - vBox.y) * vSize.y);
  win *= step(floorH * 1.05, v);
  win *= f.side;

  // far distance → average coverage (prevents shimmering)
  float far = smoothstep(0.2, 0.6, max(fw.x, fw.y));
  vec2 cluster = vec2(floor(ci.x / 3.0), ci.y);
  float r = gh21(cluster + vec2(vSeed * 17.0 + n.x * 3.1, n.z * 7.7 + vSeed * 3.0));
  float lit = step(r, vLit);
  f.win = mix(win, winW * winH * 0.85 * f.side * step(floorH * 1.05, v), far);
  f.lit = mix(lit, vLit, far);
  f.warm = step(0.35, gh21(ci * 1.37 + vSeed));
  float fl = abs(fract(cell.y * 0.25 + 0.5) - 0.5) * 4.0;
  f.floorLine = 1.0 - smoothstep(0.0, fw.y * 1.5 + 0.01, fl);
  return f;
}
`;

const IMPACT_GLSL = /* glsl */ `
float impactMask(vec2 c) {
  float d = distance(c, uImpactCenter);
  return (1.0 - smoothstep(uImpactRadius - 1.5, uImpactRadius + 0.5, d)) * uImpactStrength;
}
`;

const FACADE_UNIFORMS = {
  uTime: G.uTime,
  uXray: G.uXray,
  uImpactCenter: G.uImpactCenter,
  uImpactRadius: G.uImpactRadius,
  uImpactStrength: G.uImpactStrength,
  uHoverBuilding: G.uHoverBuilding,
  uSelectedBuilding: G.uSelectedBuilding,
  uAmber: G.uAmber,
  uGhostColor: G.uGhostColor,
};

/** Solid, lit buildings (opaque look; fades out as X-ray takes over). */
export function createBuildingSolidMaterial() {
  const mat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.82, metalness: 0.05, transparent: true, envMapIntensity: 0.55 });
  return patchMaterial(mat, {
    key: 'building-solid',
    uniforms: FACADE_UNIFORMS,
    vertexHead: INSTANCE_ATTRS + BUILDING_VARYINGS,
    vertexTransform: BUILDING_VERTEX_ASSIGN,
    fragmentHead: /* glsl */ `
      uniform float uTime;
      uniform float uXray;
      uniform vec2 uImpactCenter;
      uniform float uImpactRadius;
      uniform float uImpactStrength;
      uniform float uHoverBuilding;
      uniform float uSelectedBuilding;
      uniform vec3 uAmber;
      uniform vec3 uGhostColor;
      ${BUILDING_VARYINGS}
      ${GLSL_COMMON}
      ${FACADE_GLSL}
      ${IMPACT_GLSL}
      Facade gF;
    `,
    fragmentColor: /* glsl */ `
      gF = facade();
      vec3 tint = vTint;
      // facade: slight vertical gradient + noise
      float grad = 0.82 + 0.18 * clamp(vLocal.y / 18.0, 0.0, 1.0);
      vec3 fac = tint * grad * (0.93 + 0.07 * gnoise(vLocal.xy * 0.6 + vSeed));
      vec3 glass = mix(vec3(0.035, 0.05, 0.075), tint * 0.32, 0.25);
      if (vStyle < 0.5) {
        // curtain wall: darker glass bands with mullion lines
        fac = mix(fac * 0.62, fac, 0.4);
      }
      vec3 col = mix(fac, glass, gF.win);
      // roofs: membrane + lighter parapet
      vec3 roof = tint * 0.3 + vec3(0.012, 0.014, 0.018);
      roof *= 0.88 + 0.14 * gnoise(vLocal.xz * 1.3 + vSeed * 4.0);
      // membrane seams
      vec2 seam = abs(fract(vLocal.xz / 1.6) - 0.5);
      roof *= 1.0 - 0.08 * (1.0 - smoothstep(0.0, 0.03, min(seam.x, seam.y)));
      float parapet = 1.0 - smoothstep(0.14, 0.18, gF.edgeDist);
      roof = mix(roof, tint * 0.72, parapet);
      col = mix(col, roof, gF.top);
      // ground floor podium tone
      col *= mix(1.0, 0.72, gF.side * (1.0 - step(0.42, vLocal.y)));
      diffuseColor.rgb = col;
    `,
    fragmentEmissive: /* glsl */ `
      roughnessFactor = mix(roughnessFactor, 0.22, gF.win);
      metalnessFactor = mix(metalnessFactor, 0.5, gF.win);
      vec3 warmC = vec3(1.0, 0.74, 0.46);
      vec3 coolC = vec3(0.72, 0.86, 1.0);
      vec3 wc = mix(coolC, warmC, gF.warm);
      float winGlow = gF.win * gF.lit * (1.0 - uXray * 0.6);
      totalEmissiveRadiance += wc * winGlow * 1.25;
      // storefronts
      float shop = gF.side * (1.0 - step(0.4, vLocal.y)) * step(0.05, vLocal.y) * vShop * step(0.3, gF.edgeDist);
      totalEmissiveRadiance += vec3(1.0, 0.8, 0.55) * shop * 0.55;
      // impact zone tint
      float imp = impactMask(vCenter);
      float pulseA = 0.75 + 0.25 * sin(uTime * 3.2);
      totalEmissiveRadiance += uAmber * imp * (0.07 + 0.08 * gF.top) * pulseA;
      totalEmissiveRadiance += uAmber * imp * (1.0 - smoothstep(0.0, 0.1, gF.edgeDist)) * 1.25;
      totalEmissiveRadiance += vec3(1.0, 0.35, 0.3) * imp * vPoi * (1.0 - smoothstep(0.0, 0.18, gF.edgeDist)) * 2.4 * pulseA;
      // hover / selection
      float hov = 1.0 - step(0.5, abs(vBldg - uHoverBuilding));
      float sel = 1.0 - step(0.5, abs(vBldg - uSelectedBuilding));
      totalEmissiveRadiance += vec3(0.3, 0.75, 1.0) * (hov * 0.05 + sel * 0.08);
      totalEmissiveRadiance += vec3(0.4, 0.85, 1.0) * max(hov, sel) * (1.0 - smoothstep(0.0, 0.08, gF.edgeDist)) * 1.1;
    `,
    fragmentOutput: /* glsl */ `
      diffuseColor.a = 1.0 - smoothstep(0.0, 0.92, uXray);
    `,
  });
}

/** Additive hologram used when the city is seen in X-ray mode (order independent). */
export function createBuildingGhostMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    uniforms: { ...FACADE_UNIFORMS, uFogDensity: { value: FOG_DENSITY } },
    vertexShader: /* glsl */ `
      ${INSTANCE_ATTRS}
      ${BUILDING_VARYINGS}
      varying vec3 vViewN;
      varying vec3 vViewPos;
      void main() {
        ${BUILDING_VERTEX_ASSIGN}
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vViewPos = -mv.xyz;
        vViewN = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uXray;
      uniform vec2 uImpactCenter;
      uniform float uImpactRadius;
      uniform float uImpactStrength;
      uniform float uHoverBuilding;
      uniform float uSelectedBuilding;
      uniform vec3 uAmber;
      uniform vec3 uGhostColor;
      uniform float uFogDensity;
      ${BUILDING_VARYINGS}
      varying vec3 vViewN;
      varying vec3 vViewPos;
      ${GLSL_COMMON}
      ${FACADE_GLSL}
      ${IMPACT_GLSL}
      void main() {
        Facade f = facade();
        float fres = pow(1.0 - clamp(abs(dot(normalize(vViewN), normalize(vViewPos))), 0.0, 1.0), 2.2);
        float lw = fwidth(f.edgeDist) * 1.4 + 0.004;
        float edge = 1.0 - smoothstep(0.0, lw, f.edgeDist);
        float glow = exp(-max(f.edgeDist, 0.0) * 5.0);
        vec3 base = uGhostColor;
        float imp = impactMask(vCenter);
        base = mix(base, uAmber, imp);
        float hov = max(1.0 - step(0.5, abs(vBldg - uHoverBuilding)), 1.0 - step(0.5, abs(vBldg - uSelectedBuilding)));
        vec3 col = base * (0.01 + fres * 0.045 + edge * 0.4 + glow * 0.045 + f.floorLine * f.side * 0.022);
        col += vec3(1.0, 0.8, 0.55) * f.win * f.lit * 0.035;
        col += base * imp * (0.012 + 0.01 * sin(uTime * 3.2));
        col += vec3(1.0, 0.35, 0.3) * imp * vPoi * edge * 1.2;
        col *= 1.0 + hov * 1.4;
        float depth = length(vViewPos);
        float fogF = exp(-uFogDensity * uFogDensity * depth * depth);
        gl_FragColor = vec4(col * uXray * fogF, 1.0);
      }
    `,
  });
}
