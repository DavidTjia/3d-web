'use client';

import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import Starfield from './Starfield';
import PlanetaryScene from './PlanetaryScene';

interface SceneContentProps {
  scrollProgressRef: React.RefObject<number>;
}

interface Keyframe {
  scroll: number;
  pos: [number, number, number];
  look: [number, number, number];
}

export default function SceneContent({ scrollProgressRef }: SceneContentProps) {
  // Keyframes matching the 4 stages of page scroll:
  // 1. scroll = 0.0  -> Hero section (base wide camera)
  // 2. scroll = 0.35 -> Wardeka section (close up on Saturn / golden ring planet)
  // 3. scroll = 0.70 -> VR section (swung left, focus on the blue gas giant)
  // 4. scroll = 1.0  -> Odyssey / transition section (camera diving down to planetary canyon)
  const keyframes: Keyframe[] = useMemo(() => [
    { scroll: 0.0,  pos: [0, 0, 10],       look: [0, 0, 0] },
    { scroll: 0.35, pos: [2.5, 0.6, 6.0],  look: [3.2, 0.6, -6] },
    { scroll: 0.70, pos: [-2.6, 1.2, 6.2], look: [-3.4, 1.2, -6] },
    { scroll: 1.0,  pos: [0, -1.8, 5.0],   look: [0, -2.5, -2] }
  ], []);

  const targetCameraPos = useRef(new THREE.Vector3(0, 0, 10));

  useFrame((state) => {
    const time   = state.clock.getElapsedTime();
    const scroll = scrollProgressRef.current ?? 0;

    // Find active bounding keyframes based on current scroll position
    let k0 = keyframes[0];
    let k1 = keyframes[1];
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (scroll >= keyframes[i].scroll && scroll <= keyframes[i+1].scroll) {
        k0 = keyframes[i];
        k1 = keyframes[i+1];
        break;
      }
    }

    const range = k1.scroll - k0.scroll;
    const tLocal = range > 0 ? (scroll - k0.scroll) / range : 0;
    
    // Cubic easing (smoothstep equivalent) to give premium acceleration/deceleration feel
    const tEased = tLocal * tLocal * (3 - 2 * tLocal);

    // Interpolate camera position and target look-at points
    const p0 = new THREE.Vector3().fromArray(k0.pos);
    const p1 = new THREE.Vector3().fromArray(k1.pos);
    const posTarget = p0.clone().lerp(p1, tEased);

    const l0 = new THREE.Vector3().fromArray(k0.look);
    const l1 = new THREE.Vector3().fromArray(k1.look);
    const lookTarget = l0.clone().lerp(l1, tEased);

    // Dynamic FOV Warp (peaks in the exact middle of transition, zoom stretch effect)
    const warpFactor = Math.sin(tLocal * Math.PI); // 0 at section, 1 at midpoint
    const targetFov = 60 + warpFactor * 12;
    const pCam = state.camera as THREE.PerspectiveCamera;
    if (pCam.isPerspectiveCamera) {
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, targetFov, 0.08);
      pCam.updateProjectionMatrix();
    }

    // Settle factor (cinematic drift is active when settled, reduced to 0 during transition warp)
    const settleFactor = 1 - warpFactor;
    const driftIntensity = 0.45 * settleFactor;
    const driftX = Math.sin(time * 0.15) * 0.5 * driftIntensity;
    const driftY = Math.cos(time * 0.1)  * 0.3 * driftIntensity;

    posTarget.x += driftX;
    posTarget.y += driftY;

    targetCameraPos.current.copy(posTarget);
    state.camera.position.lerp(targetCameraPos.current, 0.05);

    // Initialize currentLook vector inside camera's userData to track lookAt smoothly
    if (!state.camera.userData.currentLook) {
      state.camera.userData.currentLook = new THREE.Vector3(0, 0, 0);
    }
    const currentLook = state.camera.userData.currentLook as THREE.Vector3;
    currentLook.lerp(lookTarget, 0.05);
    state.camera.lookAt(currentLook);
  });

  return (
    <>
      {/* Planetary environment — behind stars */}
      <PlanetaryScene scrollProgressRef={scrollProgressRef} />

      {/* Star field on top of planetary scene */}
      <Starfield scrollProgressRef={scrollProgressRef} />
    </>
  );
}
