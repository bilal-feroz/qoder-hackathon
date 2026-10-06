import { Color, MeshBasicMaterial, MeshStandardMaterial, type ColorRepresentation, type MeshStandardMaterialParameters } from 'three';
import { G } from '../shaders/globals';
import { GLSL_COMMON, GLSL_STRATA } from '../shaders/glsl';
import { patchMaterial, WORLDPOS_FRAG_HEAD, WORLDPOS_VERT_END, WORLDPOS_VERT_HEAD } from '../shaders/patch';

/* ------------------------------------------------------------------ */
/* Road surface (asphalt + markings) — shared by the ground plane and  */
/* the cut-away trench tiles so both read identically when closed.     */
/* ------------------------------------------------------------------ */

export const ROAD_GLSL = /* glsl */ `
const float SXs[6] = float[6](-70.0, -42.0, -14.0, 14.0, 42.0, 70.0);
const float SZs[5] = float[5](-58.0, -30.0, 0.0, 30.0, 58.0);
const float SZW[5] = float[5](8.0, 8.0, 12.0, 8.0, 8.0);

float stripe(float x, float duty) {
  float t = abs(fract(x) - 0.5) * 2.0;
  float fw = fwidth(x) * 2.0 + 1e-4;
  float s = smoothstep(1.0 - duty - fw, 1.0 - duty + fw, t);
  return mix(s, duty, smoothstep(0.4, 0.9, fw));
}

struct RoadSample { vec3 color; vec3 emissive; float road; float rough; };

/* white, yellow and green paint for one street cross-section (lat = signed offset from the centre line) */
vec3 laneMarks(float lat, float along, float wide) {
  float a = abs(lat);
  float white = 0.0;
  float yellow = 0.0;
  float green = 0.0;
  if (wide < 0.5) {
    yellow = aaBand(a - 0.075, 0.024);
    white = aaBand(a - 1.1, 0.022) * stripe(along / 2.4, 0.42);
    white = max(white, aaBand(a - 2.02, 0.02));
    float tick = aaBand((fract(along / 0.85 + 0.5) - 0.5) * 0.85, 0.014) * step(2.02, a) * step(a, 2.34);
    white = max(white, tick);
  } else {
    yellow = aaBand(a - 0.55, 0.026);
    float hatch = stripe((along + lat) / 0.5, 0.2) * step(a, 0.5);
    yellow = max(yellow, hatch * 0.8);
    white = aaBand(a - 1.45, 0.022) * stripe(along / 2.4, 0.42);
    white = max(white, aaBand(a - 2.35, 0.022) * stripe(along / 2.4, 0.42));
    white = max(white, aaBand(a - 3.3, 0.026));
    green = step(3.33, a) * step(a, 3.79);
    white = max(white, aaBand(a - 3.81, 0.018));
    float tick = aaBand((fract(along / 0.85 + 0.5) - 0.5) * 0.85, 0.014) * step(3.83, a) * step(a, 4.24);
    white = max(white, tick);
  }
  return vec3(white, yellow, green);
}

RoadSample roadSample(vec2 p) {
  RoadSample r;
  float dz = 1e4; float hz = 2.5; int jz = 0; float zc = 0.0;
  for (int j = 0; j < 5; j++) {
    float d = abs(p.y - SZs[j]);
    if (d < dz) { dz = d; jz = j; zc = SZs[j]; hz = SZW[j] * 0.5 - 1.5; }
  }
  float dx = 1e4; float xc = 0.0;
  for (int i = 0; i < 6; i++) {
    float d = abs(p.x - SXs[i]);
    if (d < dx) { dx = d; xc = SXs[i]; }
  }
  float hx = 2.5;
  bool inEW = dz < hz && abs(p.x) < 72.5;
  bool inNS = dx < hx && abs(p.y) < 60.5;

  // aged asphalt: aggregate grain, repair patches, darker wheel paths
  float n1 = gfbm(p * 0.21);
  vec3 asphalt = vec3(0.078, 0.08, 0.086) * (0.84 + 0.3 * n1);
  float patchN = gnoise(p * 0.06 + 13.0);
  asphalt = mix(asphalt, asphalt * 0.78, smoothstep(0.66, 0.7, patchN));
  asphalt *= 0.92 + 0.14 * gh21(floor(p * 9.0));

  // concrete pavers outside the carriageways
  vec3 paving = vec3(0.22, 0.215, 0.21) * (0.9 + 0.14 * gnoise(p * 0.7));
  float jx = abs(fract(p.x / 1.5) - 0.5) * 2.0;
  float jzz = abs(fract(p.y / 1.5) - 0.5) * 2.0;
  paving *= 1.0 - 0.16 * max(smoothstep(0.92, 0.98, jx), smoothstep(0.92, 0.98, jzz));

  float line = 0.0;
  float yellow = 0.0;
  float green = 0.0;
  float wheel = 0.0;
  if (inEW && !inNS) {
    float sz = p.y - zc;
    vec3 m = laneMarks(sz, p.x, jz == 2 ? 1.0 : 0.0);
    line = m.x; yellow = m.y; green = m.z;
    float lw = jz == 2 ? 0.9 : 0.95;
    wheel = 1.0 - smoothstep(0.0, 0.16, abs(abs(fract(abs(sz) / lw) - 0.5) - 0.17));
    float ax = abs(p.x - xc);
    float cw = step(hx + 0.35, ax) * step(ax, hx + 2.0) * step(abs(sz), hz - 0.35);
    line = max(line, cw * stripe(sz / 0.8, 0.5));
    line = max(line, step(hx + 2.3, ax) * step(ax, hx + 2.55) * step(abs(sz), hz - 0.2) * step((p.x - xc) * sz, 0.0));
    // no lane paint across the crossings
    float clear = step(ax, hx + 2.6);
    yellow *= 1.0 - clear; green *= 1.0 - clear;
    line = mix(line, max(cw * stripe(sz / 0.8, 0.5), step(hx + 2.3, ax) * step(ax, hx + 2.55) * step(abs(sz), hz - 0.2) * step((p.x - xc) * sz, 0.0)), clear);
  }
  if (inNS && !inEW) {
    float sx = p.x - xc;
    vec3 m = laneMarks(sx, p.y, 0.0);
    line = m.x; yellow = m.y;
    wheel = 1.0 - smoothstep(0.0, 0.16, abs(abs(fract(abs(sx) / 0.95) - 0.5) - 0.17));
    float az = abs(p.y - zc);
    float hzz = hz;
    float cw = step(hzz + 0.35, az) * step(az, hzz + 2.0) * step(abs(sx), hx - 0.35);
    float stopL = step(hzz + 2.3, az) * step(az, hzz + 2.55) * step(abs(sx), hx - 0.2) * step(0.0, (p.y - zc) * sx);
    float clear = step(az, hzz + 2.6);
    yellow *= 1.0 - clear;
    line = mix(line, max(cw * stripe(sx / 0.8, 0.5), stopL), clear);
  }
  r.road = (inEW || inNS) ? 1.0 : 0.0;
  asphalt *= 1.0 - 0.1 * wheel * r.road;
  vec3 c = r.road > 0.5 ? asphalt : paving;
  vec3 lineCol = vec3(0.74, 0.74, 0.72);
  vec3 yel = vec3(0.84, 0.6, 0.16);
  vec3 grn = vec3(0.12, 0.3, 0.17);
  float wornL = 0.78 + 0.22 * gnoise(p * 1.7);
  c = mix(c, grn, green * r.road * 0.9);
  c = mix(c, lineCol, line * r.road * 0.85 * wornL);
  c = mix(c, yel, yellow * r.road * 0.85 * wornL);
  r.color = c;
  r.rough = mix(0.86, 0.6, max(line, yellow) * r.road);
  r.emissive = (lineCol * line + yel * yellow) * 0.012 * r.road;
  return r;
}
`;

const XRAY_GROUND_GLSL = /* glsl */ `
/* faint diagonal scan band that sweeps the district every ~20 s: "live twin" */
float liveSweep(vec2 p) {
  float s = mod(uTime * 13.0, 300.0) - 150.0;
  float d = (p.x + p.y * 0.55) - s;
  return exp(-abs(d) * 0.55) * 0.06 + exp(-abs(d) * 4.0) * 0.05;
}
vec3 xrayGrid(vec2 p) {
  vec2 g = abs(fract(p / 5.0 + 0.5) - 0.5) * 5.0;
  vec2 fw = fwidth(p) * 1.2;
  float l = 1.0 - min(smoothstep(0.0, fw.x + 0.01, g.x), smoothstep(0.0, fw.y + 0.01, g.y));
  return uGhostColor * l * 0.18;
}
`;

const GROUND_UNIFORMS = {
  uTime: G.uTime,
  uXray: G.uXray,
  uTrench: G.uTrench,
  uTrenchRect: G.uTrenchRect,
  uGhostColor: G.uGhostColor,
};

const GROUND_UNIFORM_DECL = /* glsl */ `
uniform float uTime;
uniform float uXray;
uniform float uTrench;
uniform vec4 uTrenchRect;
uniform vec3 uGhostColor;
`;

export function createAsphaltMaterial() {
  const mat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0.0, transparent: true, envMapIntensity: 0.4 });
  return patchMaterial(mat, {
    key: 'asphalt',
    uniforms: GROUND_UNIFORMS,
    vertexHead: WORLDPOS_VERT_HEAD,
    vertexEnd: WORLDPOS_VERT_END,
    fragmentHead: WORLDPOS_FRAG_HEAD + GROUND_UNIFORM_DECL + GLSL_COMMON + ROAD_GLSL + XRAY_GROUND_GLSL,
    fragmentColor: /* glsl */ `
      vec2 gp = vWPos.xz;
      if (gp.x > uTrenchRect.x && gp.x < uTrenchRect.z && gp.y > uTrenchRect.y && gp.y < uTrenchRect.w) discard;
      RoadSample rs = roadSample(gp);
      diffuseColor.rgb = rs.color;
    `,
    fragmentEmissive: /* glsl */ `
      roughnessFactor = rs.rough;
      totalEmissiveRadiance += rs.emissive;
      totalEmissiveRadiance += vec3(0.25, 0.75, 1.0) * liveSweep(gp) * (1.0 - uXray);
    `,
    fragmentOutput: /* glsl */ `
      outgoingLight = mix(outgoingLight, outgoingLight * 0.35 + xrayGrid(gp), uXray);
      diffuseColor.a = mix(1.0, 0.22, uXray);
    `,
  });
}

/* ------------------------------------------------------------------ */
/* Block plinths (sidewalks + block surfaces + sector highlight)       */
/* ------------------------------------------------------------------ */

export function createPlinthMaterial() {
  const mat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, metalness: 0.0, transparent: true, envMapIntensity: 0.4 });
  return patchMaterial(mat, {
    key: 'plinth',
    uniforms: {
      ...GROUND_UNIFORMS,
      uHoverSector: G.uHoverSector,
      uAlertSector: G.uAlertSector,
      uSectorAlert: G.uSectorAlert,
      uSectorColor: G.uSectorColor,
    },
    vertexHead: WORLDPOS_VERT_HEAD + /* glsl */ `
      attribute float aKind;
      attribute float aSector;
      varying vec3 vBoxP;
      varying vec3 vObjNP;
      varying float vKind;
      varying float vSector;
    `,
    vertexTransform: /* glsl */ `
      vBoxP = position;
      vObjNP = normal;
      vKind = aKind;
      vSector = aSector;
    `,
    vertexEnd: WORLDPOS_VERT_END,
    fragmentHead:
      WORLDPOS_FRAG_HEAD +
      GROUND_UNIFORM_DECL +
      /* glsl */ `
      uniform float uHoverSector;
      uniform float uAlertSector;
      uniform float uSectorAlert;
      uniform vec3 uSectorColor;
      varying vec3 vBoxP;
      varying vec3 vObjNP;
      varying float vKind;
      varying float vSector;
    ` +
      GLSL_COMMON +
      XRAY_GROUND_GLSL,
    fragmentColor: /* glsl */ `
      vec2 l = vBoxP.xz * 23.0;
      vec2 gp = vWPos.xz;
      float m = max(abs(l.x), abs(l.y));
      float topF = step(0.5, vObjNP.y);
      float sw = smoothstep(9.94, 10.06, m);
      vec3 side = vec3(0.3, 0.3, 0.3) * (0.9 + 0.1 * gnoise(gp * 3.0));
      vec3 sidewalk = vec3(0.27, 0.265, 0.26) * (0.9 + 0.16 * gnoise(gp * 1.7));
      vec2 sj = abs(fract(gp / 1.5) - 0.5) * 2.0;
      sidewalk *= 1.0 - 0.16 * max(smoothstep(0.9, 0.97, sj.x), smoothstep(0.9, 0.97, sj.y));
      vec3 inner = vec3(0.2, 0.198, 0.195) * (0.88 + 0.2 * gfbm(gp * 0.4));
      vec2 tj = abs(fract(gp / 3.0) - 0.5) * 2.0;
      inner *= 1.0 - 0.1 * max(smoothstep(0.93, 0.98, tj.x), smoothstep(0.93, 0.98, tj.y));
      if (vKind > 0.5 && vKind < 1.5) {
        // park lawn + paths
        inner = vec3(0.085, 0.15, 0.06) * (0.72 + 0.5 * gfbm(gp * 0.5));
        inner *= 0.9 + 0.2 * gh21(floor(gp * 14.0));
        float path = min(abs(l.x - l.y * 0.35 - 1.0), abs(l.y + sin(l.x * 0.25) * 2.5 - 1.5));
        inner = mix(inner, vec3(0.34, 0.31, 0.26), 1.0 - smoothstep(0.55, 0.7, path));
      } else if (vKind > 1.5 && vKind < 2.5) {
        // gravel yard
        inner = vec3(0.22, 0.215, 0.205) * (0.75 + 0.5 * gh21(floor(gp * 6.0)));
      } else if (vKind > 2.5) {
        inner = vec3(0.09, 0.16, 0.065) * (0.8 + 0.4 * gfbm(gp * 0.6));
      }
      vec3 top = mix(inner, sidewalk, sw);
      top = mix(top, vec3(0.42, 0.42, 0.41), smoothstep(11.28, 11.36, m));
      diffuseColor.rgb = mix(side, top, topF);
    `,
    fragmentEmissive: /* glsl */ `
      float edgeD = max(0.0, 11.5 - m);
      float ring = mix(0.6, exp(-edgeD * 1.1), topF);
      float isHover = 1.0 - step(0.5, abs(vSector - uHoverSector));
      float isAlert = 1.0 - step(0.5, abs(vSector - uAlertSector));
      vec3 e = vec3(0.3, 0.75, 1.0) * isHover * ring * 0.55;
      float pa = 0.75 + 0.25 * sin(uTime * 4.0);
      e += uSectorColor * isAlert * uSectorAlert * (ring * 1.5 * pa + topF * 0.035);
      float scan = 1.0 - smoothstep(0.0, 0.6, abs(fract(uTime * 0.35) * 26.0 - 13.0 - l.y));
      e += uSectorColor * isAlert * uSectorAlert * scan * topF * 0.12;
      e += vec3(0.25, 0.75, 1.0) * liveSweep(gp) * topF * (1.0 - uXray);
      totalEmissiveRadiance += e;
    `,
    fragmentOutput: /* glsl */ `
      outgoingLight = mix(outgoingLight, outgoingLight * 0.35 + xrayGrid(gp) * topF, uXray);
      diffuseColor.a = mix(1.0, 0.26, uXray);
    `,
  });
}

/* ------------------------------------------------------------------ */
/* Generic props: fade to a faint fresnel ghost in X-ray mode           */
/* ------------------------------------------------------------------ */

const PROP_FADE = {
  key: 'prop',
  uniforms: { uXray: G.uXray, uGhostColor: G.uGhostColor },
  fragmentHead: /* glsl */ `
    uniform float uXray;
    uniform vec3 uGhostColor;
  `,
  fragmentOutput: /* glsl */ `
    {
      float fres = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.0);
      outgoingLight = mix(outgoingLight, uGhostColor * (0.02 + fres * 0.4), uXray * 0.9);
      diffuseColor.a *= mix(1.0, 0.04 + fres * 0.16, uXray);
    }
  `,
};

export function createPropMaterial(params: MeshStandardMaterialParameters) {
  return patchMaterial(new MeshStandardMaterial({ roughness: 0.75, metalness: 0.1, envMapIntensity: 0.5, ...params, transparent: true }), PROP_FADE);
}

/** Bright unlit material for lamps, beacons and signage (blooms), fades in X-ray. */
export function createGlowMaterial(color: ColorRepresentation, intensity = 3, xrayKeep = 0.12) {
  const c = new Color(color).multiplyScalar(intensity);
  const mat = new MeshBasicMaterial({ color: c, transparent: true, toneMapped: true });
  return patchMaterial(mat, {
    key: 'glow',
    uniforms: { uXray: G.uXray, uKeep: { value: xrayKeep } },
    fragmentHead: 'uniform float uXray; uniform float uKeep;',
    fragmentOutput: 'diffuseColor.a *= mix(1.0, uKeep, uXray);',
  });
}

/* ------------------------------------------------------------------ */
/* Soil cut faces of the diorama + underside of the ground slab        */
/* ------------------------------------------------------------------ */

export function createSoilMaterial() {
  const mat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, metalness: 0.0, transparent: true, envMapIntensity: 0.25 });
  return patchMaterial(mat, {
    key: 'soil',
    uniforms: { uXray: G.uXray, uExploded: G.uExploded, uGhostColor: G.uGhostColor },
    vertexHead: WORLDPOS_VERT_HEAD,
    vertexEnd: WORLDPOS_VERT_END,
    fragmentHead:
      WORLDPOS_FRAG_HEAD +
      /* glsl */ `
      uniform float uXray;
      uniform float uExploded;
      uniform vec3 uGhostColor;
    ` +
      GLSL_COMMON +
      GLSL_STRATA,
    fragmentColor: /* glsl */ `
      vec2 hpos = vec2(vWPos.x + vWPos.z, vWPos.y);
      diffuseColor.rgb = strataColor(vWPos.y, hpos);
      float dl = abs(fract(vWPos.y / 2.0 + 0.5) - 0.5) * 2.0;
      diffuseColor.rgb *= 1.0 - 0.12 * (1.0 - smoothstep(0.0, fwidth(vWPos.y) * 2.0 + 0.004, dl));
    `,
    fragmentOutput: /* glsl */ `
      outgoingLight = mix(outgoingLight, outgoingLight * 0.5 + uGhostColor * 0.015, uXray);
      diffuseColor.a = mix(1.0, 0.13, uXray) * (1.0 - uExploded);
    `,
  });
}

export function createUndersideMaterial() {
  const mat = new MeshStandardMaterial({ color: '#0b0d10', roughness: 1, metalness: 0, transparent: true });
  return patchMaterial(mat, {
    key: 'underside',
    uniforms: { uXray: G.uXray, uTrench: G.uTrench, uTrenchRect: G.uTrenchRect, uExploded: G.uExploded },
    vertexHead: WORLDPOS_VERT_HEAD,
    vertexEnd: WORLDPOS_VERT_END,
    fragmentHead:
      WORLDPOS_FRAG_HEAD +
      /* glsl */ `
      uniform float uXray;
      uniform float uTrench;
      uniform float uExploded;
      uniform vec4 uTrenchRect;
    `,
    fragmentColor: /* glsl */ `
      vec2 up = vWPos.xz;
      if (uTrench > 0.01 && up.x > uTrenchRect.x && up.x < uTrenchRect.z && up.y > uTrenchRect.y && up.y < uTrenchRect.w) discard;
    `,
    fragmentOutput: /* glsl */ `
      diffuseColor.a = mix(1.0, 0.0, max(uXray, uExploded));
    `,
  });
}
