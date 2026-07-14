"use client";

/**
 * CityEnvironment — Futuristic Corporate Cyberpunk City
 *
 * A dense procedural city built from Three.js geometry only.
 * No imported GLB assets, no external textures.
 *
 * Subsystems:
 *   CityRoad       — animated pink glowing road with lane markings
 *   CityBuildings  — InstancedMesh skyscrapers with emissive windows
 *   CityWindows    — InstancedMesh glowing window quads (animated)
 *   CityLEDStrips  — InstancedMesh pink/purple edge LED trim
 *   CityBillboards — holographic sign planes with shader animation
 *   CityProps      — street lamps, antennas, utility boxes
 *   CityCables     — hanging cable tubes between buildings
 *   CityParticles  — slow ambient steam/dust drift
 *   CityAtmosphere — horizon glow planes + ambient haze
 *   SkyBridges     — elevated walkways connecting buildings
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// ─── Color palette ────────────────────────────────────────────────────────────
const C_MAGENTA = new THREE.Color("#8e3e75");
const C_PURPLE = new THREE.Color("#6848d3");
const C_CYAN = new THREE.Color("#22d3ee");
const C_METAL = new THREE.Color("#07080c");
const C_GLASS = new THREE.Color("#050608");

const BILLBOARD_LABELS = [
  "KVT",
  "WARDEKA",
  "VR EXPERIENCE",
  "IMMERSIVE LEARNING",
  "ENTERPRISE XR",
  "CYBER HUB",
  "IMMERSIVE GRID",
  "DIGITAL DISTRICT",
  "HEADQUARTERS",
  "SYSTEMS",
  "HYPERLOOP",
  "CORPORATE",
];

function createBillboardTexture(label: string, accent: THREE.Color) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(16, 16, 24, 0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "rgba(255,255,255,0.06)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.0)");
  gradient.addColorStop(1, "rgba(255,255,255,0.06)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = accent.getStyle();
  ctx.globalAlpha = 0.2;
  ctx.fillRect(60, canvas.height - 72, canvas.width - 120, 18);
  ctx.fillRect(60, 48, canvas.width - 120, 14);
  ctx.globalAlpha = 1.0;

  ctx.fillStyle = "rgba(245,245,255,0.92)";
  ctx.font = "bold 112px Inter, system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 72, canvas.height * 0.56);

  ctx.fillStyle = accent.getStyle();
  ctx.font = "500 32px Inter, system-ui";
  ctx.fillText("CYBER DISTRICT", 72, canvas.height * 0.84);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// ─── Deterministic pseudo-random ─────────────────────────────────────────────
function sr(seed: number): number {
  const x = Math.sin(seed + 1.618) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Road Shaders ─────────────────────────────────────────────────────────────
const ROAD_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ROAD_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  varying vec2 vUv;

  float sdLine(float x, float center, float half_w) {
    return smoothstep(half_w + 0.002, half_w - 0.002, abs(x - center));
  }

  void main() {
    vec2 uv = vUv;

    // Base asphalt — dark reflective
    vec3 asphalt = vec3(0.04, 0.03, 0.06);

    // Subtle asphalt grain
    float grain = fract(sin(dot(uv * 200.0, vec2(12.9898, 78.233))) * 43758.5453) * 0.025;
    asphalt += grain;

    // Road length axis = U (0→1 maps to near→far)
    // Road width axis  = V (0→1 maps left→right)

    // Animate road toward camera — gives forward-motion illusion
    float roadU = uv.x - uTime * 0.08 - uScroll * 0.4;

    // ─── Center divider lines (muted magenta dashes) ────────
    float dashLen  = 0.04;
    float dashGap  = 0.06;
    float dashCycle = dashLen + dashGap;
    float dashPhase = mod(roadU, dashCycle);
    float dashMask  = step(dashPhase, dashLen);

    float cLine1 = sdLine(uv.y, 0.48, 0.0035) * dashMask;
    float cLine2 = sdLine(uv.y, 0.52, 0.0035) * dashMask;
    float centerLines = max(cLine1, cLine2);

    // ─── Continuous lane edge lines (soft white) ────────────
    float laneL = sdLine(uv.y, 0.20, 0.0025);
    float laneR = sdLine(uv.y, 0.80, 0.0025);
    float laneEdges = max(laneL, laneR) * 0.22;

    // ─── Outer road edge lines (muted magenta) ──────────────
    float edgeL = sdLine(uv.y, 0.05, 0.004);
    float edgeR = sdLine(uv.y, 0.95, 0.004);
    float edgeLines = max(edgeL, edgeR) * 0.25;

    // ─── Slight moving strips for subtle motion ─────────────
    float stripU = mod(roadU * 5.0 + uTime * 0.2, 1.0);
    float stripV1 = sdLine(uv.y, 0.10, 0.006) * smoothstep(0.9, 1.0, stripU);
    float stripV2 = sdLine(uv.y, 0.90, 0.006) * smoothstep(0.9, 1.0, stripU);
    float lightStrips = max(stripV1, stripV2) * 0.65;

    // ─── Reflective puddle shimmer near center ─────────────────
    float puddle = smoothstep(0.4, 0.5, uv.y) * smoothstep(0.6, 0.5, uv.y);
    float shimmer = sin(roadU * 70.0 + uTime * 1.6) * 0.5 + 0.5;
    puddle *= shimmer * 0.028;

    // ─── Horizon fade ──────────────────────────────────────────
    float horizonFade = smoothstep(0.0, 0.18, uv.x);
    float nearFade    = smoothstep(0.0, 0.04, uv.x);

    // ─── Compose ──────────────────────────────────────────────
    vec3 magentaGlow  = vec3(0.88, 0.22, 0.56);
    vec3 whiteGlow = vec3(0.82, 0.84, 0.92);
    vec3 cyanGlow = vec3(0.3, 0.95, 1.0);

    vec3 col = asphalt + puddle * 0.8;
    col += magentaGlow  * centerLines * 0.75;
    col += whiteGlow * laneEdges * 0.4;
    col += magentaGlow  * edgeLines * 0.35;
    col += cyanGlow * lightStrips * 0.45;

    float alpha = horizonFade * nearFade;
    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── Billboard Shaders ────────────────────────────────────────────────────────
const BILLBOARD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BILLBOARD_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uIndex;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    float diag = uv.x * 0.5 + uv.y * 0.5;
    vec3 bg = mix(vec3(1.0, 0.17, 0.53), vec3(0.48, 0.23, 0.93), diag);
    bg *= 0.25;

    float scan    = mod(uv.y * 40.0 + uTime * 1.5, 1.0);
    float scanLine = smoothstep(0.85, 1.0, scan) * 0.18;

    float flicker = 0.8 + 0.2 * sin(uTime * 7.3 + uIndex * 2.1);

    float bar = smoothstep(0.03, 0.0, abs(mod(uv.y + uTime * 0.25 + uIndex * 0.3, 1.0) - 0.5));
    bar *= 0.6;

    float edgeX = smoothstep(0.15, 0.0, uv.x) + smoothstep(0.85, 1.0, uv.x);
    float edgeY = smoothstep(0.08, 0.0, uv.y) + smoothstep(0.92, 1.0, uv.y);
    float edge  = max(edgeX, edgeY);

    float noise = hash(floor(uv * 8.0) + vec2(floor(uTime * 3.0), 0.0)) * 0.08;

    vec3 pinkGlow   = vec3(1.0, 0.17, 0.53);
    vec3 purpleGlow = vec3(0.48, 0.23, 0.93);

    vec3 col = bg + scanLine + bar * pinkGlow + edge * purpleGlow * 1.5 + noise;
    col *= flicker;

    float theme = mod(uIndex, 3.0);
    if (theme < 1.0)      col *= vec3(1.0, 0.8, 0.9);
    else if (theme < 2.0) col *= vec3(0.8, 0.7, 1.0);
    else                  col *= vec3(0.7, 0.95, 1.0);

    gl_FragColor = vec4(col, 0.75 + scanLine * 0.25);
  }
`;

// ─── Atmosphere Shaders ───────────────────────────────────────────────────────
const ATMO_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMO_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float band  = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
    float pulse = 0.85 + 0.15 * sin(uTime * 0.4);
    vec3 col    = mix(vec3(0.48, 0.23, 0.93), vec3(1.0, 0.17, 0.53), vUv.x) * band * pulse;
    gl_FragColor = vec4(col, band * 0.18);
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// CityRoad
// ═══════════════════════════════════════════════════════════════════════════════
function CityRoad({ roadMat }: { roadMat: THREE.ShaderMaterial }) {
  const sidewalkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0a0812"),
        roughness: 0.9,
        metalness: 0.1,
      }),
    [],
  );

  const barrierMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0d0d1e"),
        roughness: 0.3,
        metalness: 0.8,
        emissive: C_MAGENTA,
        emissiveIntensity: 0.18,
      }),
    [],
  );

  return (
    <group>
      <mesh
        material={roadMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, -130]}
      >
        <planeGeometry args={[28, 280, 2, 2]} />
      </mesh>

      <mesh
        material={sidewalkMat}
        position={[-16, 0.05, -130]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[6, 280]} />
      </mesh>
      <mesh
        material={sidewalkMat}
        position={[16, 0.05, -130]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[6, 280]} />
      </mesh>

      <mesh material={barrierMat} position={[-13, 0.25, -130]}>
        <boxGeometry args={[0.3, 0.5, 280]} />
      </mesh>
      <mesh material={barrierMat} position={[13, 0.25, -130]}>
        <boxGeometry args={[0.3, 0.5, 280]} />
      </mesh>
      <mesh material={barrierMat} position={[0, 0.15, -130]}>
        <boxGeometry args={[0.2, 0.3, 280]} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Building layout data
// ═══════════════════════════════════════════════════════════════════════════════
interface BuildingData {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  side: "left" | "right";
}

function generateBuildings(): BuildingData[] {
  const buildings: BuildingData[] = [];
  const sections = [
    { zStart: -5, zEnd: -55, leftCount: 6, rightCount: 6 },
    { zStart: -55, zEnd: -140, leftCount: 14, rightCount: 22 },
    { zStart: -140, zEnd: -220, leftCount: 22, rightCount: 14 },
    { zStart: -220, zEnd: -300, leftCount: 16, rightCount: 16 },
  ];

  sections.forEach((sec, si) => {
    const zRange = sec.zEnd - sec.zStart;

    for (let i = 0; i < sec.leftCount; i++) {
      const seed = si * 1000 + i * 13;
      const w = 4 + sr(seed) * 6;
      const d = 4 + sr(seed + 1) * 8;
      const h = 8 + sr(seed + 2) * (si === 0 ? 20 : 40);
      const xBase = -20 - sr(seed + 3) * 18;
      const z =
        sec.zStart +
        (i / sec.leftCount) * zRange -
        sr(seed + 4) * (zRange / sec.leftCount) * 0.5;
      buildings.push({
        x: xBase,
        z,
        width: w,
        depth: d,
        height: h,
        side: "left",
      });
    }

    for (let i = 0; i < sec.rightCount; i++) {
      const seed = si * 2000 + i * 17;
      const w = 4 + sr(seed) * 6;
      const d = 4 + sr(seed + 1) * 8;
      const h = 8 + sr(seed + 2) * (si === 0 ? 20 : 40);
      const xBase = 20 + sr(seed + 3) * 18;
      const z =
        sec.zStart +
        (i / sec.rightCount) * zRange -
        sr(seed + 4) * (zRange / sec.rightCount) * 0.5;
      buildings.push({
        x: xBase,
        z,
        width: w,
        depth: d,
        height: h,
        side: "right",
      });
    }
  });

  return buildings;
}

const BUILDING_DATA = generateBuildings();
const BUILDING_COUNT = BUILDING_DATA.length;

// ═══════════════════════════════════════════════════════════════════════════════
// CityBuildings — InstancedMesh skyscrapers
// ═══════════════════════════════════════════════════════════════════════════════
function CityBuildings() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const glassMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const metalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: C_METAL,
        roughness: 0.15,
        metalness: 0.95,
        envMapIntensity: 0,
      }),
    [],
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: C_GLASS,
        roughness: 0.18,
        metalness: 0.55,
        envMapIntensity: 0.1,
        opacity: 0.88,
        transparent: true,
      }),
    [],
  );

  const initialized = useRef(false);

  useFrame(() => {
    if (initialized.current) return;
    if (!meshRef.current || !glassMeshRef.current) return;

    const mesh = meshRef.current;
    const glass = glassMeshRef.current;

    BUILDING_DATA.forEach((b, i) => {
      dummy.position.set(b.x, b.height / 2, b.z);
      dummy.scale.set(b.width, b.height, b.depth);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(b.x, b.height / 2, b.z);
      dummy.scale.set(b.width * 0.96, b.height * 0.98, b.depth * 0.96);
      dummy.updateMatrix();
      glass.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    glass.instanceMatrix.needsUpdate = true;
    initialized.current = true;
  });

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, BUILDING_COUNT]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <primitive object={metalMat} attach="material" />
      </instancedMesh>
      <instancedMesh
        ref={glassMeshRef}
        args={[undefined, undefined, BUILDING_COUNT]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <primitive object={glassMat} attach="material" />
      </instancedMesh>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CityWindows — glowing window quads animated with flicker
// ═══════════════════════════════════════════════════════════════════════════════
const WINDOW_COUNT = 1200;

interface WindowDatum {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rotY: number;
  phase: number;
  color: THREE.Color;
}

function generateWindows(): WindowDatum[] {
  const windows: WindowDatum[] = [];
  BUILDING_DATA.forEach((b, bi) => {
    const numW = Math.floor(3 + sr(bi * 7) * 5);
    const numH = Math.floor(4 + sr(bi * 11) * 8);
    const wSpacing = b.width / (numW + 1);
    const hSpacing = b.height / (numH + 2);

    for (let wi = 0; wi < numW; wi++) {
      for (let hi = 0; hi < numH; hi++) {
        if (windows.length >= WINDOW_COUNT) break;
        const seed = bi * 1000 + wi * 100 + hi;
        if (sr(seed) > 0.65) continue;
        const wx = b.x + (wi + 1) * wSpacing - b.width / 2;
        const wy = hSpacing * (hi + 1.5);
        const wz = b.z;
        if (sr(seed + 0.5) <= 0.25) continue;

        const cr = sr(seed + 0.9);
        let col: THREE.Color;
        if (cr < 0.55) col = new THREE.Color("#ff4fa0");
        else if (cr < 0.8) col = new THREE.Color("#c084fc");
        else if (cr < 0.95) col = new THREE.Color("#ffffff");
        else col = new THREE.Color("#00e5ff");

        windows.push({
          x: wx,
          y: wy,
          z: wz + b.depth / 2 + 0.05,
          w: 0.6 + sr(seed + 1) * 0.4,
          h: 0.5 + sr(seed + 2) * 0.5,
          rotY: b.side === "left" ? Math.PI : 0,
          phase: sr(seed + 3) * Math.PI * 2,
          color: col,
        });
      }
    }
  });
  return windows;
}

const WINDOW_DATA = generateWindows();
const ACTUAL_WIN_N = Math.min(WINDOW_DATA.length, WINDOW_COUNT);

function CityWindows() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempCol = useMemo(() => new THREE.Color(), []);

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const mesh = meshRef.current;

    for (let i = 0; i < ACTUAL_WIN_N; i++) {
      const w = WINDOW_DATA[i];
      dummy.position.set(w.x, w.y, w.z);
      dummy.rotation.set(0, w.rotY, 0);
      dummy.scale.set(w.w, w.h, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const flicker = 0.5 + 0.5 * Math.sin(t * 0.8 + w.phase);
      const blink = Math.sin(t * 4.3 + w.phase * 7) > 0.97 ? 0 : 1;
      const intensity = flicker * blink * 0.9;
      tempCol.copy(w.color).multiplyScalar(intensity);
      mesh.setColorAt(i, tempCol);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, ACTUAL_WIN_N]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <primitive object={mat} attach="material" />
    </instancedMesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CityLEDStrips — thin glowing edge trims
// ═══════════════════════════════════════════════════════════════════════════════
const LED_COUNT = 400;

interface LEDStrip {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rotX: number;
  rotY: number;
  phase: number;
  isPink: boolean;
}

function CityLEDStrips() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempCol = useMemo(() => new THREE.Color(), []);

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  const strips = useMemo<LEDStrip[]>(() => {
    const result: LEDStrip[] = [];
    BUILDING_DATA.forEach((b, bi) => {
      if (result.length >= LED_COUNT) return;
      const seed = bi * 31;

      if (sr(seed) > 0.4)
        result.push({
          x: b.x - b.width / 2 - 0.05,
          y: b.height / 2,
          z: b.z,
          w: 0.12,
          h: b.height,
          rotX: 0,
          rotY: Math.PI / 2,
          phase: sr(seed + 0.2) * Math.PI * 2,
          isPink: sr(seed + 0.3) > 0.35,
        });
      if (sr(seed + 1) > 0.3)
        result.push({
          x: b.x,
          y: b.height + 0.05,
          z: b.z,
          w: b.width,
          h: 0.12,
          rotX: -Math.PI / 2,
          rotY: 0,
          phase: sr(seed + 1.2) * Math.PI * 2,
          isPink: sr(seed + 1.3) > 0.45,
        });
      if (sr(seed + 2) > 0.4)
        result.push({
          x: b.x + b.width / 2 + 0.05,
          y: b.height / 2,
          z: b.z,
          w: 0.12,
          h: b.height,
          rotX: 0,
          rotY: Math.PI / 2,
          phase: sr(seed + 2.2) * Math.PI * 2,
          isPink: sr(seed + 2.3) > 0.5,
        });
    });
    return result.slice(0, LED_COUNT);
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const mesh = meshRef.current;
    const N = strips.length;

    for (let i = 0; i < N; i++) {
      const s = strips[i];
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(s.rotX, s.rotY, 0);
      dummy.scale.set(s.w, s.h, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const pulse = 0.6 + 0.4 * Math.sin(t * 1.2 + s.phase);
      if (s.isPink) tempCol.copy(C_MAGENTA).multiplyScalar(pulse * 0.65);
      else tempCol.copy(C_PURPLE).multiplyScalar(pulse * 0.5);
      mesh.setColorAt(i, tempCol);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, LED_COUNT]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <primitive object={mat} attach="material" />
    </instancedMesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CityBillboards — holographic signs
// ═══════════════════════════════════════════════════════════════════════════════
const BILLBOARD_SPECS: Array<{
  x: number;
  z: number;
  y: number;
  w: number;
  h: number;
  rotY: number;
}> = [
  { x: -18, z: -30, y: 12, w: 8, h: 4, rotY: 0.3 },
  { x: 22, z: -45, y: 14, w: 7, h: 3.5, rotY: -0.25 },
  { x: -25, z: -80, y: 18, w: 9, h: 4.5, rotY: 0.15 },
  { x: 20, z: -90, y: 10, w: 6, h: 3, rotY: -0.2 },
  { x: -20, z: -120, y: 22, w: 10, h: 5, rotY: 0.1 },
  { x: 28, z: -130, y: 16, w: 8, h: 4, rotY: -0.15 },
  { x: -22, z: -160, y: 14, w: 7, h: 3.5, rotY: 0.2 },
  { x: 24, z: -170, y: 20, w: 9, h: 4.5, rotY: -0.3 },
  { x: -30, z: -200, y: 25, w: 11, h: 5.5, rotY: 0.05 },
  { x: 26, z: -210, y: 18, w: 8, h: 4, rotY: -0.1 },
  { x: -18, z: -240, y: 16, w: 7, h: 3.5, rotY: 0.25 },
  { x: 22, z: -250, y: 12, w: 6, h: 3, rotY: -0.2 },
];

function CityBillboards() {
  const textures = useMemo(
    () =>
      BILLBOARD_SPECS.map((_, idx) => {
        const accent = idx % 3 === 0 ? C_MAGENTA : idx % 3 === 1 ? C_PURPLE : C_CYAN;
        return createBillboardTexture(BILLBOARD_LABELS[idx % BILLBOARD_LABELS.length], accent);
      }),
    [],
  );

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#15141c"),
        roughness: 0.32,
        metalness: 0.9,
        emissive: C_MAGENTA,
        emissiveIntensity: 0.2,
      }),
    [],
  );

  const poleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: C_METAL,
        roughness: 0.2,
        metalness: 0.9,
      }),
    [],
  );

  return (
    <group>
      {BILLBOARD_SPECS.map((bp, i) => (
        <group key={i} position={[bp.x, bp.y, bp.z]} rotation={[0, bp.rotY, 0]}>
          <mesh
            material={new THREE.MeshBasicMaterial({
              map: textures[i],
              transparent: true,
              opacity: 0.94,
              blending: THREE.AdditiveBlending,
              toneMapped: false,
              depthWrite: false,
            })}
          >
            <planeGeometry args={[bp.w, bp.h]} />
          </mesh>
          <mesh material={frameMat}>
            <boxGeometry args={[bp.w + 0.3, bp.h + 0.3, 0.08]} />
          </mesh>
          <mesh material={poleMat} position={[0, -(bp.h / 2 + bp.y * 0.3), 0]}>
            <cylinderGeometry args={[0.08, 0.12, bp.y * 0.6, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CityProps — street lamps, antennas, utility boxes
// ═══════════════════════════════════════════════════════════════════════════════
function CityProps() {
  const lampPositions = useMemo(() => {
    const positions: Array<{ x: number; z: number; side: number }> = [];
    for (let i = 0; i < 30; i++) {
      const z = -8 - i * 9;
      positions.push({ x: -14.5, z, side: -1 });
      positions.push({ x: 14.5, z, side: 1 });
    }
    return positions;
  }, []);

  const lampPoleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: C_METAL,
        roughness: 0.3,
        metalness: 0.95,
      }),
    [],
  );

  const lampHeadMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#e9e9ef"),
        emissive: C_MAGENTA,
        emissiveIntensity: 0.8,
        roughness: 0.15,
        metalness: 0.45,
      }),
    [],
  );

  const antennaPositions = useMemo(
    () =>
      BUILDING_DATA.filter((_, i) => sr(i * 7) > 0.6)
        .slice(0, 40)
        .map((b) => ({ x: b.x, y: b.height, z: b.z, height: 2 + sr(b.x) * 4 })),
    [],
  );

  const antennaMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: C_METAL,
        roughness: 0.4,
        metalness: 0.9,
      }),
    [],
  );

  // Antenna tip blink lights
  // useMemo → stable object for JSX; ref alias → mutable in useFrame
  const blinkLightRef = useRef<THREE.InstancedMesh>(null);
  const blinkLightMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: C_MAGENTA,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const blinkLightMatMutRef = useRef(blinkLightMat);

  const blinkDummy = useMemo(() => new THREE.Object3D(), []);
  const blinkInitialized = useRef(false);

  useFrame((state) => {
    if (!blinkLightRef.current) return;
    const mesh = blinkLightRef.current;

    if (!blinkInitialized.current) {
      antennaPositions.forEach((a, i) => {
        blinkDummy.position.set(a.x, a.y + a.height + 0.15, a.z);
        blinkDummy.scale.setScalar(0.12);
        blinkDummy.updateMatrix();
        mesh.setMatrixAt(i, blinkDummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      blinkInitialized.current = true;
    }

    const t = state.clock.getElapsedTime();
    blinkLightMatMutRef.current.opacity = Math.sin(t * 1.5) > 0.6 ? 0.9 : 0.05;
  });

  const boxMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0d0d20"),
        roughness: 0.4,
        metalness: 0.85,
        emissive: C_PURPLE,
        emissiveIntensity: 0.5,
      }),
    [],
  );

  return (
    <group>
      {lampPositions.map((lp, i) => (
        <group key={`lamp-${i}`} position={[lp.x, 0, lp.z]}>
          <mesh material={lampPoleMat} position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.06, 0.09, 5, 6]} />
          </mesh>
          <mesh
            material={lampPoleMat}
            position={[lp.side * -0.6, 5.1, 0]}
            rotation={[0, 0, lp.side * -0.3]}
          >
            <cylinderGeometry args={[0.04, 0.04, 1.2, 4]} />
          </mesh>
          <mesh material={lampHeadMat} position={[lp.side * -1.1, 5.0, 0]}>
            <boxGeometry args={[0.5, 0.18, 0.35]} />
          </mesh>
        </group>
      ))}

      {antennaPositions.map((a, i) => (
        <group key={`ant-${i}`} position={[a.x, a.y, a.z]}>
          <mesh material={antennaMat} position={[0, a.height / 2, 0]}>
            <cylinderGeometry args={[0.04, 0.07, a.height, 4]} />
          </mesh>
        </group>
      ))}

      <instancedMesh
        ref={blinkLightRef}
        args={[undefined, undefined, antennaPositions.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 6, 6]} />
        <primitive object={blinkLightMat} attach="material" />
      </instancedMesh>

      {Array.from({ length: 20 }, (_, i) => {
        const z = -15 - i * 12;
        const side = i % 2 === 0 ? -1 : 1;
        return (
          <mesh
            key={`box-${i}`}
            material={boxMat}
            position={[side * 15.5, 0.4, z]}
          >
            <boxGeometry args={[0.7, 0.8, 0.5]} />
          </mesh>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SkyBridges
// ═══════════════════════════════════════════════════════════════════════════════
function SkyBridges() {
  const bridgeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: C_METAL,
        roughness: 0.22,
        metalness: 0.9,
        emissive: C_MAGENTA,
        emissiveIntensity: 0.08,
      }),
    [],
  );

  const glassBridgeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: C_GLASS,
        roughness: 0.05,
        metalness: 0.8,
        opacity: 0.4,
        transparent: true,
      }),
    [],
  );

  const bridges = [
    { z: -70, y: 18, lx: -22, rx: 22 },
    { z: -110, y: 25, lx: -25, rx: 24 },
    { z: -155, y: 16, lx: -20, rx: 21 },
    { z: -200, y: 30, lx: -28, rx: 26 },
    { z: -245, y: 22, lx: -22, rx: 23 },
  ];

  return (
    <group>
      {bridges.map((b, i) => {
        const length = Math.abs(b.rx - b.lx);
        const cx = (b.lx + b.rx) / 2;
        return (
          <group key={i} position={[cx, b.y, b.z]}>
            <mesh material={bridgeMat}>
              <boxGeometry args={[length, 0.3, 2.5]} />
            </mesh>
            <mesh material={glassBridgeMat} position={[0, 1.0, 1.1]}>
              <boxGeometry args={[length, 2, 0.08]} />
            </mesh>
            <mesh material={glassBridgeMat} position={[0, 1.0, -1.1]}>
              <boxGeometry args={[length, 2, 0.08]} />
            </mesh>
            <mesh material={bridgeMat} position={[0, 2.1, 0]}>
              <boxGeometry args={[length, 0.2, 2.5]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CityCables
// ═══════════════════════════════════════════════════════════════════════════════
function CityCables() {
  const cableMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#1a1a2e"),
      }),
    [],
  );

  const cables = useMemo(() => {
    const specs = [
      { x1: -18, y1: 14, z: -50, x2: -28, y2: 10 },
      { x1: 20, y1: 18, z: -75, x2: 30, y2: 13 },
      { x1: -22, y1: 22, z: -100, x2: -30, y2: 16 },
      { x1: 24, y1: 16, z: -130, x2: 32, y2: 11 },
      { x1: -20, y1: 20, z: -170, x2: -26, y2: 14 },
      { x1: 22, y1: 24, z: -200, x2: 28, y2: 18 },
    ];
    return specs.map((s) => {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(s.x1, s.y1, s.z),
        new THREE.Vector3((s.x1 + s.x2) / 2, Math.min(s.y1, s.y2) - 2, s.z),
        new THREE.Vector3(s.x2, s.y2, s.z),
      );
      return new THREE.TubeGeometry(curve, 12, 0.04, 4, false);
    });
  }, []);

  return (
    <group>
      {cables.map((geo, i) => (
        <mesh key={i} geometry={geo} material={cableMat} />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CityParticles — slow ambient steam / dust
// ═══════════════════════════════════════════════════════════════════════════════
const PARTICLE_COUNT = 600;

function CityParticles({ enabled = true }: { enabled?: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempCol = useMemo(() => new THREE.Color(), []);

  const particleData = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const side = sr(i * 3) > 0.5 ? 1 : -1;
        return {
          x: (16 + sr(i * 2) * 16) * side,
          y: sr(i * 5) * 20,
          z: -10 - sr(i * 7) * 260,
          speed: 0.02 + sr(i * 11) * 0.06,
          size: 0.1 + sr(i * 13) * 0.25,
          phase: sr(i * 17) * Math.PI * 2,
          drift: (sr(i * 19) - 0.5) * 0.5,
          isCyan: sr(i * 23) > 0.85,
        };
      }),
    [],
  );

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        opacity: 1,
      }),
    [],
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const mesh = meshRef.current;

    // Toggle material opacity based on enabled flag so entire particle
    // system can be hidden in hero without unmounting (keeps stable refs).
    mat.opacity = enabled ? 1 : 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particleData[i];
      const y = (p.y + p.speed * t * 8) % 25;
      const xd = p.x + Math.sin(t * 0.3 + p.phase) * p.drift;

      dummy.position.set(xd, y, p.z);
      dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const fade = Math.min(1, y / 4) * Math.max(0, 1 - y / 22);
      if (p.isCyan) tempCol.copy(C_CYAN).multiplyScalar(fade * 0.3);
      else tempCol.set(0.9, 0.7, 0.95).multiplyScalar(fade * 0.15);
      mesh.setColorAt(i, tempCol);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, PARTICLE_COUNT]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <primitive object={mat} attach="material" />
    </instancedMesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CityAtmosphere — horizon glow + haze planes
// ═══════════════════════════════════════════════════════════════════════════════
function CityAtmosphere({ atmoMat }: { atmoMat: THREE.ShaderMaterial }) {
  const hazeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: C_MAGENTA,
        transparent: true,
        opacity: 0.015,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const purpleHazeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: C_PURPLE,
        transparent: true,
        opacity: 0.012,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );

  return (
    <group>
      <mesh material={atmoMat} position={[0, 8, -270]}>
        <planeGeometry args={[200, 30, 1, 1]} />
      </mesh>

      <mesh
        material={hazeMat}
        position={[-28, 15, -130]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[300, 40]} />
      </mesh>
      <mesh
        material={hazeMat}
        position={[28, 15, -130]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[300, 40]} />
      </mesh>

      <mesh
        material={purpleHazeMat}
        position={[0, 6, -150]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[80, 200]} />
      </mesh>

      <mesh position={[0, -0.1, -130]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 280]} />
        <meshBasicMaterial
          color={C_MAGENTA}
          transparent
          opacity={0.025}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CityLights — Three.js point lights
// ═══════════════════════════════════════════════════════════════════════════════
function CityLights() {
  return (
    <group>
      <pointLight
        color={C_MAGENTA}
        position={[-8, 12, -30]}
        intensity={1.2}
        distance={80}
        decay={1.5}
      />
      <pointLight
        color={C_PURPLE}
        position={[8, 10, -30]}
        intensity={0.9}
        distance={70}
        decay={1.5}
      />
      <pointLight
        color={C_MAGENTA}
        position={[-15, 20, -100]}
        intensity={1.1}
        distance={90}
        decay={1.5}
      />
      <pointLight
        color={C_PURPLE}
        position={[12, 18, -110]}
        intensity={0.8}
        distance={80}
        decay={1.5}
      />
      <pointLight
        color={C_PURPLE}
        position={[-12, 20, -165]}
        intensity={1.0}
        distance={90}
        decay={1.5}
      />
      <pointLight
        color={C_MAGENTA}
        position={[16, 18, -175]}
        intensity={1.2}
        distance={80}
        decay={1.5}
      />
      <pointLight
        color={C_PURPLE}
        position={[0, 25, -230]}
        intensity={1.4}
        distance={100}
        decay={1.5}
      />
      <pointLight
        color={C_PURPLE}
        position={[-20, 22, -250]}
        intensity={1.0}
        distance={90}
        decay={1.5}
      />
      <pointLight
        color={C_CYAN}
        position={[20, 22, -250]}
        intensity={0.8}
        distance={60}
        decay={1.5}
      />
      <pointLight
        color={C_MAGENTA}
        position={[0, 1, -20]}
        intensity={0.35}
        distance={30}
        decay={2}
      />
      <pointLight
        color={C_MAGENTA}
        position={[0, 1, -60]}
        intensity={0.35}
        distance={30}
        decay={2}
      />
      <pointLight
        color={C_MAGENTA}
        position={[0, 1, -100]}
        intensity={0.35}
        distance={30}
        decay={2}
      />
      <pointLight
        color={C_MAGENTA}
        position={[0, 1, -140]}
        intensity={0.35}
        distance={30}
        decay={2}
      />
      <pointLight
        color={C_MAGENTA}
        position={[0, 1, -180]}
        intensity={0.35}
        distance={30}
        decay={2}
      />
      <pointLight
        color={C_MAGENTA}
        position={[0, 1, -220]}
        intensity={0.35}
        distance={30}
        decay={2}
      />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CityEnvironment — root component
// ═══════════════════════════════════════════════════════════════════════════════
interface CityEnvironmentProps {
  scrollProgressRef: React.RefObject<number>;
  bgScrollRef?: React.RefObject<number>;
}

export default function CityEnvironment({
  scrollProgressRef,
  bgScrollRef,
}: CityEnvironmentProps) {
  // Create shader materials with useMemo — stable objects, safe to pass to JSX
  const roadMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ROAD_VERT,
        fragmentShader: ROAD_FRAG,
        uniforms: { uTime: { value: 0 }, uScroll: { value: 0 } },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  const atmoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );

  // Refs to the same objects so useFrame can mutate uniforms without React re-renders
  const roadMatRef = useRef(roadMat);
  const atmoMatRef = useRef(atmoMat);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const scroll = bgScrollRef?.current ?? scrollProgressRef.current ?? 0;
    roadMatRef.current.uniforms.uTime.value = t;
    roadMatRef.current.uniforms.uScroll.value = scroll;
    atmoMatRef.current.uniforms.uTime.value = t;
  });

  // Hide subtle background particles during hero (bgScroll small)
  const bgProgress = bgScrollRef?.current ?? scrollProgressRef.current ?? 0;
  const particlesEnabled = bgProgress > 0.17;

  return (
    <group>
      <CityLights />
      <CityAtmosphere atmoMat={atmoMat} />
      <CityRoad roadMat={roadMat} />
      <CityBuildings />
      <CityWindows />
      <CityLEDStrips />
      <CityBillboards />
      <CityProps />
      <SkyBridges />
      <CityCables />
      <CityParticles enabled={particlesEnabled} />
    </group>
  );
}
