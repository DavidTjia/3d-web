"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useGLTF, useTexture } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface WardekaTrophyProps {
  scrollProgressRef: React.RefObject<number>;
}

// Konfigurasi tiap bintang: posisi, scale, kecepatan bobbing, offset fase.
// Tinggal tambah/kurangi/edit baris di sini buat atur jumlah & posisi bintang.
const STAR_CONFIG = [
  { x: 1.9, y: 1.1, z: 0.4, scale: 0.32, bobSpeed: 0.7, bobPhase: 0.5 },
  { x: 1.6, y: -0.8, z: 0.5, scale: 0.2, bobSpeed: 0.8, bobPhase: 2.1 },
  { x: -1.9, y: 0.9, z: 0.4, scale: 0.28, bobSpeed: 0.6, bobPhase: 4.2 },
  { x: -1.6, y: -1.0, z: 0.5, scale: 0.16, bobSpeed: 0.9, bobPhase: 1.3 },
  { x: 2.2, y: -0.1, z: 0.2, scale: 0.14, bobSpeed: 0.75, bobPhase: 3.0 },
  { x: -2.2, y: 0.1, z: 0.2, scale: 0.22, bobSpeed: 0.65, bobPhase: 5.5 },
];

// Posisi 4 sudut HUD bracket di foto, [x, y] relatif ke pusat photoGroupRef
const HUD_CORNERS: [number, number][] = [
  [-1.5, 1.075],
  [1.5, 1.075],
  [-1.5, -0.675],
  [1.5, -0.675],
];

// Helper: update scale + glow intensity berdasarkan jarak cursor ke bintang (NDC space)
function updateStarProximity(
  starObj: THREE.Group | null,
  glowObj: THREE.PointLight | null,
  proximity: { value: number },
  baseScale: number,
  camera: THREE.Camera,
  pointer: THREE.Vector2,
  tmpVec: THREE.Vector3,
) {
  if (!starObj) return;

  starObj.getWorldPosition(tmpVec);
  tmpVec.project(camera);

  const dist = Math.hypot(tmpVec.x - pointer.x, tmpVec.y - pointer.y);
  const threshold = 0.4;
  const target = THREE.MathUtils.clamp(1 - dist / threshold, 0, 1);

  proximity.value = THREE.MathUtils.lerp(proximity.value, target, 0.15);

  const boost = 1 + proximity.value * 0.5;
  starObj.scale.setScalar(baseScale * boost);

  if (glowObj) {
    glowObj.intensity = proximity.value * 2.5;
  }
}

export default function WardekaTrophy({
  scrollProgressRef,
}: WardekaTrophyProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Refs per bintang, disimpan sebagai array, jumlahnya ngikutin STAR_CONFIG
  const starRefs = useRef<(THREE.Group | null)[]>([]);
  const glowRefs = useRef<(THREE.PointLight | null)[]>([]);
  const proximities = useRef(STAR_CONFIG.map(() => ({ value: 0 })));
  const tmpWorldPos = useRef(new THREE.Vector3());

  // Photo card, dua layer (glow plate + foto) buat efek depth
  const photoGroupRef = useRef<THREE.Group>(null);
  const photoGlowRef = useRef<THREE.Mesh>(null);
  const photoFrontRef = useRef<THREE.Mesh>(null);

  // Elemen atmosfer tambahan: ring, constellation lines, dust
  const dustRef = useRef<THREE.Points>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const fadeState = useRef({ opacity: 0 });
  const materialsRef = useRef<THREE.Material[]>([]);

  const starGltf = useGLTF("/models/wardeka-star.glb");
  const photoTexture = useTexture("/images/wardeka.png");

  // Clone model bintang sebanyak jumlah di STAR_CONFIG
  const starScenes = useMemo(
    () => STAR_CONFIG.map(() => starGltf.scene.clone(true)),
    [starGltf.scene],
  );

  useMemo(() => {
    const mats: THREE.Material[] = [];
    const collect = (root: THREE.Object3D) => {
      root.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if ((mesh as THREE.Mesh).isMesh) {
          const list = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          list.forEach((m) => {
            if (m) {
              m.transparent = true;
              mats.push(m);
            }
          });
        }
      });
    };
    starScenes.forEach(collect);
    materialsRef.current = mats;
  }, [starScenes]);

  // Posisi dust particle, di-generate sekali, melayang random di sekitar scene
  const dustPositions = useMemo(() => {
    const count = 60;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 1;
    }
    return positions;
  }, []);

  // Garis constellation, menghubungkan tiap bintang ke bintang berikutnya
  const constellationPositions = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < STAR_CONFIG.length; i++) {
      const a = STAR_CONFIG[i];
      const b = STAR_CONFIG[(i + 1) % STAR_CONFIG.length];
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    return new Float32Array(pts);
  }, []);

  useEffect(() => {
    // Delay dikit biar ScrollTrigger nunggu semua layout (loading screen,
    // navbar, dll) beres dulu sebelum ngukur posisi trigger, biar gak "ngaco"
    const setupTimeout = setTimeout(() => {
      gsap.set(fadeState.current, { opacity: 0 });

      const tween = gsap.to(fadeState.current, {
        opacity: 1,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "#wardeka-section",
          start: "top 60%",
          end: "bottom 30%",
          toggleActions: "play reverse play reverse",
          invalidateOnRefresh: true,
        },
      });

      ScrollTrigger.refresh();

      return tween;
    }, 1000);

    return () => {
      clearTimeout(setupTimeout);
    };
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const scroll = scrollProgressRef.current ?? 0;

    // Opacity fade DULUAN, biar bisa dipakai buat "kunci" rotasi & tilt
    // di bawah, supaya nggak ada gerakan yang udah "jalan duluan" sebelum
    // objeknya betul-betul kelihatan di layar.
    const opacity = fadeState.current.opacity;
    materialsRef.current.forEach((m) => {
      m.opacity = opacity;
    });
    groupRef.current.visible = opacity > 0.01;

    // Scroll-linked orbit rotation, dikali opacity biar rotasi cuma "hidup"
    // setelah objek udah kelihatan, bukan udah punya rotasi duluan dari
    // scroll value yang mulai lebih awal dari titik fade-in selesai.
    groupRef.current.rotation.y = scroll * Math.PI * 0.35 * opacity;

    // Opacity fade khusus untuk foto (material-nya di-manage terpisah)
    if (photoGlowRef.current) {
      const mat = photoGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity * 0.5;
    }
    if (photoFrontRef.current) {
      const mat = photoFrontRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
    }

    // Bobbing + cursor-reactive twinkle, loop semua bintang di STAR_CONFIG
    STAR_CONFIG.forEach((cfg, i) => {
      const star = starRefs.current[i];
      const glow = glowRefs.current[i];
      if (!star) return;

      star.position.y =
        cfg.y + Math.sin(t * cfg.bobSpeed + cfg.bobPhase) * 0.13;

      updateStarProximity(
        star,
        glow,
        proximities.current[i],
        cfg.scale,
        state.camera,
        state.pointer,
        tmpWorldPos.current,
      );
    });

    // Dust particle, melayang pelan, rotasi lambat
    if (dustRef.current) {
      dustRef.current.rotation.y = t * 0.02;
      const mat = dustRef.current.material as THREE.PointsMaterial;
      mat.opacity = opacity * 0.6;
    }

    // Orbit ring, muter pelan di belakang foto
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.15;
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity * 0.25;
    }

    // Photo card, parallax depth effect
    if (photoGroupRef.current) {
      photoGroupRef.current.position.y = Math.sin(t * 0.4) * 0.05;

      // Dikali opacity biar tilt cuma "hidup" pas objek udah kelihatan,
      // bukan udah ke-lerp duluan ngikutin posisi mouse pas masih invisible.
      const targetTiltX = state.pointer.y * 0.08 * opacity;
      const targetTiltY = state.pointer.x * 0.1 * opacity;
      photoGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        photoGroupRef.current.rotation.x,
        targetTiltX,
        0.05,
      );
      photoGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        photoGroupRef.current.rotation.y,
        targetTiltY,
        0.05,
      );
    }

    if (photoGlowRef.current) {
      const glowTiltX = state.pointer.y * 0.04 * opacity;
      const glowTiltY = state.pointer.x * 0.05 * opacity;
      photoGlowRef.current.rotation.x = THREE.MathUtils.lerp(
        photoGlowRef.current.rotation.x,
        glowTiltX,
        0.05,
      );
      photoGlowRef.current.rotation.y = THREE.MathUtils.lerp(
        photoGlowRef.current.rotation.y,
        glowTiltY,
        0.05,
      );
    }
  });

  return (
    <group ref={groupRef} position={[1.1, -0.3, 0]}>
      {/* FOTO WARDEKA, centerpiece, landscape orientation, dengan HUD frame */}
      <group ref={photoGroupRef} position={[-0.05, 0, 0.2]}>
        <mesh ref={photoGlowRef} position={[0, 0.2, -0.05]}>
          <planeGeometry args={[3.15, 1.9]} />
          <meshBasicMaterial
            color="#00d2ff"
            transparent
            opacity={0.5}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={photoFrontRef} position={[0, 0.2, 0]}>
          <planeGeometry args={[3, 1.75]} />
          <meshBasicMaterial
            map={photoTexture}
            transparent
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>

        {/* HUD corner brackets, 4 sudut, masing-masing 2 garis pendek */}
        {HUD_CORNERS.map(([bx, by], i) => (
          <group key={i} position={[bx, by + 0.2, 0.01]}>
            <mesh position={[bx > 0 ? -0.1 : 0.1, 0, 0]}>
              <planeGeometry args={[0.2, 0.015]} />
              <meshBasicMaterial color="#00d2ff" toneMapped={false} />
            </mesh>
            <mesh position={[0, by > 0.2 ? -0.1 : 0.1, 0]}>
              <planeGeometry args={[0.015, 0.2]} />
              <meshBasicMaterial color="#00d2ff" toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Orbit ring, tipis, di belakang foto, muter pelan */}
      <mesh ref={ringRef} position={[-0.05, 0.2, -0.15]}>
        <ringGeometry args={[1.7, 1.72, 64]} />
        <meshBasicMaterial
          color="#00d2ff"
          transparent
          opacity={0}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Garis constellation, menghubungkan tiap bintang */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={constellationPositions.length / 3}
            array={constellationPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#00d2ff"
          transparent
          opacity={0.15}
          toneMapped={false}
        />
      </lineSegments>

      {/* Ambient dust, titik melayang, kasih kedalaman di background */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={dustPositions.length / 3}
            array={dustPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#88ccff"
          size={0.025}
          transparent
          opacity={0}
          sizeAttenuation
          toneMapped={false}
        />
      </points>

      {/* BINTANG, jumlah & posisi diatur lewat STAR_CONFIG di atas */}
      {STAR_CONFIG.map((cfg, i) => (
        <group
          key={i}
          ref={(el) => {
            starRefs.current[i] = el;
          }}
          position={[cfg.x, cfg.y, cfg.z]}
        >
          <primitive object={starScenes[i]} scale={cfg.scale} />
          <pointLight
            ref={(el) => {
              glowRefs.current[i] = el;
            }}
            color="#00d2ff"
            intensity={0}
            distance={2}
          />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload("/models/wardeka-star.glb");
