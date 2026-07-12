'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import Starfield from './Starfield';
import PlanetaryScene from './PlanetaryScene';

interface SceneContentProps {
  scrollProgressRef: React.RefObject<number>;
}

export default function SceneContent({ scrollProgressRef }: SceneContentProps) {
  const targetCameraPos = useRef(new THREE.Vector3(0, 0, 10));

  useFrame((state) => {
    const time  = state.clock.getElapsedTime();
    const scroll = scrollProgressRef.current ?? 0;

    // Slow, premium cinematic camera drift
    const driftIntensity = 1 - Math.min(scroll * 1.5, 0.8);
    const driftX = Math.sin(time * 0.15) * 0.6 * driftIntensity;
    const driftY = Math.cos(time * 0.1)  * 0.4 * driftIntensity;

    // Camera zoom on scroll
    const zoomZ = 10 - scroll * 4;

    targetCameraPos.current.set(driftX, driftY, zoomZ);
    state.camera.position.lerp(targetCameraPos.current, 0.04);
    state.camera.lookAt(0, 0, 0);
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
