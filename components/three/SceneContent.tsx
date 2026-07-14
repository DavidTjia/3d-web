"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import CityEnvironment from "./CityEnvironment";

interface SceneContentProps {
  scrollProgressRef: React.RefObject<number>; // hero-only (0→1 first 100vh)
  bgScrollRef: React.RefObject<number>; // full-page (0→1 across entire page)
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
  // Hero — centered above the road entrance, looking down the corridor
  { t: 0.0, pos: [0.0, 5.5, 14.0], look: [0.0, 1.6, -6.0] },
  // Approach — smoothly descend closer to the road centerline
  { t: 0.17, pos: [0.0, 4.6, 2.0], look: [0.0, 1.5, -18.0] },
  // Mid journey — stable centered dolly along the boulevard
  { t: 0.43, pos: [0.0, 3.7, -95.0], look: [0.0, 1.5, -110.0] },
  // Deep corridor — gentle rise for a premium horizon view
  { t: 0.70, pos: [0.0, 3.9, -165.0], look: [0.0, 1.6, -185.0] },
  // Approach final plaza — calm, centered and slightly elevated
  { t: 0.85, pos: [0.0, 4.4, -215.0], look: [0.0, 1.8, -245.0] },
  // Final destination — centered, premium, horizon-focused
  { t: 1.0, pos: [0.0, 5.2, -255.0], look: [0.0, 2.2, -285.0] },
] as const;

/** Cubic in-out easing */
function cubicInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Hermite-smooth spline between adjacent keyframe values */
function splineAt(
  scroll: number,
  axis: "px" | "py" | "pz" | "lx" | "ly" | "lz",
): number {
  const path = CAM_PATH;

  let i0 = 0;
  for (let i = 0; i < path.length - 1; i++) {
    if (scroll >= path[i].t && scroll <= path[i + 1].t) {
      i0 = i;
      break;
    }
    if (scroll > path[path.length - 1].t) {
      i0 = path.length - 2;
      break;
    }
  }
  const i1 = Math.min(i0 + 1, path.length - 1);

  const range = path[i1].t - path[i0].t;
  const localT = range > 0 ? (scroll - path[i0].t) / range : 0;
  const te = cubicInOut(Math.max(0, Math.min(1, localT)));

  const a0 =
    axis === "px"
      ? path[i0].pos[0]
      : axis === "py"
        ? path[i0].pos[1]
        : axis === "pz"
          ? path[i0].pos[2]
          : axis === "lx"
            ? path[i0].look[0]
            : axis === "ly"
              ? path[i0].look[1]
              : path[i0].look[2];
  const a1 =
    axis === "px"
      ? path[i1].pos[0]
      : axis === "py"
        ? path[i1].pos[1]
        : axis === "pz"
          ? path[i1].pos[2]
          : axis === "lx"
            ? path[i1].look[0]
            : axis === "ly"
              ? path[i1].look[1]
              : path[i1].look[2];

  return a0 + (a1 - a0) * te;
}

export default function SceneContent({
  scrollProgressRef,
  bgScrollRef,
}: SceneContentProps) {
  const targetPos = useRef(new THREE.Vector3(0, 5.5, 14));
  const targetLook = useRef(new THREE.Vector3(0, 1.5, -10));
  const smoothPos = useRef(new THREE.Vector3(0, 5.5, 14));
  const smoothLook = useRef(new THREE.Vector3(0, 1.5, -10));
  // Previous smoothed position used to compute camera velocity
  const prevSmooth = useRef(new THREE.Vector3(0, 5.5, 14));

  useFrame((state) => {
    const scroll = bgScrollRef.current ?? 0;
    const time = state.clock.getElapsedTime();

    // ── Compute target from spline ────────────────────────────────────
    targetPos.current.set(
      splineAt(scroll, "px"),
      splineAt(scroll, "py"),
      splineAt(scroll, "pz"),
    );
    targetLook.current.set(
      splineAt(scroll, "lx"),
      splineAt(scroll, "ly"),
      splineAt(scroll, "lz"),
    );

    // ── No lateral drift: keep the path locked on the road center.
    const scrollSpeed = Math.abs(
      scroll - (state.camera.userData.prevScroll ?? scroll),
    );
    state.camera.userData.prevScroll = scroll;
    targetPos.current.x = 0;
    targetLook.current.x = 0;

    // ── Smooth lerp to target with strong damping for premium motion.
    smoothPos.current.lerp(targetPos.current, 0.12);
    smoothLook.current.lerp(targetLook.current, 0.11);

    // ── Camera velocity for potential VFX use ─────────────────────────
    const vel = smoothPos.current.distanceTo(prevSmooth.current);
    camVelocitySharedRef.current = THREE.MathUtils.lerp(
      camVelocitySharedRef.current,
      vel,
      0.18,
    );
    prevSmooth.current.copy(smoothPos.current);

    // ── Apply to camera ───────────────────────────────────────────────
    state.camera.position.copy(smoothPos.current);
    state.camera.lookAt(smoothLook.current);

    // ── Keep the horizon stable with a steady, slight pitch.
    state.camera.rotation.z = 0;
    state.camera.rotation.x = THREE.MathUtils.lerp(
      state.camera.rotation.x,
      -0.03,
      0.06,
    );

    // ── Slightly stabilize FOV so motion feels calm.
    const pCam = state.camera as THREE.PerspectiveCamera;
    if (pCam.isPerspectiveCamera) {
      const fovTarget = 62 + camVelocitySharedRef.current * 6;
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, Math.min(fovTarget, 64), 0.03);
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
