"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Pre-load the GLB so it's ready when the component mounts
useGLTF.preload("/models/vr-headset.glb");

// ─── Material factory ────────────────────────────────────────────────────────

/** Matte black premium plastic — used for main body */
function makeBodyMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#121212"),
    roughness: 0.55,
    metalness: 0.05,
    envMapIntensity: 0.9,
  });
}

/** Glossy visor glass — blue-purple iridescent */
function makeVisorMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#0a0f2e"),
    roughness: 0.0,
    metalness: 0.0,
    transmission: 0.75,
    thickness: 0.4,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 1.0,
    iridescence: 1.0,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [100, 800],
    envMapIntensity: 3.0,
    transparent: true,
    opacity: 0.88,
    side: THREE.FrontSide,
  });
}

/** Dark fabric-like strap material */
function makeStrapMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1c1c1c"),
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.2,
  });
}

/** Metallic black buttons / accents */
function makeButtonMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0e0e0e"),
    roughness: 0.2,
    metalness: 0.85,
    envMapIntensity: 1.2,
  });
}

/** Glowing cyan LED accent */
function makeLEDMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#00ddff"),
    emissive: new THREE.Color("#00ddff"),
    emissiveIntensity: 2.5,
    roughness: 0.1,
    metalness: 0.8,
  });
}

// ─── Mesh classification ─────────────────────────────────────────────────────

type MatType = "visor" | "strap" | "button" | "led" | "body";

function classifyMesh(name: string): MatType {
  const n = name.toLowerCase();
  if (/visor|lens|glass|screen|display|window/.test(n)) return "visor";
  if (/strap|band|foam|padding|cushion|headband|elastic/.test(n)) return "strap";
  if (/button|btn|dial|knob|port|usb|switch|trigger/.test(n)) return "button";
  if (/led|light|glow|strip|accent|neon/.test(n)) return "led";
  return "body"; // default — main housing
}

// ─── Component ───────────────────────────────────────────────────────────────

interface VRHeadsetProps {
  scrollProgressRef: React.RefObject<number>;
}

export default function VRHeadset({ scrollProgressRef: _sp }: VRHeadsetProps) {
  const { scene } = useGLTF("/models/vr-headset.glb");

  const groupRef   = useRef<THREE.Group>(null);
  const fadeState  = useRef({ opacity: 0 });
  const isDragging = useRef(false);
  const prevMouse  = useRef({ x: 0, y: 0 });
  const targetRot  = useRef({ x: -0.15, y: 0.5 });
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
          case "visor":  matCache[type] = makeVisorMaterial();  break;
          case "strap":  matCache[type] = makeStrapMaterial();  break;
          case "button": matCache[type] = makeButtonMaterial(); break;
          case "led":    matCache[type] = makeLEDMaterial();    break;
          default:       matCache[type] = makeBodyMaterial();
        }
      }

      mesh.material = matCache[type]!;
      mesh.castShadow    = true;
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
    const t       = state.clock.elapsedTime;
    const opacity = fadeState.current.opacity;

    // Auto slow-spin when idle
    if (!isDragging.current) targetRot.current.y += 0.0025;

    // Smooth rotation lerp — headset stays centred, only the model rotates
    currentRot.current.x = THREE.MathUtils.lerp(currentRot.current.x, targetRot.current.x, 0.08);
    currentRot.current.y = THREE.MathUtils.lerp(currentRot.current.y, targetRot.current.y, 0.08);
    groupRef.current.rotation.x = currentRot.current.x;
    groupRef.current.rotation.y = currentRot.current.y;

    // Floating breath
    groupRef.current.position.y = Math.sin(t * 0.38) * 0.06;

    // Fade all meshes
    groupRef.current.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
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
        intensity={3.5}
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
      {/* Fill light — bottom right */}
      <directionalLight position={[5, -3, 4]}  intensity={1.5} color="#9955ff" />
      {/* Rim light — behind (creates visible edge on dark body) */}
      <pointLight position={[-3,  1, -6]} intensity={6}   color="#0055ff" distance={18} />
      <pointLight position={[ 3,  0, -5]} intensity={4}   color="#8800ee" distance={18} />
      {/* Soft ambient */}
      <ambientLight intensity={0.18} color="#aabbdd" />

      {/* HDR environment for realistic reflections on glass/metal */}
      <Environment
        preset="city"
        environmentIntensity={1.2}
        backgroundBlurriness={1}
      />

      {/* Shadow catcher plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <shadowMaterial opacity={0.18} />
      </mesh>

      {/* ── Invisible drag-capture plane (R3F events, no DOM mutation) ── */}
      <mesh
        position={[-2.2, 0, 2.5]}
        onPointerDown={(e) => {
          isDragging.current = true;
          prevMouse.current  = { x: e.clientX, y: e.clientY };
          e.stopPropagation();
        }}
        onPointerMove={(e) => {
          if (!isDragging.current) return;
          const dx = e.clientX - prevMouse.current.x;
          const dy = e.clientY - prevMouse.current.y;
          targetRot.current.y += dx * 0.012;
          targetRot.current.x += dy * 0.008;
          targetRot.current.x = Math.max(-Math.PI * 0.5, Math.min(Math.PI * 0.5, targetRot.current.x));
          prevMouse.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => { isDragging.current = false; }}
        onPointerLeave={() => { isDragging.current = false; }}
      >
        <planeGeometry args={[9, 7]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* ── GLB Model ── */}
      <group
        ref={groupRef}
        position={[-2.2, 0, 0]}
        scale={[1, 1, 1]}
      >
        <primitive object={scene} />
      </group>
    </>
  );
}
