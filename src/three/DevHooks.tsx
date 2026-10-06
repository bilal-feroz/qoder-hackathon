import { useEffect } from 'react';
import { advance, useThree } from '@react-three/fiber';
import { useTwinStore } from '../store/useTwinStore';
import { runtime } from '../simulation/runtime';

/**
 * Dev-only helpers for deterministic visual QA:
 *   __dev.step(seconds, fps) — advance the render loop with a fixed timestep
 *   __dev.store            — the zustand store
 *   __dev.resume()         — hand control back to requestAnimationFrame
 */
export function DevHooks() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const w = window as unknown as { __dev: unknown };
    w.__dev = {
      store: useTwinStore,
      runtime,
      r3f: get,
      step: (seconds: number, fps = 30) => {
        const state = get();
        if (state.frameloop !== 'never') state.setFrameloop('never');
        let t = state.clock.elapsedTime;
        const n = Math.max(1, Math.round(seconds * fps));
        for (let i = 0; i < n; i++) {
          t += 1 / fps;
          advance(t, true, state);
        }
        return runtime.t;
      },
      resume: () => get().setFrameloop('always'),
    };
  }, [get]);
  return null;
}
