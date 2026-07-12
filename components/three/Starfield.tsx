'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { STARS, STAR_COUNT } from '@/lib/starData';
import { camVelocitySharedRef } from './SceneContent';

interface StarfieldProps {
  scrollProgressRef: React.RefObject<number>;
}

export default function Starfield({ scrollProgressRef }: StarfieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Bigger, brighter glow texture
  const starTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.08, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
      gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.15)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const scroll = scrollProgressRef.current ?? 0;
    const { pointer, viewport } = state;

    if (!meshRef.current) return;

    const mouseX = (pointer.x * viewport.width) / 2;
    const mouseY = (pointer.y * viewport.height) / 2;

    // Smooth camera velocity → smooth star warp stretch (no discrete keyframes)
    const vel = camVelocitySharedRef.current;
    const warpStretch = 1 + vel * 90; // proportional to how fast camera is moving

    const fade = Math.max(0, 1 - scroll * 1.6);
    const scrollSpeedMul = 1 - scroll * 0.6;

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = STARS[i];
      const pos = star.position;

      const twinkle = Math.sin(time * star.twinkleSpeed * scrollSpeedMul + star.phase);
      const currentScale = star.size * (0.7 + twinkle * 0.3);

      // Subtle cursor attraction (XY only)
      const dx = mouseX - pos.x;
      const dy = mouseY - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let offsetX = 0;
      let offsetY = 0;
      const attractRadius = 4.5;
      if (dist < attractRadius && dist > 0.1) {
        const force = (1 - dist / attractRadius) * star.reactionMultiplier;
        offsetX = (dx / dist) * force;
        offsetY = (dy / dist) * force;
      }

      dummy.position.set(pos.x + offsetX, pos.y + offsetY, pos.z);
      // Velocity-proportional star stretch — smooth, no keyframe snapping
      const s = currentScale * fade;
      dummy.scale.set(s, s, s * warpStretch);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Nebula colour palette — brighter overall
      if (i % 7 === 0) {
        tempColor.setHSL(0.56, 0.8, 0.85);  // Blue glow
      } else if (i % 11 === 0) {
        tempColor.setHSL(0.76, 0.7, 0.8);   // Purple nebula
      } else if (i % 17 === 0) {
        tempColor.setHSL(0.5, 0.5, 0.92);   // Cyan tint
      } else {
        tempColor.setRGB(1, 1, 1);           // White
      }

      const brightness = (0.8 + (twinkle + 1) * 0.15) * star.brightness;
      tempColor.multiplyScalar(brightness * fade);
      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  if (!starTexture) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[null as unknown as THREE.BufferGeometry, null as unknown as THREE.Material, STAR_COUNT]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={starTexture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
