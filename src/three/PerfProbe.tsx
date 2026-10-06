import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';

/** Dev-only: measures CPU time of the whole frame (simulation + render submission). Read via window.__perf. */
export function PerfProbe() {
  const t0 = useRef(0);
  const samples = useRef<number[]>([]);
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    t0.current = performance.now();
    const w = window as unknown as { __perfReset?: () => void };
    if (!w.__perfReset) w.__perfReset = () => (samples.current = []);
  }, -1000);
  useFrame(() => {
    const dt = performance.now() - t0.current;
    const s = samples.current;
    s.push(dt);
    if (s.length > 120) s.shift();
    const avg = s.reduce((a, b) => a + b, 0) / s.length;
    (window as unknown as { __perf: unknown }).__perf = {
      cpuMsAvg: +avg.toFixed(2),
      cpuMsMax: +Math.max(...s).toFixed(2),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      programs: gl.info.programs?.length,
      textures: gl.info.memory.textures,
      geometries: gl.info.memory.geometries,
    };
  }, 1000);
  return null;
}
