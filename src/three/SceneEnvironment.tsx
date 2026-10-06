import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { BackSide, Color, FogExp2, Mesh, ShaderMaterial, type DirectionalLight } from 'three';
import { FOG_COLOR, FOG_DENSITY, SKY_BOTTOM, SKY_HORIZON, SKY_TOP } from './sceneConfig';
import { G } from './shaders/globals';

function SkyDome() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new Color(SKY_TOP) },
          uHorizon: { value: new Color(SKY_HORIZON) },
          uBottom: { value: new Color(SKY_BOTTOM) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uBottom;
          varying vec3 vDir;
          void main() {
            float y = vDir.y;
            vec3 c = mix(uHorizon, uTop, smoothstep(0.0, 0.55, y));
            c = mix(c, uBottom, smoothstep(0.0, -0.35, y));
            // faint glow low on the horizon toward the river
            c += vec3(0.02, 0.035, 0.05) * exp(-abs(y) * 9.0);
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      }),
    [],
  );
  const ref = useRef<Mesh>(null);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.position.copy(camera.position);
  });
  return (
    <mesh ref={ref} material={mat} renderOrder={-100} frustumCulled={false}>
      <sphereGeometry args={[800, 32, 16]} />
    </mesh>
  );
}

/** Engineering "workspace" grid beneath the diorama; drops with the exploded view. */
function GridFloor() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uExploded: G.uExploded, uColor: { value: new Color('#5f8db8') } },
        vertexShader: /* glsl */ `
          varying vec2 vXZ;
          uniform float uExploded;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vXZ = wp.xz;
            wp.y -= uExploded * 26.0;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying vec2 vXZ;
          float grid(vec2 p, float s, float w) {
            vec2 g = abs(fract(p / s + 0.5) - 0.5) * s;
            vec2 fw = fwidth(p) * w;
            return 1.0 - min(smoothstep(0.0, fw.x, g.x), smoothstep(0.0, fw.y, g.y));
          }
          void main() {
            float d = length(vXZ);
            float fade = 1.0 - smoothstep(90.0, 330.0, d);
            float g1 = grid(vXZ, 10.0, 1.2) * 0.35;
            float g2 = grid(vXZ, 50.0, 1.6) * 0.5;
            float a = max(g1, g2) * fade * 0.28;
            gl_FragColor = vec4(uColor * 0.55, a);
          }
        `,
      }),
    [],
  );
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -16.5, 10]} material={mat} renderOrder={-50}>
      <planeGeometry args={[760, 760, 1, 1]} />
    </mesh>
  );
}

export function SceneEnvironment() {
  const scene = useThree((s) => s.scene);
  const keyRef = useRef<DirectionalLight>(null);

  useEffect(() => {
    scene.fog = new FogExp2(FOG_COLOR, FOG_DENSITY);
    scene.background = new Color(SKY_BOTTOM);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  useEffect(() => {
    const l = keyRef.current;
    if (!l) return;
    l.target.position.set(0, 0, 8);
    l.target.updateMatrixWorld();
    const cam = l.shadow.camera;
    cam.left = -105;
    cam.right = 105;
    cam.top = 95;
    cam.bottom = -95;
    cam.near = 20;
    cam.far = 400;
    cam.updateProjectionMatrix();
  }, []);

  return (
    <>
      <SkyDome />
      <GridFloor />
      <hemisphereLight args={['#8fb0dc', '#15130f', 0.5]} />
      <directionalLight
        ref={keyRef}
        position={[-85, 150, 110]}
        intensity={1.55}
        color="#dfe9ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.035}
      />
      <directionalLight position={[110, 60, -80]} intensity={0.42} color="#7f9fcc" />
      <directionalLight position={[40, -30, 120]} intensity={0.25} color="#4a6a96" />
      <Environment resolution={128} frames={1} environmentIntensity={0.38}>
        <Lightformer form="rect" intensity={1.4} color="#9fb9e0" scale={[300, 300, 1]} position={[0, 180, 0]} rotation-x={Math.PI / 2} />
        <Lightformer form="ring" intensity={0.9} color="#ffc68a" scale={[200, 12, 1]} position={[0, 12, -220]} />
        <Lightformer form="rect" intensity={0.6} color="#5b86c4" scale={[250, 40, 1]} position={[220, 30, 40]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={0.4} color="#2d4a73" scale={[250, 40, 1]} position={[-220, 30, 40]} rotation-y={Math.PI / 2} />
      </Environment>
    </>
  );
}
