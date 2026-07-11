'use client';

/**
 * CinematicGalaxy — Standalone Three.js canvas for the loading screen.
 * No text. Pure galaxy visuals only.
 *
 * Fixes applied:
 *  - Galaxy MAX_RADIUS = 7.0 so it fills ~80% of screen (camera z=12, fov=60)
 *  - Galaxy is a flat disk (z * 0.08) tilted ~25° for 3/4 Milky Way view
 *  - Color: warm white core → soft pink → blue-white arms → outer cool blue
 *  - Singularity sphere is tiny (r=0.04) only in collapse/flash/explode
 *  - 2 arm inner disk + 4 arm outer spiral for realistic galaxy density
 */

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { LoadingPhase } from '@/hooks/useLoadingSequence';

// ─── Config ─────────────────────────────────────────────────────────────────
const GALAXY_PARTICLE_COUNT = 80000;
const EXPLOSION_PARTICLE_COUNT = 8000;
const BG_STAR_COUNT = 3000;

// The galaxy spans MAX_RADIUS world units when fully grown.
// At camera z=12, fov=60 → half-height at z=0 ≈ 6.9 units.
// MAX_RADIUS=7 fills ~100% viewport width in the disk plane.
const MAX_RADIUS = 7.0;

// ─── Deterministic pseudo-random ────────────────────────────────────────────
function sr(seed: number) {
  const x = Math.sin(seed + 1) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Galaxy Vertex Shader ────────────────────────────────────────────────────
const GALAXY_VERT = /* glsl */ `
  attribute float aRadius;    // 0–1, normalized
  attribute float aAngle;     // base polar angle (radians)
  attribute float aDepth;     // disk thickness offset (−1…1)
  attribute float aSize;      // base point size
  attribute float aPhase;     // noise / breathing phase
  attribute float aSpeedFactor; // differential rotation speed

  uniform float uTime;
  uniform float uScale;       // 0→1, galaxy growth (0=tiny, 1=full size)
  uniform float uCollapse;    // 0→1, pulls everything to center
  uniform float uAlpha;       // master opacity

  varying float vRadius;
  varying float vAlpha;

  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float vnoise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f*f*(3.0-2.0*f);
    return mix(hash(i), hash(i+1.0), u);
  }

  void main() {
    // Differential rotation: inner arms spin faster (Milky Way-like)
    float angularVel = uTime * aSpeedFactor * (0.18 + (1.0 - aRadius) * 0.22);
    float a = aAngle + angularVel;

    // World-space radius scaled by galaxy growth
    float r = aRadius * uScale * ${MAX_RADIUS.toFixed(1)};

    // Organic turbulence: more visible in outer arms
    float tScale = r * 0.08;
    float tx = (vnoise(aRadius * 4.1 + uTime * 0.25 + aPhase) - 0.5) * 2.0 * tScale;
    float ty = (vnoise(aRadius * 3.3 - uTime * 0.2  + aPhase * 1.7) - 0.5) * 2.0 * tScale;

    // Breathing pulse
    float breathe = sin(uTime * 1.1 + aPhase) * 0.012 * r;

    // Disk: X/Y are spiral plane, Z is thin disk thickness
    float diskZ = aDepth * 0.08 * r;  // galaxy is flat

    vec3 pos = vec3(
      cos(a) * (r + breathe) + tx,
      sin(a) * (r + breathe) + ty,
      diskZ + sin(uTime * 0.5 + aPhase) * 0.04 * uScale
    );

    // Collapse: lerp toward singularity at origin (accelerating with uCollapse^2)
    pos = mix(pos, vec3(0.0), uCollapse * uCollapse);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // Point size: bright large core, medium arms, tiny outer edge
    // Core glow boost: particles inside r<0.25 get a size bonus
    float coreBoost = max(0.0, 1.0 - aRadius * 4.0); // 0→1 only near core
    float baseSize = aSize * (0.5 + uScale * 0.5);
    baseSize += coreBoost * 4.0;
    gl_PointSize = baseSize * (200.0 / -mv.z);

    vRadius = aRadius;

    // Brightness: core is brightest, edge dims
    float edgeFade = 1.0 - smoothstep(0.6, 1.0, aRadius) * 0.5;
    // Birth fade: particles reveal progressively from center
    float birthFade = smoothstep(0.0, aRadius + 0.01, uScale);
    vAlpha = edgeFade * birthFade * uAlpha;
  }
`;

// ─── Galaxy Fragment Shader ──────────────────────────────────────────────────
// Colors matching the reference image: Milky Way-style
//   core:       warm white / yellow-white (hot dense star cluster)
//   inner disk: warm white → soft pink
//   arms:       blue-white (young hot stars in spiral arms)
//   outer edge: cooler blue / blue-grey
const GALAXY_FRAG = /* glsl */ `
  varying float vRadius;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;

    // Soft-edged circular particle
    float soft = 1.0 - smoothstep(0.05, 0.5, dist);
    float alpha = soft * vAlpha;

    // Galaxy colour gradient (matching reference Milky Way image)
    // 0.00–0.10: bright warm white core (yellow-white)
    // 0.10–0.30: warm white → soft pink (inner bulge)
    // 0.30–0.65: pink → icy blue-white (spiral arms)
    // 0.65–1.00: blue-white → cool blue outer edge
    vec3 col = vec3(1.00, 0.98, 0.92);                                                     // warm white core
    col = mix(col, vec3(1.00, 0.90, 0.85), smoothstep(0.0,  0.12, vRadius));              // → pinkish white
    col = mix(col, vec3(0.90, 0.82, 0.95), smoothstep(0.12, 0.32, vRadius));              // → soft lavender
    col = mix(col, vec3(0.75, 0.88, 1.00), smoothstep(0.32, 0.60, vRadius));              // → ice blue-white
    col = mix(col, vec3(0.50, 0.72, 1.00), smoothstep(0.60, 0.82, vRadius));              // → bright blue
    col = mix(col, vec3(0.28, 0.48, 0.85), smoothstep(0.82, 1.00, vRadius));              // → cool outer blue

    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── Core glow shader (fake bloom at galaxy centre) ──────────────────────────
const CORE_VERT = /* glsl */ `
  uniform float uScale;
  uniform float uCollapse;
  void main() {
    float s = uScale * 0.9 + uCollapse * 0.1;
    vec3 pos = position * s;
    pos = mix(pos, vec3(0.0), uCollapse * uCollapse);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const CORE_FRAG = /* glsl */ `
  uniform float uScale;
  uniform float uAlpha;
  void main() {
    gl_FragColor = vec4(1.0, 0.95, 0.88, uAlpha * uScale * 0.55);
  }
`;

// ─── Explosion Vertex Shader ─────────────────────────────────────────────────
const EXPLODE_VERT = /* glsl */ `
  attribute vec3 aVelocity;
  attribute float aSize;
  uniform float uProgress;
  varying float vAlpha;
  void main() {
    vec3 pos = position + aVelocity * uProgress * 10.0;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float speed = length(aVelocity);
    gl_PointSize = aSize * (1.0 - uProgress * 0.75) * (200.0 / -mv.z);
    vAlpha = (1.0 - smoothstep(0.0, 0.9, uProgress)) * (0.5 + speed * 0.35);
  }
`;
const EXPLODE_FRAG = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float a = (1.0 - smoothstep(0.05, 0.5, d)) * vAlpha;
    vec3 col = mix(vec3(1.0,1.0,1.0), vec3(0.65,0.85,1.0), d * 2.0);
    gl_FragColor = vec4(col, a);
  }
`;

// ─── Background Stars ────────────────────────────────────────────────────────
const BG_VERT = /* glsl */ `
  attribute float aSize;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize;
  }
`;
const BG_FRAG = /* glsl */ `
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float a = 1.0 - smoothstep(0.1, 0.5, d);
    gl_FragColor = vec4(0.85, 0.90, 1.0, a * 0.45);
  }
`;

// ═══════════════════════════════════════════════════════════════════════════
// BackgroundStars — tiny distant dots behind the galaxy
// ═══════════════════════════════════════════════════════════════════════════
function BackgroundStars() {
  const geo = useMemo(() => {
    const pos  = new Float32Array(BG_STAR_COUNT * 3);
    const size = new Float32Array(BG_STAR_COUNT);
    for (let i = 0; i < BG_STAR_COUNT; i++) {
      pos[i*3]   = (sr(i*3)   - 0.5) * 60;
      pos[i*3+1] = (sr(i*3+1) - 0.5) * 50;
      pos[i*3+2] = -25 - sr(i*3+2) * 40;
      size[i] = 0.4 + sr(i*7) * 1.2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize',    new THREE.BufferAttribute(size, 1));
    return g;
  }, []);

  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: BG_VERT, fragmentShader: BG_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), []);

  return <points geometry={geo} material={mat} />;
}

// ═══════════════════════════════════════════════════════════════════════════
// GalaxyParticles
// ═══════════════════════════════════════════════════════════════════════════
interface PhaseRefContent {
  phase: LoadingPhase;
  progress: number;
  collapseProgress: number;
  explodeProgress: number;
}

interface GalaxyProps {
  phaseRef: React.MutableRefObject<PhaseRefContent>;
}

function GalaxyParticles({ phaseRef }: GalaxyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const N = GALAXY_PARTICLE_COUNT;
    const aRadius      = new Float32Array(N);
    const aAngle       = new Float32Array(N);
    const aDepth       = new Float32Array(N);
    const aSize        = new Float32Array(N);
    const aPhase       = new Float32Array(N);
    const aSpeedFactor = new Float32Array(N);
    // positions required by BufferGeometry (computed in shader via attributes)
    const positions    = new Float32Array(N * 3);

    const ARM_COUNT = 4; // 4-arm Milky Way style

    for (let i = 0; i < N; i++) {
      // Radial distribution: strong center concentration (like a real galaxy bulge)
      // 40% of particles in inner r<0.3 (bulge), rest in disk/arms
      const roll = sr(i * 3);
      let r: number;
      if (roll < 0.40) {
        // Dense core/bulge
        r = Math.pow(sr(i * 3 + 0.5), 1.8) * 0.35;
      } else {
        // Spiral arms — power distribution biased toward inner region
        r = 0.05 + Math.pow(sr(i * 3 + 1.3), 0.55) * 0.95;
      }
      aRadius[i] = Math.min(r, 1.0);

      const arm = Math.floor(sr(i * 11) * ARM_COUNT);
      // Spiral winding tightens toward edge; spread increases with radius
      const spread = 0.08 + aRadius[i] * 0.6;
      aAngle[i] = (arm / ARM_COUNT) * Math.PI * 2
                 + aRadius[i] * Math.PI * 5.0           // logarithmic spiral winding
                 + (sr(i * 7) - 0.5) * spread;           // arm spread

      // Flat disk + tiny bulge height variation
      const bulge = aRadius[i] < 0.3 ? (1 - aRadius[i] / 0.3) * 0.5 : 0;
      aDepth[i]       = (sr(i * 13) - 0.5) * (1.0 + bulge);

      // Core particles: larger and brighter
      const isCore = aRadius[i] < 0.08;
      aSize[i]        = isCore ? 2.5 + sr(i*5) * 3.0 : 0.8 + sr(i*5) * 2.2;
      aPhase[i]       = sr(i * 17) * Math.PI * 2;
      aSpeedFactor[i] = 0.6 + sr(i * 19) * 0.8;

      positions[i*3] = positions[i*3+1] = positions[i*3+2] = 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position',    new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aRadius',     new THREE.BufferAttribute(aRadius, 1));
    geo.setAttribute('aAngle',      new THREE.BufferAttribute(aAngle, 1));
    geo.setAttribute('aDepth',      new THREE.BufferAttribute(aDepth, 1));
    geo.setAttribute('aSize',       new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute('aPhase',      new THREE.BufferAttribute(aPhase, 1));
    geo.setAttribute('aSpeedFactor',new THREE.BufferAttribute(aSpeedFactor, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader:   GALAXY_VERT,
      fragmentShader: GALAXY_FRAG,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
      uniforms: {
        uTime:     { value: 0 },
        uScale:    { value: 0 },
        uCollapse: { value: 0 },
        uAlpha:    { value: 0 },
      },
    });

    return { geometry: geo, material: mat };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current || !groupRef.current) return;
    const mat = pointsRef.current.material as THREE.ShaderMaterial;
    const { phase, progress, collapseProgress } = phaseRef.current;
    const t = state.clock.getElapsedTime();

    mat.uniforms.uTime.value = t;

    // Tilt group to get the classic 3/4 Milky Way perspective
    // Slowly wobble the tilt for a cinematic feel
    groupRef.current.rotation.x = -0.42 + Math.sin(t * 0.08) * 0.04;
    groupRef.current.rotation.z = t * 0.012; // very slow precession

    if (phase === 'init') {
      mat.uniforms.uScale.value    = 0;
      mat.uniforms.uCollapse.value = 0;
      mat.uniforms.uAlpha.value    = 0;
    } else if (phase === 'birth') {
      mat.uniforms.uScale.value    = Math.max(0.001, progress * 0.05);
      mat.uniforms.uCollapse.value = 0;
      mat.uniforms.uAlpha.value    = Math.min(1, progress * 3);
    } else if (phase === 'grow') {
      // Galaxy grows from 5% → 100%
      mat.uniforms.uScale.value    = 0.05 + progress * 0.95;
      mat.uniforms.uCollapse.value = 0;
      mat.uniforms.uAlpha.value    = 1.0;
    } else if (phase === 'collapse') {
      mat.uniforms.uScale.value    = 1.0;
      mat.uniforms.uCollapse.value = collapseProgress;
      mat.uniforms.uAlpha.value    = 1.0 - collapseProgress * 0.15;
      // Speed up rotation during collapse
      groupRef.current.rotation.z = t * 0.012 + collapseProgress * t * 0.08;
    } else {
      mat.uniforms.uAlpha.value = 0;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CoreGlow — fake bloom layered glow at galaxy center
// ═══════════════════════════════════════════════════════════════════════════
function CoreGlow({ phaseRef }: GalaxyProps) {
  const refs = [
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
    useRef<THREE.Mesh>(null),
  ];

  // Layered spheres: tiny bright core, medium glow, wide diffuse halo
  const layers = useMemo(() => [
    { r: 0.12, col: '#ffffff', opacity: 0.95, blend: THREE.AdditiveBlending },
    { r: 0.45, col: '#ffd8b8', opacity: 0.35, blend: THREE.AdditiveBlending },
    { r: 1.20, col: '#d0a080', opacity: 0.10, blend: THREE.AdditiveBlending },
  ], []);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const { phase, progress, collapseProgress } = phaseRef.current;
    const t = state.clock.getElapsedTime();

    // Match galaxy tilt
    groupRef.current.rotation.x = -0.42;

    let scale = 0;
    let alpha = 0;

    if (phase === 'birth') {
      scale = progress * 0.05 * MAX_RADIUS;
      alpha = progress;
    } else if (phase === 'grow') {
      scale = (0.05 + progress * 0.95) * MAX_RADIUS;
      alpha = 1.0;
    } else if (phase === 'collapse') {
      scale = MAX_RADIUS * (1.0 - collapseProgress * 0.8);
      alpha = 1.0;
    }

    // Breathing pulse
    const pulse = 1 + Math.sin(t * 2.2) * 0.06;

    refs.forEach((ref) => {
      if (!ref.current) return;
      ref.current.scale.setScalar(scale * pulse);
      ref.current.visible = alpha > 0.01;
    });
  });

  return (
    <group ref={groupRef}>
      {layers.map((l, i) => (
        <mesh key={i} ref={refs[i]}>
          <sphereGeometry args={[l.r, 12, 12]} />
          <meshBasicMaterial
            color={l.col}
            transparent
            opacity={l.opacity}
            blending={l.blend}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FlashSingularity — tiny white dot that appears during collapse/flash
// ═══════════════════════════════════════════════════════════════════════════
function FlashSingularity({ phaseRef }: GalaxyProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current || !coreRef.current || !auraRef.current) return;
    const { phase, collapseProgress, explodeProgress } = phaseRef.current;

    if (phase === 'collapse') {
      // Singularity grows AS particles collapse toward it
      const s = collapseProgress * 0.04;     // tiny — 0.04 world units at full collapse
      coreRef.current.scale.setScalar(s);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = collapseProgress;
      auraRef.current.scale.setScalar(s * 8);
      (auraRef.current.material as THREE.MeshBasicMaterial).opacity = collapseProgress * 0.6;
      groupRef.current.visible = true;
    } else if (phase === 'flash') {
      // Super bright flash
      coreRef.current.scale.setScalar(0.08);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 1;
      auraRef.current.scale.setScalar(2.5);
      (auraRef.current.material as THREE.MeshBasicMaterial).opacity = 0.9;
      groupRef.current.visible = true;
    } else if (phase === 'explode') {
      // Shrink as explosion expands
      const s = Math.max(0, 0.08 - explodeProgress * 0.08);
      const ao = Math.max(0, 0.9 - explodeProgress * 1.1);
      coreRef.current.scale.setScalar(s);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = s / 0.08;
      auraRef.current.scale.setScalar(2.5 + explodeProgress * 10);
      (auraRef.current.material as THREE.MeshBasicMaterial).opacity = ao;
      groupRef.current.visible = ao > 0 || s > 0;
    } else {
      groupRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Bright core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} toneMapped={false} />
      </mesh>
      {/* Soft expanding aura */}
      <mesh ref={auraRef}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ExplosionBurst
// ═══════════════════════════════════════════════════════════════════════════
function ExplosionBurst({ phaseRef }: GalaxyProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const N = EXPLOSION_PARTICLE_COUNT;
    const positions  = new Float32Array(N * 3);
    const velocities = new Float32Array(N * 3);
    const sizes      = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      positions[i*3] = positions[i*3+1] = positions[i*3+2] = 0;
      const theta = sr(i*31) * Math.PI * 2;
      const phi   = Math.acos(2 * sr(i*37) - 1);
      const speed = 0.4 + sr(i*41) * 1.6;
      velocities[i*3]   = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i*3+1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i*3+2] = Math.cos(phi) * speed * 0.25;
      sizes[i] = 1.5 + sr(i*43) * 3.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position',  new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('aSize',     new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: EXPLODE_VERT, fragmentShader: EXPLODE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uProgress: { value: 0 } },
    });

    return { geometry: geo, material: mat };
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const mat = pointsRef.current.material as THREE.ShaderMaterial;
    const { phase, explodeProgress } = phaseRef.current;
    mat.uniforms.uProgress.value = (phase === 'explode' || phase === 'done') ? explodeProgress : 0;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}

// ═══════════════════════════════════════════════════════════════════════════
// Scene wrapper
// ═══════════════════════════════════════════════════════════════════════════
interface SceneProps {
  phase: LoadingPhase;
  progress: number;
  collapseProgress: number;
  explodeProgress: number;
}

function Scene({ phase, progress, collapseProgress, explodeProgress }: SceneProps) {
  const phaseRef = useRef<PhaseRefContent>({ phase, progress, collapseProgress, explodeProgress });

  useEffect(() => {
    phaseRef.current = { phase, progress, collapseProgress, explodeProgress };
  }, [phase, progress, collapseProgress, explodeProgress]);

  return (
    <>
      <BackgroundStars />
      <GalaxyParticles phaseRef={phaseRef} />
      <CoreGlow phaseRef={phaseRef} />
      <ExplosionBurst phaseRef={phaseRef} />
      <FlashSingularity phaseRef={phaseRef} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════════════════
interface CinematicGalaxyProps {
  phase: LoadingPhase;
  progress: number;
  collapseProgress: number;
  explodeProgress: number;
}

export default function CinematicGalaxy(props: CinematicGalaxyProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 60, near: 0.1, far: 300 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: false,
      }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={['#000000']} />
      <Scene {...props} />
    </Canvas>
  );
}
