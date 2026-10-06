import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useTwinStore } from '../../store/useTwinStore';
import { BUILDINGS } from '../../data/city';
import { ALL_SEGMENTS } from '../../data/networks';
import { SENSORS } from '../../data/sensors';

const STEPS = [
  { label: 'Buildings', meta: `${BUILDINGS.length} structures · 20 sectors` },
  { label: 'Infrastructure', meta: `${ALL_SEGMENTS.length} pipe & duct segments · 5 networks` },
  { label: 'Sensor Network', meta: `${SENSORS.length} instrumented access points` },
  { label: 'AI Simulation', meta: 'Correlation & forecast models' },
];

/** Short, honest loading sequence → camera intro → operational UI. */
export function BootSequence() {
  const boot = useTwinStore((s) => s.boot);
  const sceneReady = useTwinStore((s) => s.sceneReady);
  const setBoot = useTwinStore((s) => s.setBoot);
  const requestShot = useTwinStore((s) => s.requestShot);
  const [step, setStep] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (boot !== 'loading') return;
    if (step < STEPS.length - 1) {
      const id = setTimeout(() => setStep((s) => s + 1), 340);
      return () => clearTimeout(id);
    }
    if (step === STEPS.length - 1 && sceneReady) {
      const id = setTimeout(() => setStep(STEPS.length), 320);
      return () => clearTimeout(id);
    }
  }, [step, sceneReady, boot]);

  useEffect(() => {
    if (step === STEPS.length && boot === 'loading') {
      const id = setTimeout(() => {
        setBoot('intro');
        requestShot('intro');
      }, 260);
      return () => clearTimeout(id);
    }
  }, [step, boot, setBoot, requestShot]);

  useEffect(() => {
    if (boot !== 'intro') return;
    const id = setTimeout(() => setBoot('ready'), 3300);
    const skip = () => setBoot('ready');
    window.addEventListener('pointerdown', skip, { once: true });
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      clearTimeout(id);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
    };
  }, [boot, setBoot]);

  useEffect(() => {
    if (boot !== 'loading') {
      const id = setTimeout(() => setGone(true), 900);
      return () => clearTimeout(id);
    }
  }, [boot]);

  return (
    <>
      {!gone && (
        <div className={`loader ${boot !== 'loading' ? 'is-out' : ''}`} aria-busy={boot === 'loading'}>
          <div className="loader-card">
            <svg width="44" height="44" viewBox="0 0 32 32" aria-hidden className="loader-mark">
              <path d="M16 3.5 27 9.8v12.4L16 28.5 5 22.2V9.8z" fill="none" stroke="var(--cyan)" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M10.5 19.8v-4.6M16 22v-9.6M21.5 19.8v-4.6" stroke="var(--text-0)" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <div className="loader-title">Loading city digital twin</div>
            <ul className="loader-steps">
              {STEPS.map((s, i) => (
                <li key={s.label} className={i < step ? 'is-done' : i === step ? 'is-active' : ''}>
                  <span className="loader-check">{i < step ? <Check size={12} strokeWidth={3} /> : <i />}</span>
                  <span className="loader-label">{s.label}</span>
                </li>
              ))}
            </ul>
            <div className="loader-bar">
              <i style={{ width: `${(step / STEPS.length) * 100}%` }} />
            </div>
          </div>
        </div>
      )}
      <div className={`intro-title ${boot === 'intro' ? 'is-on' : ''}`} aria-hidden={boot !== 'intro'}>
        <div className="intro-name">AI Infrastructure Guardian</div>
        <div className="intro-tag">The City That Heals Itself.</div>
      </div>
    </>
  );
}
