import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

/** Restrained post: selective-feeling bloom (HDR threshold), soft vignette, ACES tone mapping. */
export function Effects({ quality = 'high' }: { quality?: 'high' | 'low' }) {
  return (
    <EffectComposer multisampling={quality === 'high' ? 4 : 0} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.22} intensity={0.85} radius={0.68} />
      <Vignette offset={0.28} darkness={0.5} eskil={false} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
