"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Pre-load the GLB so it's ready when the component mounts
useGLTF.preload("/models/vr-headset.glb");

// ─── Material factory ────────────────────────────────────────────────────────

/** Matte dark gray premium plastic — used for the outer shell */
function makeBodyMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#181b1f"),
    roughness: 0.58,
    metalness: 0.08,
    clearcoat: 0.08,
    clearcoatRoughness: 0.78,
    envMapIntensity: 1.1,
    reflectivity: 0.06,
  });
}

/** Smoked black glass front panel */
function makeVisorMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#090a0d"),
    roughness: 0.16,
    metalness: 0.0,
    transmission: 0.66,
    thickness: 0.28,
    ior: 1.6,
    clearcoat: 0.22,
    clearcoatRoughness: 0.24,
    reflectivity: 0.14,
    envMapIntensity: 1.05,
    transparent: true,
    opacity: 0.92,
    side: THREE.FrontSide,
  });
}

/** Subtle internal optics behind the glass */
function makeLensMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#0b0c10"),
    roughness: 0.24,
    metalness: 0.04,
    transmission: 0.52,
    thickness: 0.18,
    ior: 1.5,
    clearcoat: 0.12,
    clearcoatRoughness: 0.32,
    reflectivity: 0.1,
    envMapIntensity: 0.85,
    transparent: true,
    opacity: 0.9,
  });
}

/** Soft matte leather face cushion */
function makeCushionMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0a0b0d"),
    roughness: 0.92,
    metalness: 0.03,
    envMapIntensity: 0.05,
    emissive: new THREE.Color("#040506"),
    emissiveIntensity: 0.02,
  });
}

/** Dark woven head strap */
function makeStrapMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#111214"),
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0.22,
  });
}

/** Satin black polymer for adjustment pieces */
function makeAdjustmentMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#08090b"),
    roughness: 0.42,
    metalness: 0.18,
    clearcoat: 0.08,
    clearcoatRoughness: 0.7,
    envMapIntensity: 0.85,
    reflectivity: 0.08,
  });
}

/** Brushed aluminum for small screws */
function makeScrewMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#3c4046"),
    roughness: 0.34,
    metalness: 0.74,
    envMapIntensity: 0.9,
  });
}

/** Very subtle status LED accent */
function makeLEDMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#22d3ee"),
    emissive: new THREE.Color("#22d3ee"),
    emissiveIntensity: 0.7,
    roughness: 0.18,
    metalness: 0.3,
  });
}

// ─── Mesh classification ─────────────────────────────────────────────────────

type MatType =
  | "visor"
  | "lens"
  | "cushion"
  | "strap"
  | "adjustment"
  | "screw"
  | "led"
  | "body";

function classifyMesh(name: string): MatType {
  const n = name.toLowerCase();
  if (/visor|glass|screen|display|window/.test(n)) return "visor";
  if (/lens|optic|lensring|internal|eye|pupil/.test(n)) return "lens";
  if (/cushion|foam|padding|face|seal|leather|fabric/.test(n)) return "cushion";
  if (/strap|band|headband|elastic|woven/.test(n)) return "strap";
  if (
    /adjust|hinge|clip|buckle|slider|mount|bracket|connector|pivot|lock|joint/.test(
      n,
    )
  )
    return "adjustment";
  if (/screw|bolt|fastener/.test(n)) return "screw";
  if (/led|light|glow|strip|indicator|status/.test(n)) return "led";
  return "body"; // default — main housing
}

// ─── Component ───────────────────────────────────────────────────────────────

interface VRHeadsetProps {
  scrollProgressRef: React.RefObject<number>;
}

export default function VRHeadset({ scrollProgressRef }: VRHeadsetProps) {
  const { size } = useThree();
  const isMobile = size.width < 1024;
  const { scene } = useGLTF("/models/vr-headset.glb");
  if (scrollProgressRef) { /* no-op for linter */ }

  const groupRef = useRef<THREE.Group>(null);
  const fadeState = useRef({ opacity: 0 });
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const targetRot = useRef({ x: -0.15, y: 0.5 });
  const currentRot = useRef({ x: -0.15, y: 0.5 });

  // ── Apply materials to all meshes in the GLB ─────────────────────────────
  useEffect(() => {
    const matCache: Partial<Record<MatType, THREE.Material>> = {};

    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      const type = classifyMesh(mesh.name);

      // Reuse the same material instance for the same type (performance)
      if (!matCache[type]) {
        switch (type) {
          case "visor":
            matCache[type] = makeVisorMaterial();
            break;
          case "lens":
            matCache[type] = makeLensMaterial();
            break;
          case "cushion":
            matCache[type] = makeCushionMaterial();
            break;
          case "strap":
            matCache[type] = makeStrapMaterial();
            break;
          case "adjustment":
            matCache[type] = makeAdjustmentMaterial();
            break;
          case "screw":
            matCache[type] = makeScrewMaterial();
            break;
          case "led":
            matCache[type] = makeLEDMaterial();
            break;
          default:
            matCache[type] = makeBodyMaterial();
        }
      }

      mesh.material = matCache[type]!;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Ensure normals are up to date for lighting
      if (mesh.geometry) {
        mesh.geometry.computeVertexNormals();
      }
    });

    // Make all materials transparent so GSAP fade-in works
    Object.values(matCache).forEach((m) => {
      if (m) m.transparent = true;
    });

    return () => {
      // Dispose materials on unmount
      Object.values(matCache).forEach((m) => m?.dispose());
    };
  }, [scene]);

  // ── Scroll fade-in ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      gsap.set(fadeState.current, { opacity: 0 });
      gsap.to(fadeState.current, {
        opacity: 1,
        duration: 1.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "#vr-section",
          start: "top 85%",
          end: "bottom 30%",
          toggleActions: "play reverse play reverse",
          invalidateOnRefresh: true,
        },
      });
      ScrollTrigger.refresh();
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  // ── Frame loop ───────────────────────────────────────────────────────────
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const opacity = fadeState.current.opacity;

    // Auto slow-spin when idle
    if (!isDragging.current) targetRot.current.y += 0.0025;

    // Smooth rotation lerp — headset stays centred, only the model rotates
    currentRot.current.x = THREE.MathUtils.lerp(
      currentRot.current.x,
      targetRot.current.x,
      0.08,
    );
    currentRot.current.y = THREE.MathUtils.lerp(
      currentRot.current.y,
      targetRot.current.y,
      0.08,
    );
    groupRef.current.rotation.x = currentRot.current.x;
    groupRef.current.rotation.y = currentRot.current.y;

    // Floating breath
    groupRef.current.position.y = Math.sin(t * 0.38) * 0.06;

    // Fade all meshes
    groupRef.current.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        mat.opacity = opacity;
      });
    });
  });

  return (
    <>
      {/* ── Lighting ──────────────────────────────────────────────────── */}
      {/* Key light — top-left-front */}
      <directionalLight
        position={[-4, 6, 6]}
        intensity={3.8}
        color="#c8d8ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.001}
      />
      {/* Soft hemispheric fill to prevent deep blacks on occluded faces */}
      <hemisphereLight
  args={["#e6f1ff", "#3b2b3f", 0.45]}
/>
      {/* Extra soft front fill to reveal details */}
      <directionalLight
        position={[2.4, 2.2, 4]}
        intensity={1.6}
        color="#f0f8ff"
      />
      {/* Fill light — bottom right */}
      <directionalLight position={[5, -3, 4]} intensity={1.5} color="#9955ff" />
      {/* Rim light — behind (creates visible edge on dark body) */}
      <pointLight
        position={[-3, 1, -6]}
        intensity={6}
        color="#0055ff"
        distance={18}
      />
      <pointLight
        position={[3, 0, -5]}
        intensity={4}
        color="#8800ee"
        distance={18}
      />
      {/* Soft ambient */}
      <ambientLight intensity={0.18} color="#aabbdd" />

      {/* HDR environment for realistic reflections on glass/metal */}
      <Environment
        preset="city"
        environmentIntensity={1.2}
        backgroundBlurriness={1}
      />

      {/* Shadow catcher plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.2, 0]}
        receiveShadow
      >
        <planeGeometry args={[12, 12]} />
        <shadowMaterial opacity={0.18} />
      </mesh>

      {/* ── Invisible drag-capture plane (R3F events, no DOM mutation) ── */}
      <mesh
        position={isMobile ? [0, 1.1, 2.5] : [0, 0, 2.5]}
        onPointerDown={(e) => {
          isDragging.current = true;
          prevMouse.current = { x: e.clientX, y: e.clientY };
          e.stopPropagation();
        }}
        onPointerMove={(e) => {
          if (!isDragging.current) return;
          const dx = e.clientX - prevMouse.current.x;
          const dy = e.clientY - prevMouse.current.y;
          targetRot.current.y += dx * 0.012;
          targetRot.current.x += dy * 0.008;
          targetRot.current.x = Math.max(
            -Math.PI * 0.5,
            Math.min(Math.PI * 0.5, targetRot.current.x),
          );
          prevMouse.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => {
          isDragging.current = false;
        }}
        onPointerLeave={() => {
          isDragging.current = false;
        }}
      >
        <planeGeometry args={[9, 7]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* ── GLB Model ── */}
      <group
        ref={groupRef}
        position={isMobile ? [0, 1.1, 0] : [0, 0, 0]}
        scale={isMobile ? [0.65, 0.65, 0.65] : [0.95, 0.95, 0.95]}
      >
        <primitive object={scene} />
      </group>
    </>
  );
}
