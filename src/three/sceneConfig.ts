import { Vector3 } from 'three';

/** Scene-wide look constants: Pioneer's pale canvas around a city at golden hour. */
export const FOG_COLOR = '#cfd3dd';
export const FOG_DENSITY = 0.0008;
export const SKY_BOTTOM = '#dadde5';
export const EXPOSURE = 1.5;

/** Direction *towards* the sun (low in the south-west, so long shadows fall across the city). */
export const SUN_DIR = new Vector3(-0.62, 0.2, 0.76).normalize();
export const SUN_COLOR = '#ffbd80';
export const SUN_INTENSITY = 3.3;
