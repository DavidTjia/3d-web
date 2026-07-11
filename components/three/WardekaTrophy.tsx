"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

interface WardekaTrophyProps {
  scrollProgressRef: React.RefObject<number>;
}

export default function WardekaTrophy({
  scrollProgressRef,
}: WardekaTrophyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const weaponRef = useRef<THREE.Group>(null);
  const star1Ref = useRef<THREE.Group>(null);
  const star2Ref = useRef<THREE.Group>(null);
  const star3Ref = useRef<THREE.Group>(null);

  const current = useRef({
    rotY: 0,
    posZ: 0,
    opacity: 0,
    starRotY: 0,
    weaponRotY: 0,
  });

  // Load model (cuma sekali per file, di-cache otomatis oleh drei)
  const trophyGltf = useGLTF("/models/wardeka-trophy.glb");
  const weaponGltf = useGLTF("/models/wardeka-weapon.glb");
  const starGltf = useGLTF("/models/wardeka-star.glb");

  // PENTING: clone scene bintang jadi 3 instance terpisah,
  // karena useGLTF balikin objek yang SAMA tiap dipanggil dengan path yang sama.
  // Tanpa clone, 1 objek cuma bisa nempel di 1 parent — makanya cuma 1 yang muncul.
  const star1Scene = useMemo(
    () => starGltf.scene.clone(true),
    [starGltf.scene],
  );
  const star2Scene = useMemo(
    () => starGltf.scene.clone(true),
    [starGltf.scene],
  );
  const star3Scene = useMemo(
    () => starGltf.scene.clone(true),
    [starGltf.scene],
  );

  useFrame(() => {
    const progress = scrollProgressRef.current ?? 0;
    if (!groupRef.current) return;

    const inRange = progress > 0 && progress < 1;
    const targetRotY = progress * Math.PI * 2.5;
    const targetPosZ = Math.sin(progress * Math.PI) * 0.6;
    const targetOpacity = inRange ? 1 : 0;
    const targetStarRotY = -progress * Math.PI * 1.8;
    const targetWeaponRotY = progress * Math.PI * 1.6;

    const c = current.current;
    c.rotY += (targetRotY - c.rotY) * 0.08;
    c.posZ += (targetPosZ - c.posZ) * 0.08;
    c.opacity += (targetOpacity - c.opacity) * 0.1;
    c.starRotY += (targetStarRotY - c.starRotY) * 0.08;
    c.weaponRotY += (targetWeaponRotY - c.weaponRotY) * 0.08;

    // Group utama (piala) — rotasi & fade
    groupRef.current.rotation.y = c.rotY;
    groupRef.current.rotation.z = Math.sin(c.rotY * 0.5) * 0.04;
    groupRef.current.position.z = c.posZ;
    groupRef.current.visible = c.opacity > 0.01;

    const scale = 0.55 * Math.max(c.opacity, 0.001);
    groupRef.current.scale.set(scale, scale, scale);

    // Senjata — sejajar piala (y = 0, hanya digeser ke samping), muter arah sendiri
    if (weaponRef.current) {
      weaponRef.current.rotation.y = c.weaponRotY;
      weaponRef.current.rotation.z = 0.15 + Math.sin(c.rotY * 0.6) * 0.06;
    }

    // 3 bintang — tiap bintang punya offset waktu & radius beda biar nggak keliatan seragam/kaku
    if (star1Ref.current) {
      star1Ref.current.rotation.y = c.starRotY;
      star1Ref.current.rotation.x = c.starRotY * 0.5;
      star1Ref.current.position.y = 1.7 + Math.sin(c.rotY * 0.8) * 0.15;
    }
    if (star2Ref.current) {
      star2Ref.current.rotation.y = c.starRotY * 1.3;
      star2Ref.current.rotation.x = c.starRotY * 0.4;
      star2Ref.current.position.y = 0.9 + Math.sin(c.rotY * 0.8 + 2.1) * 0.12;
    }
    if (star3Ref.current) {
      star3Ref.current.rotation.y = c.starRotY * 0.8;
      star3Ref.current.rotation.x = c.starRotY * 0.6;
      star3Ref.current.position.y = 1.3 + Math.sin(c.rotY * 0.8 + 4.2) * 0.18;
    }
  });

  return (
    <group ref={groupRef} visible={false} position={[2.4, -0.3, 0]}>
      {/* PIALA — objek utama */}
      <primitive object={trophyGltf.scene} position={[0, 0, 0]} />

      {/* SENJATA — sejajar (sama tinggi, y=0) dengan piala, cuma digeser ke samping (x) */}
      <group ref={weaponRef} position={[-1.6, 0, 0.2]}>
        <primitive object={weaponGltf.scene} scale={0.5} />
      </group>

      {/* BINTANG 1 — ukuran NORMAL (paling besar dari yang tiga) */}
      <group ref={star1Ref} position={[1.3, 1.7, 0.4]}>
        <primitive object={star1Scene} scale={0.4} />
      </group>

      {/* BINTANG 2 — ukuran KECIL BANGET */}
      <group ref={star2Ref} position={[1.6, 0.9, 0.2]}>
        <primitive object={star2Scene} scale={0.15} />
      </group>

      {/* BINTANG 3 — ukuran SEDANG */}
      <group ref={star3Ref} position={[-0.4, 1.3, 0.5]}>
        <primitive object={star3Scene} scale={0.27} />
      </group>
    </group>
  );
}

// Preload semua model biar nggak lag pas section pertama kali muncul
useGLTF.preload("/models/wardeka-trophy.glb");
useGLTF.preload("/models/wardeka-weapon.glb");
useGLTF.preload("/models/wardeka-star.glb");
