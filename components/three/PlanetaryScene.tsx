"use client";

/**
 * PlanetaryScene — Cyberpunk Grid Floor.
 * Planet-planet dihapus, diganti lantai grid neon perspektif ala
 * synthwave/cyberpunk, dengan subtle parallax mouse & scroll drift.
 */

import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";

interface PlanetarySceneProps {
  scrollProgressRef: React.RefObject<number>;
  bgScrollRef?: React.RefObject<number>;
}

// ─── Grid Vertex Shader ──────────────────────────────────────────────────
const GRID_VERT = `
  varying vec2 vUv;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// ─── Grid Fragment Shader — neon green lines, fade ke horizon ───────────
const GRID_FRAG = `
  uniform float uTime;
  uniform float uScroll;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  float gridLine(vec2 uv, float cells) {
    vec2 grid = abs(fract(uv * cells) - 0.5);
    vec2 d = fwidth(uv * cells) * 1.5;
    vec2 lines = smoothstep(d, d * 0.4, grid);
    return max(lines.x, lines.y);
  }

  void main() {
    vec2 uv = vUv;
    // Grid "bergerak" pelan + ikut scroll — biar berasa hidup & interaktif
    uv.y += uTime * 0.035 + uScroll * 0.6;

    float major = gridLine(uv, 36.0);
    float minor = gridLine(uv, 180.0) * 0.30;
    float g = max(major, minor);

    vec3 neon = vec3(0.10, 1.0, 0.55); // hijau neon
    float dist = length(vViewPosition);
    float fade = smoothstep(55.0, 6.0, dist);

    vec3 col = neon * g * fade;
    float alpha = g * fade;
    gl_FragColor = vec4(col, alpha);
  }
`;

export default function PlanetaryScene({
  scrollProgressRef,
  bgScrollRef,
}: PlanetarySceneProps) {
  const gridGroupRef = useRef<THREE.Group>(null);

  // Pakai useMemo untuk material biar aman dengan React Compiler
  // (React Compiler melarang akses ref.current saat render)
  const gridMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GRID_VERT,
        fragmentShader: GRID_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uScroll: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );
  // Ref untuk mutasi uniform di useFrame tanpa trigger re-render
  const gridMatRef = useRef(gridMat);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const scroll = bgScrollRef?.current ?? scrollProgressRef.current ?? 0;
    const { pointer } = state;

    const mat = gridMatRef.current;
    if (mat) {
      mat.uniforms.uTime.value = time;
      mat.uniforms.uScroll.value = scroll;
    }

    // Parallax halus ngikutin mouse — kesan interaktif tanpa berlebihan
    if (gridGroupRef.current) {
      const targetRotX = -0.02 + pointer.y * 0.03;
      const targetRotZ = pointer.x * 0.02;
      gridGroupRef.current.rotation.x +=
        (targetRotX - gridGroupRef.current.rotation.x) * 0.05;
      gridGroupRef.current.rotation.z +=
        (targetRotZ - gridGroupRef.current.rotation.z) * 0.05;

      // Sedikit drift vertikal ngikutin scroll biar berasa "melayang" di atas grid
      gridGroupRef.current.position.y = -5.0 + scroll * 0.6;
    }
  });

  return (
    <group ref={gridGroupRef}>
      {/* Lantai grid utama */}
      <mesh
        material={gridMat}
        position={[0, -5.0, -30]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[90, 220, 1, 1]} />
      </mesh>

      {/* Glow tipis dekat horizon biar transisi ke background nggak keras */}
      <mesh position={[0, -4.98, -60]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[90, 40]} />
        <meshBasicMaterial
          color={new THREE.Color(0.05, 0.9, 0.45)}
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Ambient light hijau redup biar mood konsisten */}
      <ambientLight intensity={0.05} color={new THREE.Color(0.1, 1, 0.5)} />
    </group>
  );
}
