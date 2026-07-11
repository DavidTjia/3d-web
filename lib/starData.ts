/**
 * Shared star data module.
 *
 * Both the Starfield (visual rendering) and the ConstellationCreature (leg connections)
 * import from this single source of truth. This ensures the creature's tentacles
 * attach to the exact same stars the player sees in the background.
 */

import * as THREE from 'three';

export interface StarData {
  position: THREE.Vector3;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  phase: number;
  reactionMultiplier: number;
}

export const STAR_COUNT = 400;

export const STARS: StarData[] = Array.from({ length: STAR_COUNT }, () => {
  // Tighter XY distribution so more stars are visible in the viewport
  const x = (Math.random() - 0.5) * 28;
  const y = (Math.random() - 0.5) * 18;
  // Stars close to Z=0 plane so creature legs reach them naturally
  const z = -Math.random() * 4 - 0.3; // –0.3 … –4.3

  return {
    position: new THREE.Vector3(x, y, z),
    // MUCH larger sizes so stars are clearly visible from camera at Z=10
    size: 0.12 + Math.random() * 0.28,
    brightness: 0.6 + Math.random() * 0.4,
    twinkleSpeed: 0.5 + Math.random() * 1.8,
    phase: Math.random() * Math.PI * 2,
    reactionMultiplier: Math.random() > 0.6 ? 0.3 + Math.random() * 0.5 : 0.05,
  };
});
