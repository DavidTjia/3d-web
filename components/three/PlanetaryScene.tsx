'use client';

/**
 * PlanetaryScene — Procedural deep-space environment.
 * Renders a Mars-like rocky planet, a distant blue gas giant, alien terrain,
 * and scattered space boulders using Three.js standard materials and custom shaders.
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface PlanetarySceneProps {
  scrollProgressRef: React.RefObject<number>;
}

// ─── Procedural terrain height function ─────────────────────────────────
function terrainH(x: number, z: number): number {
  return (
    Math.sin(x * 0.38) * 0.85 +
    Math.sin(x * 0.87 + z * 0.31) * 0.48 +
    Math.sin(x * 1.93 - z * 0.52) * 0.25 +
    Math.sin(x * 4.15 + z * 1.18) * 0.12 +
    Math.sin(x * 8.3  - z * 2.14) * 0.05
  );
}

// ─── Planet Vertex Shader ────────────────────────────────────────────────
const PLANET_VERT = `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv     = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// ─── Planet Fragment Shader — dark Mars-like rocky world ─────────────────
const PLANET_FRAG = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = smoothstep(0.0, 1.0, fract(p));
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p  = p * 2.1 + vec2(7.3, 1.9);
      a *= 0.48;
    }
    return v;
  }

  void main() {
    // Surface texture layers
    float n1 = fbm(vUv * vec2(6.0, 3.0));
    float n2 = fbm(vUv * vec2(12.0, 8.0) + vec2(3.5, 0.8));
    float n3 = noise(vUv * 64.0);            // fine surface grit
    float craters = noise(vUv * 16.0 + vec2(2.1, 3.4));

    // Realistic Mars / rocky alien palette (deep rich rust tones)
    vec3 deepBasalt = vec3(0.14, 0.09, 0.07);   // dark basalt base
    vec3 rustRed    = vec3(0.42, 0.22, 0.14);   // rich iron oxide rust
    vec3 midOchre   = vec3(0.55, 0.35, 0.22);   // sand ochre highlight
    vec3 dustGrey   = vec3(0.28, 0.24, 0.23);   // dusty grey plains

    vec3 col = mix(deepBasalt, rustRed, n1 * 0.9);
    col = mix(col, midOchre, n2 * 0.45);
    col = mix(col, dustGrey, n3 * 0.2);

    // Crater depressions (shaded edges)
    col *= (0.85 + craters * 0.15);

    // Dynamic directional lighting — light from upper-left
    vec3 sunDir = normalize(vec3(-0.5, 0.6, 0.6));
    float diff  = max(0.0, dot(vNormal, sunDir));
    float amb   = 0.15; // slightly higher ambient for visibility
    col *= (amb + diff * 0.85);

    // Night-side terminator line
    if (diff < 0.0) col *= max(0.06, 1.0 + diff * 2.0);

    // Atmosphere rim glow — warm amber-red dust scattering
    vec3 viewDir = normalize(vViewPosition);
    float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
    rim = pow(rim, 4.0);
    col += vec3(0.65, 0.25, 0.08) * rim * 0.42;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Saturn Fragment Shader — golden banded gas giant ────────────────
const SATURN_FRAG = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(73.1, 191.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = smoothstep(0.0, 1.0, fract(p));
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.1 + vec2(3.1, 1.7); a *= 0.5; }
    return v;
  }

  void main() {
    // Horizontal band pattern
    float bandFreq = 14.0;
    float band = fbm(vec2(vUv.y * bandFreq + uTime * 0.015, vUv.x * 2.0));
    float band2 = fbm(vec2(vUv.y * bandFreq * 0.5 - 1.3, vUv.x * 3.0 + 0.5));

    // Saturn color palette — golden, tan, cream
    vec3 deepGold  = vec3(0.38, 0.28, 0.12);
    vec3 midTan    = vec3(0.65, 0.52, 0.30);
    vec3 paleYellow= vec3(0.82, 0.72, 0.50);
    vec3 darkBrown = vec3(0.22, 0.15, 0.07);

    vec3 col = mix(deepGold, midTan, band);
    col = mix(col, paleYellow, band2 * 0.5);
    col = mix(col, darkBrown, smoothstep(0.55, 0.65, band) * 0.4);

    // Lighting
    vec3 sunDir = normalize(vec3(-0.4, 0.7, 0.5));
    float diff = max(0.0, dot(vNormal, sunDir));
    float amb  = 0.12;
    col *= (amb + diff * 0.88);

    // Atmospheric rim glow — warm gold haze
    vec3 viewDir = normalize(vViewPosition);
    float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
    rim = pow(rim, 3.5);
    col += vec3(0.80, 0.60, 0.20) * rim * 0.35;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Small Rocky Planet Shader ──────────────────────────────────────────
const ROCKY_FRAG = `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(53.1, 91.7))) * 43758.5); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = smoothstep(0.0, 1.0, fract(p));
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.2 + vec2(5.1, 2.3); a *= 0.5; }
    return v;
  }

  void main() {
    float n1 = fbm(vUv * 8.0);
    float n2 = noise(vUv * 32.0);

    vec3 dark = vec3(0.10, 0.12, 0.18);
    vec3 mid  = vec3(0.22, 0.28, 0.38);
    vec3 high = vec3(0.38, 0.42, 0.52);

    vec3 col = mix(dark, mid, n1);
    col = mix(col, high, n2 * 0.3);

    vec3 sunDir = normalize(vec3(-0.5, 0.6, 0.6));
    float diff = max(0.0, dot(vNormal, sunDir));
    col *= (0.1 + diff * 0.9);

    vec3 viewDir = normalize(vViewPosition);
    float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
    col += vec3(0.30, 0.50, 0.80) * pow(rim, 4.0) * 0.40;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Blue Gas Giant Shader ──────────────────────────────────────────────
const BLUE_PLANET_FRAG = `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(93.1, 151.7))) * 23758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = smoothstep(0.0, 1.0, fract(p));
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p  = p * 2.2 + vec2(1.7, 4.3);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float n1 = fbm(vUv * vec2(8.0, 4.0));
    float n2 = fbm(vUv * vec2(15.0, 7.0));

    vec3 deepNavy  = vec3(0.04, 0.08, 0.20);
    vec3 brightCyan = vec3(0.12, 0.38, 0.58);
    vec3 paleBlue   = vec3(0.35, 0.55, 0.72);

    vec3 col = mix(deepNavy, brightCyan, n1 * 0.85);
    col = mix(col, paleBlue, n2 * 0.4);

    vec3 sunDir = normalize(vec3(-0.5, 0.6, 0.6));
    float diff  = max(0.0, dot(vNormal, sunDir));
    col *= (0.12 + diff * 0.88);

    vec3 viewDir = normalize(vViewPosition);
    float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
    rim = pow(rim, 3.5);
    col += vec3(0.20, 0.50, 0.85) * rim * 0.50;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function PlanetaryScene({ scrollProgressRef }: PlanetarySceneProps) {
  // Saturn (main large planet)
  const saturnRef       = useRef<THREE.Group>(null);
  const saturnBodyRef   = useRef<THREE.Mesh>(null);
  // Blue gas giant
  const bluePlanetRef   = useRef<THREE.Mesh>(null);
  // Small rocky planet
  const rockyRef        = useRef<THREE.Mesh>(null);
  const terrainGrpRef   = useRef<THREE.Group>(null);

  // ── Shader materials ──────────────────────────────────────────────────
  const saturnMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   PLANET_VERT,
    fragmentShader: SATURN_FRAG,
    uniforms: { uTime: { value: 0 } },
  }), []);

  const bluePlanetMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   PLANET_VERT,
    fragmentShader: BLUE_PLANET_FRAG,
  }), []);

  const rockyMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   PLANET_VERT,
    fragmentShader: ROCKY_FRAG,
  }), []);

  // ── Saturn ring material — procedural golden bands ───────────────────
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.72, 0.58, 0.30),
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }), []);

  const ringOuterMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.55, 0.42, 0.18),
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }), []);

  const ringInnerMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.85, 0.72, 0.45),
    transparent: true,
    opacity: 0.20,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }), []);

  // ── Terrain geometry — procedural displacement ───────────────────────
  const terrainGeo = useMemo(() => {
    const W_SEGS = 260, D_SEGS = 24;
    const geo = new THREE.PlaneGeometry(36, 7, W_SEGS, D_SEGS);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainH(x, z));
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // ── Terrain material ─────────────────────────────────────────────────
  const terrainMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:            new THREE.Color(0.26, 0.23, 0.28),
    roughness:        0.90,
    metalness:        0.05,
    emissive:         new THREE.Color(0.02, 0.03, 0.06),
    emissiveIntensity:1.0,
  }), []);

  // ── Scattered boulder positions ──────────────────────────────────────
  const rocks = useMemo(() => Array.from({ length: 28 }, (_, i) => {
    const s = i * 137.508;
    const x  = (Math.sin(s * 0.13) * 0.5 + 0.5) * 34 - 17;
    const z  = (Math.sin(s * 0.27) * 0.5 + 0.5) * 5 - 2;
    const h  = terrainH(x, z);
    const sc = 0.28 + (Math.sin(s * 0.67) * 0.5 + 0.5) * 1.05;
    return { x, y: h + sc * 0.28, z, sc,
      rx: Math.sin(s * 0.41) * Math.PI,
      ry: Math.sin(s * 0.37) * Math.PI };
  }), []);

  // ── Edge boulder coordinates ─────────────────────────────────────────
  const ridgeRocks = useMemo(() =>
    [-14, -11.5, -9.5, -8, 8, 9.5, 11.5, 14].map((xPos, i) => ({
      xPos, sc: 1.0 + Math.sin(i * 1.73) * 0.5,
      yOff: Math.sin(i * 1.41) * 0.4,
      ry: i * 0.72,
    }))
  , []);

  // ── Boulder material ─────────────────────────────────────────────────
  const rockMat = useMemo(() => new THREE.MeshStandardMaterial({
    color:            new THREE.Color(0.28, 0.25, 0.30),
    roughness:        0.88,
    metalness:        0.06,
    emissive:         new THREE.Color(0.015, 0.02, 0.05),
    emissiveIntensity:1.0,
  }), []);

  // ── Procedural Nebula Texture ─────────────────────────────────────────
  const nebulaTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0,    'rgba(255, 255, 255, 1.0)');
      gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(0.4,  'rgba(255, 255, 255, 0.4)');
      gradient.addColorStop(0.7,  'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1,    'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }, []);

  // ── Nebula billboard positions ────────────────────────────────────────
  const nebulae = useMemo(() => [
    { pos: [-6.5,  2.0, -13] as [number,number,number], w: 24, h: 15, rot: 0.20, col: new THREE.Color(0.12, 0.05, 0.24), op: 0.24 },
    { pos: [ 5.5, -1.0, -10] as [number,number,number], w: 18, h: 12, rot:-0.15, col: new THREE.Color(0.05, 0.08, 0.30), op: 0.16 },
    { pos: [-1.0,  3.5, -17] as [number,number,number], w: 30, h: 18, rot: 0.10, col: new THREE.Color(0.10, 0.04, 0.20), op: 0.14 },
  ], []);

  useFrame((state) => {
    const time   = state.clock.getElapsedTime();
    const scroll = scrollProgressRef.current ?? 0;

    if (saturnBodyRef.current) {
      const mat = saturnBodyRef.current.material as THREE.ShaderMaterial;
      if (mat && mat.uniforms) {
        mat.uniforms.uTime.value = time;
      }
    }

    // Saturn group (body + rings rotate together)
    if (saturnRef.current) {
      saturnRef.current.rotation.y = time * 0.006;
      saturnRef.current.position.y = 1.2 - scroll * 0.25;
    }

    if (bluePlanetRef.current) {
      bluePlanetRef.current.rotation.y = -time * 0.005;
      bluePlanetRef.current.position.y = 3.2 - scroll * 0.18;
    }

    if (rockyRef.current) {
      rockyRef.current.rotation.y = time * 0.009;
      rockyRef.current.position.y = 2.8 - scroll * 0.22;
    }

    // Terrain parallax
    if (terrainGrpRef.current) {
      terrainGrpRef.current.position.y = -scroll * 0.4;
    }
  });

  return (
    <group>
      {/* ── Planet 1: Saturn — large, ringed gas giant ──────────────── */}
      {/* Saturn tilted group so rings are angled naturally */}
      <group ref={saturnRef} position={[3.5, 1.2, -12]} rotation={[0, 0, 0.44]}>
        {/* Body */}
        <mesh ref={saturnBodyRef}>
          <sphereGeometry args={[4.8, 96, 96]} />
          <primitive object={saturnMat} attach="material" />
        </mesh>

        {/* Atmosphere rim glow */}
        <mesh>
          <sphereGeometry args={[5.1, 32, 32]} />
          <meshBasicMaterial
            color={new THREE.Color(0.80, 0.62, 0.22)}
            transparent opacity={0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Ring system — 3 flat tori stacked, slightly angled */}
        <group rotation={[Math.PI / 2, 0, 0]}>
          {/* Inner faint ring */}
          <mesh material={ringInnerMat}>
            <ringGeometry args={[5.4, 6.2, 128]} />
          </mesh>
          {/* Main bright ring */}
          <mesh material={ringMat}>
            <ringGeometry args={[6.2, 8.5, 128]} />
          </mesh>
          {/* Outer faint ring */}
          <mesh material={ringOuterMat}>
            <ringGeometry args={[8.5, 10.0, 128]} />
          </mesh>
        </group>
      </group>

      {/* ── Planet 2: Blue gas giant — distant upper-left ────────── */}
      <mesh ref={bluePlanetRef} position={[-7.0, 3.2, -18]}>
        <sphereGeometry args={[2.5, 64, 64]} />
        <primitive object={bluePlanetMat} attach="material" />
      </mesh>
      {/* Blue planet halo */}
      <mesh position={[-7.0, 3.2, -18]}>
        <sphereGeometry args={[2.75, 24, 24]} />
        <meshBasicMaterial
          color={new THREE.Color(0.15, 0.45, 0.85)}
          transparent opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ── Planet 3: Small rocky planet — distant right ──────────── */}
      <mesh ref={rockyRef} position={[8.0, 2.8, -20]}>
        <sphereGeometry args={[1.8, 64, 64]} />
        <primitive object={rockyMat} attach="material" />
      </mesh>
      {/* Rocky planet halo */}
      <mesh position={[8.0, 2.8, -20]}>
        <sphereGeometry args={[2.0, 20, 20]} />
        <meshBasicMaterial
          color={new THREE.Color(0.35, 0.45, 0.75)}
          transparent opacity={0.10}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ── Nebula haze billboards ──────────────────────────────── */}
      {nebulae.map((n, i) => (
        <mesh key={i} position={n.pos} rotation={[0, n.rot, 0]}>
          <planeGeometry args={[n.w, n.h]} />
          <meshBasicMaterial
            color={n.col}
            transparent
            opacity={n.op}
            map={nebulaTexture || undefined}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* ── Terrain group ──────────────────────────────────────── */}
      <group ref={terrainGrpRef}>

        {/* Main terrain surface */}
        <mesh
          geometry={terrainGeo}
          material={terrainMat}
          position={[0, -5.5, -1.5]}
          rotation={[-Math.PI / 2, 0, 0]}
        />

        {/* Scatter rocks / boulders on terrain */}
        {rocks.map((r, i) => (
          <mesh key={i} position={[r.x, r.y - 5.5, r.z - 1.5]}
            rotation={[r.rx, r.ry, 0]} material={rockMat}>
            <icosahedronGeometry args={[r.sc, 2]} />
          </mesh>
        ))}

        {/* Large ridge rocks along the edges */}
        {ridgeRocks.map((r, i) => (
          <mesh key={`r${i}`}
            position={[r.xPos, -4.6 + r.yOff, -0.8]}
            rotation={[0.15, r.ry, 0.05]}
            material={rockMat}
          >
            <icosahedronGeometry args={[r.sc, 2]} />
          </mesh>
        ))}

      </group>

      {/* ── Scene lighting ─────────────────────────────────────── */}
      {/* Cool blue key light from upper-left */}
      <directionalLight
        position={[-9, 8, 6]}
        intensity={0.7}
        color={new THREE.Color(0.50, 0.60, 1.0)}
      />
      {/* Warm golden-amber rim light matching Saturn */}
      <directionalLight
        position={[9, 4, -4]}
        intensity={0.4}
        color={new THREE.Color(0.85, 0.65, 0.22)}
      />
    </group>
  );
}

