'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import CityEnvironment from './CityEnvironment';

interface SceneContentProps {
  scrollProgressRef: React.RefObject<number>;  // hero-only (0→1 first 100vh)
  bgScrollRef: React.RefObject<number>;         // full-page (0→1 across entire page)
}

// ─── Camera path keyframes ────────────────────────────────────────────────
// The camera travels DOWN the road corridor (Z axis goes negative = into the scene).
// Road runs from Z≈0 (near) to Z≈−280 (far horizon).
// bgScrollRef [0→1] maps the full page scroll to these positions.
//
// Page layout: Hero 100vh | Wardeka 160vh | VR 160vh | Awards ~80vh | Demo ~100vh
// Total ≈ 600vh. Rough bgScrollRef mapping:
//   Hero:    0.00 → 0.17
//   Wardeka: 0.17 → 0.43
//   VR:      0.43 → 0.70
//   Awards:  0.70 → 0.85
//   Demo:    0.85 → 1.00
//
// Camera position [x, y, z] — elevated above road, looking forward+down
// Camera lookAt   [x, y, z] — always aimed further down the road
// ────────────────────────────────────────────────────────────────────────
const CAM_PATH = [
  // Hero — wide entry, camera high above road mouth looking down corridor
  { t: 0.00, pos: [  0.0,  5.5,  14.0], look: [  0.0,  1.5, -10.0] },
  // Approach — pull toward road level, slight drift left
  { t: 0.10, pos: [  0.2,  4.0,   5.0], look: [  0.0,  1.8, -25.0] },
  // Wardeka peak — camera left-biased (text is left, buildings right)
  { t: 0.28, pos: [ -1.8,  3.0,  -35.0], look: [  1.0,  1.5, -80.0] },
  // Mid-Wardeka — sweeping right to reveal right-side buildings
  { t: 0.40, pos: [  0.5,  2.8,  -80.0], look: [ -0.5,  1.5, -130.0] },
  // VR transition — camera right-biased (text is right, model+buildings left)
  { t: 0.55, pos: [  2.0,  3.0, -115.0], look: [ -1.2,  1.5, -160.0] },
  // VR peak — dive deeper, slight right sweep
  { t: 0.67, pos: [  1.2,  2.5, -155.0], look: [  0.0,  1.2, -200.0] },
  // Awards — rise slightly, center on road for symmetrical skyline reveal
  { t: 0.80, pos: [  0.0,  4.0, -195.0], look: [  0.0,  2.0, -250.0] },
  // Demo card — pull back and rise, city visible in background
  { t: 0.92, pos: [ -0.5,  5.0, -230.0], look: [  0.5,  2.5, -280.0] },
  // Full end — high vantage, looking toward infinite horizon
  { t: 1.00, pos: [  0.0,  7.0, -255.0], look: [  0.0,  3.0, -320.0] },
] as const;

/** Cubic in-out easing */
function cubicInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Hermite-smooth spline between adjacent keyframe values */
function splineAt(scroll: number, axis: 'px'|'py'|'pz'|'lx'|'ly'|'lz'): number {
  const path = CAM_PATH;

  let i0 = 0;
  for (let i = 0; i < path.length - 1; i++) {
    if (scroll >= path[i].t && scroll <= path[i + 1].t) { i0 = i; break; }
    if (scroll > path[path.length - 1].t) { i0 = path.length - 2; break; }
  }
  const i1 = Math.min(i0 + 1, path.length - 1);

  const range  = path[i1].t - path[i0].t;
  const localT = range > 0 ? (scroll - path[i0].t) / range : 0;
  const te     = cubicInOut(Math.max(0, Math.min(1, localT)));

  const a0 = axis === 'px' ? path[i0].pos[0] : axis === 'py' ? path[i0].pos[1] : axis === 'pz' ? path[i0].pos[2]
           : axis === 'lx' ? path[i0].look[0] : axis === 'ly' ? path[i0].look[1] : path[i0].look[2];
  const a1 = axis === 'px' ? path[i1].pos[0] : axis === 'py' ? path[i1].pos[1] : axis === 'pz' ? path[i1].pos[2]
           : axis === 'lx' ? path[i1].look[0] : axis === 'ly' ? path[i1].look[1] : path[i1].look[2];

  return a0 + (a1 - a0) * te;
}

export default function SceneContent({ scrollProgressRef, bgScrollRef }: SceneContentProps) {
  const targetPos  = useRef(new THREE.Vector3(0, 5.5, 14));
  const targetLook = useRef(new THREE.Vector3(0, 1.5, -10));
  const smoothPos  = useRef(new THREE.Vector3(0, 5.5, 14));
  const smoothLook = useRef(new THREE.Vector3(0, 1.5, -10));
  // Previous smoothed position used to compute camera velocity
  const prevSmooth = useRef(new THREE.Vector3(0, 5.5, 14));

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
    const driftAmt = Math.max(0, 0.25 - scrollSpeed * 15);
    // Drift is now very subtle — mostly lateral (X) to feel like gentle sway
    const driftX = Math.sin(time * 0.12) * 0.3 * driftAmt;
    const driftY = Math.cos(time * 0.08) * 0.15 * driftAmt;
    targetPos.current.x += driftX;
    targetPos.current.y += driftY;

    // ── Smooth lerp to target ─────────────────────────────────────────
    smoothPos.current.lerp(targetPos.current, 0.065);
    smoothLook.current.lerp(targetLook.current, 0.055);

    // ── Camera velocity for potential VFX use ─────────────────────────
    const vel = smoothPos.current.distanceTo(prevSmooth.current);
    camVelocitySharedRef.current = THREE.MathUtils.lerp(camVelocitySharedRef.current, vel, 0.18);
    prevSmooth.current.copy(smoothPos.current);

    // ── Apply to camera ───────────────────────────────────────────────
    state.camera.position.copy(smoothPos.current);
    state.camera.lookAt(smoothLook.current);

    // ── Dynamic FOV — slightly wider while moving fast ────────────────
    const pCam = state.camera as THREE.PerspectiveCamera;
    if (pCam.isPerspectiveCamera) {
      const fovTarget = 62 + camVelocitySharedRef.current * 60;
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, Math.min(fovTarget, 72), 0.05);
      pCam.updateProjectionMatrix();
    }
  });

  return (
    <CityEnvironment
      scrollProgressRef={scrollProgressRef}
      bgScrollRef={bgScrollRef}
    />
  );
}

/** Module-level ref so subsystems can read camera velocity without prop drilling. */
export const camVelocitySharedRef = { current: 0 };
