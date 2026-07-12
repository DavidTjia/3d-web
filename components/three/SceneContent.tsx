'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import Starfield from './Starfield';
import PlanetaryScene from './PlanetaryScene';

interface SceneContentProps {
  scrollProgressRef: React.RefObject<number>;  // hero-only (0→1 first 100vh)
  bgScrollRef: React.RefObject<number>;         // full-page (0→1 across entire page)
}

// ─── Camera path keyframes ────────────────────────────────────────────────
// Page layout: Hero 100vh | Wardeka 160vh | VR 160vh
// Total ≈ 420vh. Rough mapping to bgScrollRef [0→1]:
//   Hero:    0.00 → 0.24
//   Wardeka: 0.24 → 0.62
//   VR:      0.62 → 1.00
//
// Camera position [x, y, z] and lookAt target [x, y, z]
// ────────────────────────────────────────────────────────────────────────
const CAM_PATH = [
  { t: 0.00, pos: [ 0.0,  0.5, 10.0], look: [ 0.0,  0.0,  0.0] }, // Hero – wide
  { t: 0.13, pos: [ 0.8,  0.4,  8.5], look: [ 1.0,  0.2, -4.0] }, // Start Wardeka approach
  { t: 0.30, pos: [ 2.4,  0.8,  6.8], look: [ 3.2,  0.6, -8.0] }, // Wardeka peak – Saturn close
  { t: 0.50, pos: [ 1.0,  0.3,  7.5], look: [ 0.5,  0.0, -4.0] }, // Wardeka settling
  { t: 0.62, pos: [-0.4,  0.6,  7.8], look: [-1.0,  0.4, -4.0] }, // Entering VR
  { t: 0.78, pos: [-2.6,  1.4,  6.6], look: [-4.0,  1.2, -9.0] }, // VR peak – blue planet
  { t: 0.90, pos: [-1.2,  0.2,  6.8], look: [-0.5, -0.2, -3.0] }, // VR settling
  { t: 1.00, pos: [ 0.0, -1.6,  5.5], look: [ 0.0, -2.4, -1.0] }, // Bottom / terrain
] as const;

/** Cubic in-out easing for a smooth start and landing at each keyframe */
function cubicInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Hermite-smooth spline between adjacent keyframe values */
function splineAt(scroll: number, axis: 'px'|'py'|'pz'|'lx'|'ly'|'lz'): number {
  const path = CAM_PATH;

  // Find bounding keyframes
  let i0 = 0;
  for (let i = 0; i < path.length - 1; i++) {
    if (scroll >= path[i].t && scroll <= path[i + 1].t) { i0 = i; break; }
    if (scroll > path[path.length - 1].t) { i0 = path.length - 2; break; }
  }
  const i1 = Math.min(i0 + 1, path.length - 1);

  const range = path[i1].t - path[i0].t;
  const localT = range > 0 ? (scroll - path[i0].t) / range : 0;
  const te = cubicInOut(Math.max(0, Math.min(1, localT)));

  const a0 = axis === 'px' ? path[i0].pos[0] : axis === 'py' ? path[i0].pos[1] : axis === 'pz' ? path[i0].pos[2]
           : axis === 'lx' ? path[i0].look[0] : axis === 'ly' ? path[i0].look[1] : path[i0].look[2];
  const a1 = axis === 'px' ? path[i1].pos[0] : axis === 'py' ? path[i1].pos[1] : axis === 'pz' ? path[i1].pos[2]
           : axis === 'lx' ? path[i1].look[0] : axis === 'ly' ? path[i1].look[1] : path[i1].look[2];

  return a0 + (a1 - a0) * te;
}

export default function SceneContent({ scrollProgressRef, bgScrollRef }: SceneContentProps) {
  const targetPos  = useRef(new THREE.Vector3(0, 0.5, 10));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));
  const smoothPos  = useRef(new THREE.Vector3(0, 0.5, 10));
  const smoothLook = useRef(new THREE.Vector3(0, 0, 0));
  // Previous smoothed position used to compute camera velocity for star-warp effect
  const prevSmooth = useRef(new THREE.Vector3(0, 0.5, 10));

  useFrame((state) => {
    const scroll = bgScrollRef.current ?? 0;
    const time   = state.clock.getElapsedTime();

    // ── Compute target from spline ────────────────────────────────────
    targetPos.current.set(
      splineAt(scroll, 'px'),
      splineAt(scroll, 'py'),
      splineAt(scroll, 'pz'),
    );
    targetLook.current.set(
      splineAt(scroll, 'lx'),
      splineAt(scroll, 'ly'),
      splineAt(scroll, 'lz'),
    );

    // ── Subtle idle drift (damped by scroll speed) ────────────────────
    const scrollSpeed = Math.abs(scroll - (state.camera.userData.prevScroll ?? scroll));
    state.camera.userData.prevScroll = scroll;
    const driftAmt = Math.max(0, 0.35 - scrollSpeed * 12);
    const driftX = Math.sin(time * 0.14) * 0.45 * driftAmt;
    const driftY = Math.cos(time * 0.09) * 0.28 * driftAmt;
    targetPos.current.x += driftX;
    targetPos.current.y += driftY;

    // ── Smooth lerp to target ─────────────────────────────────────────
    // Position: 0.07 gives snappy-yet-smooth cinema feel
    smoothPos.current.lerp(targetPos.current, 0.07);
    smoothLook.current.lerp(targetLook.current, 0.055);

    // ── Camera velocity for star-stretch effect ───────────────────────
    const vel = smoothPos.current.distanceTo(prevSmooth.current);
    camVelocitySharedRef.current = THREE.MathUtils.lerp(camVelocitySharedRef.current, vel, 0.18);
    prevSmooth.current.copy(smoothPos.current);

    // ── Apply to camera ───────────────────────────────────────────────
    state.camera.position.copy(smoothPos.current);
    state.camera.lookAt(smoothLook.current);

    // ── Dynamic FOV — wide while moving, tighter at rest ─────────────
    const pCam = state.camera as THREE.PerspectiveCamera;
    if (pCam.isPerspectiveCamera) {
      const fovTarget = 60 + camVelocitySharedRef.current * 80;
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, Math.min(fovTarget, 72), 0.06);
      pCam.updateProjectionMatrix();
    }
  });

  return (
    <>
      <PlanetaryScene scrollProgressRef={scrollProgressRef} bgScrollRef={bgScrollRef} />
      <Starfield scrollProgressRef={scrollProgressRef} />
    </>
  );
}

/** Module-level ref so Starfield can read camera velocity without prop drilling.
 *  Named with 'Ref' suffix so the React compiler treats it as a mutable ref. */
export const camVelocitySharedRef = { current: 0 };
