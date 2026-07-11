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

export default function WardekaTrophy({
  scrollProgressRef,
}: WardekaTrophyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gamepadRef = useRef<THREE.Group>(null);
  const star1Ref = useRef<THREE.Group>(null);
  const star2Ref = useRef<THREE.Group>(null);
  const star3Ref = useRef<THREE.Group>(null);

  // Photo card — dua layer (glow plate + foto) buat efek depth
  const photoGroupRef = useRef<THREE.Group>(null);
  const photoGlowRef = useRef<THREE.Mesh>(null);
  const photoFrontRef = useRef<THREE.Mesh>(null);

  const fadeState = useRef({ opacity: 0 });
  const materialsRef = useRef<THREE.Material[]>([]);

  const gamepadGltf = useGLTF("/models/wardeka-gamepad.glb");
  const starGltf = useGLTF("/models/wardeka-star.glb");
  const photoTexture = useTexture("/images/wardeka.png");

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
    collect(gamepadGltf.scene);
    collect(star1Scene);
    collect(star2Scene);
    collect(star3Scene);
    materialsRef.current = mats;
  }, [gamepadGltf.scene, star1Scene, star2Scene, star3Scene]);

  useEffect(() => {
    const tween = gsap.to(fadeState.current, {
      opacity: 1,
      duration: 1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: "#wardeka-section",
        start: "top 70%",
        end: "bottom 30%",
        toggleActions: "play reverse play reverse",
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const scroll = scrollProgressRef.current ?? 0;

    // Scroll-linked orbit rotation — seluruh koleksi berputar mengikuti scroll
    groupRef.current.rotation.y = scroll * Math.PI * 0.35;

    // Opacity fade (dari materialsRef, khusus GLTF meshes)
    const opacity = fadeState.current.opacity;
    materialsRef.current.forEach((m) => {
      m.opacity = opacity;
    });
    groupRef.current.visible = opacity > 0.01;

    // Opacity fade khusus untuk foto (material-nya di-manage terpisah)
    if (photoGlowRef.current) {
      const mat = photoGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity * 0.5;
    }
    if (photoFrontRef.current) {
      const mat = photoFrontRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
    }

    // Bobbing gamepad
    if (gamepadRef.current) {
      gamepadRef.current.position.y = -0.9 + Math.sin(t * 0.6) * 0.12;
    }

    // Bobbing bintang — baseline Y diatur di sini, bukan di JSX
    if (star1Ref.current) {
      star1Ref.current.position.y = 1.2 + Math.sin(t * 0.7 + 0.5) * 0.15;
    }
    if (star2Ref.current) {
      star2Ref.current.position.y = -0.9 + Math.sin(t * 0.8 + 2.1) * 0.12;
    }
    if (star3Ref.current) {
      star3Ref.current.position.y = 1.0 + Math.sin(t * 0.6 + 4.2) * 0.14;
    }

    // Photo card — parallax depth effect
    if (photoGroupRef.current) {
      // Subtle bobbing biar foto ikut "hidup" kaya objek lain
      photoGroupRef.current.position.y = Math.sin(t * 0.4) * 0.05;

      // Tilt ngikutin cursor, di-lerp biar smooth — bikin kesan depth
      const targetTiltX = state.pointer.y * 0.08;
      const targetTiltY = state.pointer.x * 0.1;
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

    // Glow plate bergerak sedikit lebih lambat dari foto depan → parallax
    if (photoGlowRef.current) {
      const glowTiltX = state.pointer.y * 0.04;
      const glowTiltY = state.pointer.x * 0.05;
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
      {/* FOTO WARDEKA — centerpiece, landscape orientation */}
      <group ref={photoGroupRef} position={[-0.05, 0, 0.2]}>
        {/* Glow plate di belakang — sedikit lebih besar & lebih jauh di Z */}
        <mesh ref={photoGlowRef} position={[0, 0.2, -0.02]}>
          <planeGeometry args={[3.3, 2]} />
          <meshBasicMaterial
            color="#00d2ff"
            transparent
            opacity={0.5}
            toneMapped={false}
          />
        </mesh>

        {/* Foto di depan — landscape 16:9-ish, sesuaikan args ke aspect ratio asli fotomu */}
        <mesh ref={photoFrontRef} position={[0, 0.2, -0.01]}>
          <planeGeometry args={[3, 1.75]} />
          <meshBasicMaterial
            map={photoTexture}
            transparent
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* GAMEPAD — tidak diubah */}
      <group ref={gamepadRef} position={[-1.7, 0, 0.8]}>
        <primitive object={gamepadGltf.scene} scale={0.6} />
      </group>

      {/* BINTANG — 3 buah, disebar mengelilingi foto */}
      <group ref={star1Ref} position={[1.7, 0, 0.4]}>
        <primitive object={star1Scene} scale={0.35} />
      </group>

      <group ref={star2Ref} position={[1.5, 0, 0.4]}>
        <primitive object={star2Scene} scale={0.18} />
      </group>

      <group ref={star3Ref} position={[-1.8, 0, 0.4]}>
        <primitive object={star3Scene} scale={0.22} />
      </group>
    </group>
  );
}

useGLTF.preload("/models/wardeka-gamepad.glb");
useGLTF.preload("/models/wardeka-star.glb");
