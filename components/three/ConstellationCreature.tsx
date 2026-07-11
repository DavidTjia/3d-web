'use client';

/**
 * ConstellationCreature — A procedurally jointed cosmic insect/spider organism.
 *
 * Architecture:
 * ─────────────
 *   Mouse cursor (screen)
 *       ↓  (HTML rocket with lerp 0.12)
 *   Rocket cursor
 *       ↓  (WebGL head with lerp 0.045 — trails behind)
 *   Glowing HEAD (body core)
 *       ↓
 *   Up to 8 active curved limbs connecting to background stars
 *       ↓
 *   Glowing FOOT SPHERES — luminous white orbs at each anchor point
 *
 * Behaviour:
 * ──────────
 *   The background stars serve as the permanent foot placements (anchors).
 *   As the head moves close to a star, a procedural 3D leg is activated.
 *   The leg consists of 3 joints: Head -> Hip (Joint 1) -> Knee (Joint 2) -> Star (Anchor).
 *   The joints bend naturally upwards and outwards like an insect/spider limb,
 *   using a Cubic Bezier curve algorithm computed dynamically on the CPU.
 *   When the head moves away, the leg fades out smoothly instead of snapping off.
 *   Subtle time-based noise is applied to the joints to simulate organic breathing/twitching.
 *   Each active leg endpoint shows a glowing foot-pad sphere (layered core + glow + aura)
 *   that pulsates as if the creature is pressing its weight onto the star surface.
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { STARS, STAR_COUNT } from '@/lib/starData';

interface ConstellationCreatureProps {
  scrollProgressRef: React.RefObject<number>;
}

interface LegSlot {
  /** Index into the shared STARS array, or -1 if empty */
  starIndex: number;
  /** Current interpolated opacity/weight (0 = invisible, 1 = fully formed) */
  currentWeight: number;
  /** Target weight (1 if within range, 0 if out of range) */
  targetWeight: number;
}

// ─── Configuration ──────────────────────────────────────────────────────
const MAX_LEGS = 8;
const SEGMENTS_PER_LEG = 16; // Number of subdivisions for the curve
const CONNECT_RADIUS = 3.2;  // XY distance to connect a star
const DISCONNECT_RADIUS = 4.0; // XY distance to disconnect (hysteresis)

// ─── Flat pre-allocated GPU Buffers ─────────────────────────────────────
// 8 legs × 16 segments × 2 vertices/segment × 3 floats (xyz) = 768 floats
const LINE_POSITIONS = new Float32Array(MAX_LEGS * SEGMENTS_PER_LEG * 2 * 3);
// 8 legs × 16 segments × 2 vertices/segment × 1 float (alpha) = 256 floats
const LINE_ALPHAS = new Float32Array(MAX_LEGS * SEGMENTS_PER_LEG * 2);

// ─── Foot sphere helper ──────────────────────────────────────────────────
// Shared Object3D for computing instance matrices without allocation overhead
const FOOT_DUMMY = new THREE.Object3D();
// Zero-scale matrix to hide inactive instances
const FOOT_ZERO = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001);

// ─── Custom Shader Material for glow look ──────────────────────────────
const LEG_MATERIAL = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float alpha;
    varying float vAlpha;
    void main() {
      vAlpha = alpha;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      // Soft, celestial white-blue glow
      gl_FragColor = vec4(0.9, 0.96, 1.0, vAlpha * 0.75);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

// ─── Helper: Evaluate Cubic Bezier ─────────────────────────────────────
function evaluateCubicBezier(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
  out: THREE.Vector3
) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  out.set(0, 0, 0)
    .addScaledVector(p0, mt3)
    .addScaledVector(p1, 3 * mt2 * t)
    .addScaledVector(p2, 3 * mt * t2)
    .addScaledVector(p3, t3);
}

// ═════════════════════════════════════════════════════════════════════════
export default function ConstellationCreature({ scrollProgressRef }: ConstellationCreatureProps) {
  const headGroupRef    = useRef<THREE.Group>(null);
  const headPos         = useRef(new THREE.Vector3(0, 0, 0));
  const linesRef        = useRef<THREE.LineSegments>(null);

  // ── Foot sphere instanced mesh refs (3 layers per foot) ──────────────
  const footCoreRef  = useRef<THREE.InstancedMesh>(null);  // solid bright core
  const footGlowRef  = useRef<THREE.InstancedMesh>(null);  // tight inner halo
  const footAuraRef  = useRef<THREE.InstancedMesh>(null);  // wide soft aura

  // Persistence of leg states
  const legSlots = useRef<LegSlot[]>(
    Array.from({ length: MAX_LEGS }, () => ({
      starIndex: -1,
      currentWeight: 0,
      targetWeight: 0,
    }))
  );

  // Pre-allocated vectors to avoid garbage collection overhead
  const targetVec  = useMemo(() => new THREE.Vector3(), []);
  const p0         = useMemo(() => new THREE.Vector3(), []);
  const p1         = useMemo(() => new THREE.Vector3(), []);
  const p2         = useMemo(() => new THREE.Vector3(), []);
  const p3         = useMemo(() => new THREE.Vector3(), []);
  const ptA        = useMemo(() => new THREE.Vector3(), []);
  const ptB        = useMemo(() => new THREE.Vector3(), []);
  const segmentDir = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const scroll = scrollProgressRef.current ?? 0;
    const { pointer, viewport } = state;

    const fade = Math.max(0, 1 - scroll * 1.8);
    if (fade < 0.001) return;

    // ----------------------------------------------------------------
    // 1. HEAD MOTION (Body of the insect)
    // ----------------------------------------------------------------
    const cursorX = (pointer.x * viewport.width) / 2;
    const cursorY = (pointer.y * viewport.height) / 2;
    targetVec.set(cursorX, cursorY, 0);

    // Inertia chasing of the cursor
    headPos.current.lerp(targetVec, 0.045);

    // Soft organic breathing drift
    const idleX = Math.sin(time * 0.75) * 0.05;
    const idleY = Math.cos(time * 0.6) * 0.04;

    if (headGroupRef.current) {
      headGroupRef.current.position.set(
        headPos.current.x + idleX,
        headPos.current.y + idleY,
        headPos.current.z
      );

      // Breathing scale pulse
      const dist = headPos.current.distanceTo(targetVec);
      const isIdle = dist < 0.1;
      const freq = isIdle ? 3.0 : 5.5;
      const amp  = isIdle ? 0.05 : 0.12;
      const s    = (1 + Math.sin(time * freq) * amp) * fade;
      headGroupRef.current.scale.set(s, s, s);
    }

    // ----------------------------------------------------------------
    // 2. PROCEDURAL MULTI-JOINT LIMB CALCULATIONS
    // ----------------------------------------------------------------
    const slots = legSlots.current;
    const hx = headPos.current.x;
    const hy = headPos.current.y;

    // 2a. Update weights of active legs, release if faded out
    for (let j = 0; j < MAX_LEGS; j++) {
      const slot = slots[j];
      if (slot.starIndex === -1) continue;

      const starPos = STARS[slot.starIndex].position;
      const dx = hx - starPos.x;
      const dy = hy - starPos.y;
      const dist2D = Math.sqrt(dx * dx + dy * dy);

      slot.targetWeight = dist2D > DISCONNECT_RADIUS ? 0 : 1;
      slot.currentWeight += (slot.targetWeight - slot.currentWeight) * 0.08;

      if (slot.targetWeight === 0 && slot.currentWeight < 0.005) {
        slot.starIndex = -1;
        slot.currentWeight = 0;
      }
    }

    // 2b. Query closest stars within connection range to anchor new legs
    const candidates: { idx: number; dist: number }[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const starPos = STARS[i].position;
      const dx = hx - starPos.x;
      const dy = hy - starPos.y;
      const dist2D = Math.sqrt(dx * dx + dy * dy);
      if (dist2D < CONNECT_RADIUS) {
        candidates.push({ idx: i, dist: dist2D });
      }
    }
    candidates.sort((a, b) => a.dist - b.dist);

    // Bind candidates to available slots
    for (const cand of candidates) {
      if (slots.some((s) => s.starIndex === cand.idx)) continue;
      const emptyIdx = slots.findIndex((s) => s.starIndex === -1);
      if (emptyIdx === -1) break;
      slots[emptyIdx].starIndex = cand.idx;
      slots[emptyIdx].targetWeight = 1;
      slots[emptyIdx].currentWeight = 0.02;
    }

    // ----------------------------------------------------------------
    // 3. GENERATING CURVED GEOMETRIES (Cubic Bezier Spline)
    // ----------------------------------------------------------------
    if (!linesRef.current) return;

    const posAttr   = linesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const alphaAttr = linesRef.current.geometry.getAttribute('alpha')    as THREE.BufferAttribute;

    let footMatricesChanged = false;

    for (let j = 0; j < MAX_LEGS; j++) {
      const slot = slots[j];
      const legOffsetPos   = j * SEGMENTS_PER_LEG * 2 * 3;
      const legOffsetAlpha = j * SEGMENTS_PER_LEG * 2;

      const active = slot.starIndex !== -1 && slot.currentWeight > 0.005 && fade > 0.01;

      if (active) {
        const starPos = STARS[slot.starIndex].position;

        // Joint Anchor Positions
        p0.copy(headPos.current);   // Head attachment
        p3.copy(starPos);           // Star foot anchor

        segmentDir.subVectors(p3, p0);
        const dist3D = segmentDir.length();

        // Knee joint elevation
        const bendHeight = 0.8 + dist3D * 0.45;

        // Organic idle noise
        const noiseX1 = Math.sin(time * 2.2 + j * 1.5) * 0.05;
        const noiseY1 = Math.cos(time * 1.8 + j * 2.0) * 0.04;
        const noiseZ1 = Math.sin(time * 1.5 - j) * 0.04;
        const noiseX2 = Math.cos(time * 2.0 - j * 1.1) * 0.06;
        const noiseY2 = Math.sin(time * 2.4 + j * 0.8) * 0.05;
        const noiseZ2 = Math.cos(time * 1.6 + j * 1.4) * 0.05;

        // P1: Hip (extends slightly outward and up)
        p1.copy(p0)
          .addScaledVector(segmentDir, 0.25)
          .add(new THREE.Vector3(noiseX1, bendHeight * 0.35 + noiseY1, noiseZ1));

        // P2: Knee joint (highest bending point of the limb)
        p2.copy(p0)
          .addScaledVector(segmentDir, 0.65)
          .add(new THREE.Vector3(noiseX2, bendHeight + noiseY2, noiseZ2));

        // Generate curve segments
        for (let s = 0; s < SEGMENTS_PER_LEG; s++) {
          const tA = s / SEGMENTS_PER_LEG;
          const tB = (s + 1) / SEGMENTS_PER_LEG;

          evaluateCubicBezier(p0, p1, p2, p3, tA, ptA);
          evaluateCubicBezier(p0, p1, p2, p3, tB, ptB);

          const idxP = legOffsetPos   + s * 6;
          const idxA = legOffsetAlpha + s * 2;

          LINE_POSITIONS[idxP]     = ptA.x;
          LINE_POSITIONS[idxP + 1] = ptA.y;
          LINE_POSITIONS[idxP + 2] = ptA.z;
          LINE_POSITIONS[idxP + 3] = ptB.x;
          LINE_POSITIONS[idxP + 4] = ptB.y;
          LINE_POSITIONS[idxP + 5] = ptB.z;

          const taper      = 1.0 - tA * 0.6;
          const limbWeight = slot.currentWeight * fade * taper;
          LINE_ALPHAS[idxA]     = limbWeight;
          LINE_ALPHAS[idxA + 1] = slot.currentWeight * fade * (1.0 - tB * 0.6);
        }

        // ── Update foot sphere instance at star position ──────────────
        // Pulsating scale for the "pressing weight" feel
        const pulse = 1.0 + Math.sin(time * 4.5 + j * 0.9) * 0.12;
        const w     = slot.currentWeight * fade;

        FOOT_DUMMY.position.set(starPos.x, starPos.y, starPos.z);
        FOOT_DUMMY.scale.setScalar(w * 0.10 * pulse);          // core radius
        FOOT_DUMMY.updateMatrix();
        footCoreRef.current?.setMatrixAt(j, FOOT_DUMMY.matrix);

        FOOT_DUMMY.scale.setScalar(w * 0.22 * pulse);           // tight glow
        FOOT_DUMMY.updateMatrix();
        footGlowRef.current?.setMatrixAt(j, FOOT_DUMMY.matrix);

        FOOT_DUMMY.scale.setScalar(w * 0.50 * (1 + Math.sin(time * 2.2 + j) * 0.08)); // wide aura breathes slower
        FOOT_DUMMY.updateMatrix();
        footAuraRef.current?.setMatrixAt(j, FOOT_DUMMY.matrix);

      } else {
        // Collapse line segment
        for (let s = 0; s < SEGMENTS_PER_LEG; s++) {
          const idxP = legOffsetPos   + s * 6;
          const idxA = legOffsetAlpha + s * 2;
          LINE_POSITIONS[idxP]     = hx; LINE_POSITIONS[idxP + 1] = hy; LINE_POSITIONS[idxP + 2] = 0;
          LINE_POSITIONS[idxP + 3] = hx; LINE_POSITIONS[idxP + 4] = hy; LINE_POSITIONS[idxP + 5] = 0;
          LINE_ALPHAS[idxA] = 0; LINE_ALPHAS[idxA + 1] = 0;
        }

        // Hide this foot sphere instance
        footCoreRef.current?.setMatrixAt(j, FOOT_ZERO);
        footGlowRef.current?.setMatrixAt(j, FOOT_ZERO);
        footAuraRef.current?.setMatrixAt(j, FOOT_ZERO);
      }

      footMatricesChanged = true;
    }

    posAttr.needsUpdate   = true;
    alphaAttr.needsUpdate = true;

    if (footMatricesChanged) {
      if (footCoreRef.current)  footCoreRef.current.instanceMatrix.needsUpdate  = true;
      if (footGlowRef.current)  footGlowRef.current.instanceMatrix.needsUpdate  = true;
      if (footAuraRef.current)  footAuraRef.current.instanceMatrix.needsUpdate  = true;
    }
  });

  return (
    <group>
      {/* 1. Procedural Limb Segments */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[LINE_POSITIONS, 3]}
            count={MAX_LEGS * SEGMENTS_PER_LEG * 2}
            array={LINE_POSITIONS}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-alpha"
            args={[LINE_ALPHAS, 1]}
            count={MAX_LEGS * SEGMENTS_PER_LEG * 2}
            array={LINE_ALPHAS}
            itemSize={1}
          />
        </bufferGeometry>
        <primitive object={LEG_MATERIAL} attach="material" />
      </lineSegments>

      {/* 2. Foot Tip Spheres — 3 layers per leg anchor point */}

      {/* Layer A: Solid bright white core (the "contact point") */}
      <instancedMesh
        ref={footCoreRef}
        args={[undefined, undefined, MAX_LEGS]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial
          color="#bfe8ff"
          transparent
          opacity={0.65}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Layer B: Tight inner glow halo (cyan-white) */}
      <instancedMesh
        ref={footGlowRef}
        args={[undefined, undefined, MAX_LEGS]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 14, 14]} />
        <meshBasicMaterial
          color="#8cd5ff"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Layer C: Wide soft aura (blue-violet breathing pulse) */}
      <instancedMesh
        ref={footAuraRef}
        args={[undefined, undefined, MAX_LEGS]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial
          color="#5c7eff"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* 3. Core Body Head (Layered Glow Halos) */}
      <group ref={headGroupRef}>
        {/* Core solid sphere */}
        <mesh>
          <sphereGeometry args={[0.16, 32, 32]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>

        {/* Inner tight glow */}
        <mesh>
          <sphereGeometry args={[0.32, 16, 16]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent opacity={0.4}
            blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}
          />
        </mesh>

        {/* Mid glow aura */}
        <mesh>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial
            color="#a2e2ff"
            transparent opacity={0.16}
            blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}
          />
        </mesh>

        {/* Wide soft purple aura */}
        <mesh>
          <sphereGeometry args={[0.9, 16, 16]} />
          <meshBasicMaterial
            color="#7c3aed"
            transparent opacity={0.06}
            blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
