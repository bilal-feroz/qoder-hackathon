import { useThree } from '@react-three/fiber';
import { AD } from '../data/abudhabi';
import { live } from '../simulation/runtime';
import { FadeHtml } from './labels/FadeHtml';

const LANDMARK_ROLES = new Set(['landmark', 'mall', 'mosque']);

/** Real street and landmark names, shown from the overview and faded out for close-ups and X-ray. */
export function MapLabels() {
  const camera = useThree((s) => s.camera);
  const far = () => {
    const h = camera.position.y;
    return Math.max(0, Math.min(1, (h - 34) / 14)) * (1 - live.xray) * (1 - live.exploded) * (1 - live.pois);
  };
  const landmarks = AD.places.filter((p) => LANDMARK_ROLES.has(p.role));

  return (
    <group>
      {AD.labels.map((l) => (
        <FadeHtml key={l.n} position={[l.x, 0.4, l.z]} opacity={far} zIndex={6} center>
          <span className="map-street">{l.n}</span>
        </FadeHtml>
      ))}
      {landmarks.map((p) => (
        <FadeHtml key={p.n} position={[p.x, p.h + 0.9, p.z]} opacity={far} zIndex={7} center>
          <span className="map-place">{p.n.replace(' / The Mall', ' Mall')}</span>
        </FadeHtml>
      ))}
      <FadeHtml position={[-30, 0.4, 66]} opacity={far} zIndex={6} center>
        <span className="map-sea">Arabian Gulf · Corniche</span>
      </FadeHtml>
    </group>
  );
}
