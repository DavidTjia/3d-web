"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";

interface AchievementConstellationProps {
  scrollProgressRef: React.RefObject<number>;
  /** Node yang lagi di-hover kursor (sementara, null kalau tidak ada). */
  hoverIndex: number | null;
  /** Node yang terakhir di-klik user — persist sampai ada klik baru. */
  selectedIndex: number;
  reducedMotion: boolean;
  onNodeHover: (index: number | null) => void;
  onNodeClick: (index: number) => void;
}

const Y_OFFSET = 0.2;

// Posisi LOKAL tiap klaster (X=0 di sini artinya pusat klaster itu sendiri,
// BUKAN pusat layar) — nanti di-offset ke kiri/kanan lewat LEFT_X_CENTER
// dan RIGHT_X_CENTER di bawah.
const LEFT_LOCAL_POSITIONS: [number, number, number][] = [
  [-0.9, 0.6, 0],
  [-0.15, -0.5, -0.4],
  [0.7, 0.5, -0.7],
];

const RIGHT_LOCAL_POSITIONS: [number, number, number][] = [
  [-0.4, 0.5, -0.3],
  [0.5, -0.4, 0],
];

// Jarak pusat tiap klaster dari tengah layar. Dinaikkan lagi dari 3.1 →
// 3.8 karena user masih merasa terlalu mepet ke konten tengah (heading /
// AwardCard / list tombol award).
const LEFT_X_CENTER = -3.8;
const RIGHT_X_CENTER = 3.8;

const LEFT_POSITIONS: [number, number, number][] = LEFT_LOCAL_POSITIONS.map(
  ([x, y, z]) => [x + LEFT_X_CENTER, y + Y_OFFSET, z],
);
const RIGHT_POSITIONS: [number, number, number][] = RIGHT_LOCAL_POSITIONS.map(
  ([x, y, z]) => [x + RIGHT_X_CENTER, y + Y_OFFSET, z],
);

// Gabungan buat lookup activeIndex → posisi dunia (dipakai bareng semua
// instancedMesh, yang tetap satu instance count NODE_COUNT biar simple).
const NODE_POSITIONS: [number, number, number][] = [
  ...LEFT_POSITIONS,
  ...RIGHT_POSITIONS,
];
const NODE_COUNT = NODE_POSITIONS.length; // 5

// Garis penghubung — HANYA di dalam klaster masing-masing. 0-1, 1-2 (kiri)
// dan 3-4 (kanan). TIDAK ADA garis 2-3 yang melintasi tengah.
const CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [3, 4],
];

// Ukuran node diperbesar lagi (dari core 0.1/glow 0.19/aura 1.0) supaya
// tetap terasa "hadir" walau klaster sekarang jauh lebih jauh dari tengah.
const SIZE = {
  core: 0.12,
  glow: 0.22,
  aura: 1.15,
};

// ─── Palet 3 state — ini kunci fix "hover ketuker sama selected":
// - idle    : biru redup, node yang tidak sedang diapa-apakan.
// - hover   : putih-cyan terang, HANYA muncul selama kursor betulan di atas
//             node itu, dan hilang total begitu kursor pergi.
// - selected: kuning emas + ring lingkaran permanen (lihat selectionRingRef
//             di bawah) yang tetap ada sampai user klik node lain.
const COLOR = {
  idle: new THREE.Color("#8cd5ff"),
  hover: new THREE.Color("#eafcff"),
  selected: new THREE.Color("#fbbf24"),
};

const dummy = new THREE.Object3D();

const SPARKLE_COUNT = 90;

function generateSparkleGeometry() {
  const positions = new Float32Array(SPARKLE_COUNT * 3);
  const phases = new Float32Array(SPARKLE_COUNT);
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 5 + Y_OFFSET * 0.5;
    positions[i * 3 + 2] = -1.5 - Math.random() * 3;
    phases[i] = Math.random() * Math.PI * 2;
  }
  return { positions, phases };
}

const SPARKLE_GEOMETRY = generateSparkleGeometry();

const SPARKLE_MATERIAL = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    attribute float aPhase;
    uniform float uTime;
    varying float vTwinkle;
    void main() {
      vTwinkle = 0.4 + 0.6 * sin(uTime * 1.2 + aPhase);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = (2.0 + vTwinkle * 1.5) * (60.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vTwinkle;
    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      float alpha = smoothstep(0.5, 0.0, d) * vTwinkle * 0.6;
      gl_FragColor = vec4(0.85, 0.92, 1.0, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.4, "rgba(180,215,255,0.35)");
  gradient.addColorStop(1, "rgba(180,215,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const LINE_MATERIAL = new THREE.ShaderMaterial({
  uniforms: {
    uOpacity: { value: 0.35 },
    uTime: { value: 0 },
  },
  vertexShader: `
    attribute float aProgress;
    varying float vProgress;
    void main() {
      vProgress = aProgress;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uOpacity;
    uniform float uTime;
    varying float vProgress;
    void main() {
      float pulse = 0.5 + 0.5 * sin(vProgress * 6.0 - uTime * 1.4);
      float glow = mix(0.5, 1.0, pulse);
      gl_FragColor = vec4(0.85, 0.93, 1.0, uOpacity * glow);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

export default function AchievementConstellation({
  scrollProgressRef,
  hoverIndex,
  selectedIndex,
  reducedMotion,
  onNodeHover,
  onNodeClick,
}: AchievementConstellationProps) {
  const leftGroupRef = useRef<THREE.Group>(null);
  const rightGroupRef = useRef<THREE.Group>(null);
  const hitAreaRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const auraRefs = useRef<(THREE.Sprite | null)[]>([]);
  const linesRef = useRef<THREE.LineSegments>(null);
  const sparkleRef = useRef<THREE.Points>(null);
  // Ring penanda "selected" — SATU mesh saja (bukan instanced) karena
  // hanya boleh ada 1 node selected dalam satu waktu. Selalu visible,
  // posisinya dipindah ke node yang sedang selectedIndex tiap frame. Ini
  // yang bikin klik terasa "nempel" (persistent) berbeda dari hover yang
  // cuma nyala sesaat.
  const selectionRingRef = useRef<THREE.Mesh>(null);

  const { viewport, camera } = useThree();
  // Total lebar dunia yang dibutuhin sekarang jauh lebih besar karena
  // klaster dipindah lebih jauh dari tengah (±3.8). Divisor dinaikkan dari
  // 9.5 → 11.5 supaya di viewport sempit seluruh scene tetap di-scale-down
  // proporsional dan node paling pinggir tetap ke-reach buat hover/klik.
  const safeScale = Math.min(1, viewport.width / 11.5);

  const glowTexture = useMemo(() => createGlowTexture(), []);
  const { positions: sparklePositions, phases: sparklePhases } =
    SPARKLE_GEOMETRY;

  const linePositions = useMemo(() => {
    const arr = new Float32Array(CONNECTIONS.length * 2 * 3);
    CONNECTIONS.forEach(([a, b], i) => {
      const pa = NODE_POSITIONS[a];
      const pb = NODE_POSITIONS[b];
      arr.set(pa, i * 6);
      arr.set(pb, i * 6 + 3);
    });
    return arr;
  }, []);

  const lineProgress = useMemo(() => {
    const arr = new Float32Array(CONNECTIONS.length * 2);
    CONNECTIONS.forEach((_, i) => {
      arr[i * 2] = 0;
      arr[i * 2 + 1] = 1;
    });
    return arr;
  }, []);

  useEffect(() => {
    if (coreRef.current) {
      for (let i = 0; i < NODE_COUNT; i++)
        coreRef.current.setColorAt(i, COLOR.idle);
      if (coreRef.current.instanceColor)
        coreRef.current.instanceColor.needsUpdate = true;
    }
    if (glowRef.current) {
      for (let i = 0; i < NODE_COUNT; i++)
        glowRef.current.setColorAt(i, COLOR.idle);
      if (glowRef.current.instanceColor)
        glowRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const scroll = scrollProgressRef.current ?? 0;

    // Kedua klaster rotasi independen — sengaja dikasih fase & arah yang
    // sedikit beda biar kerasa sebagai dua entitas terpisah, bukan satu
    // objek yang kebetulan punya dua ujung.
    if (leftGroupRef.current) {
      leftGroupRef.current.rotation.y = reducedMotion
        ? 0
        : Math.sin(time * 0.08) * 0.04 + scroll * 0.2;
    }
    if (rightGroupRef.current) {
      rightGroupRef.current.rotation.y = reducedMotion
        ? 0
        : Math.sin(time * 0.08 + Math.PI) * 0.04 - scroll * 0.2;
    }

    let coreColorDirty = false;
    let glowColorDirty = false;

    for (let i = 0; i < NODE_COUNT; i++) {
      const pos = NODE_POSITIONS[i];
      const isSelected = selectedIndex === i;
      // Hover HANYA berlaku kalau node itu sedang bener-bener di-hover DAN
      // bukan node yang sedang selected — soalnya node selected sudah
      // punya bahasa visual sendiri (emas + ring), jadi tidak perlu ikut
      // "menyala versi hover" lagi ketika kursor lewat di atasnya.
      const isHovered = hoverIndex === i && !isSelected;

      const pulse = reducedMotion
        ? 1
        : 1 +
          Math.sin(time * 2.4 + i * 0.7) *
            (isSelected ? 0.16 : isHovered ? 0.22 : 0.08);
      const activeBoost = isSelected ? 1.55 : isHovered ? 1.35 : 1;

      dummy.position.set(pos[0], pos[1], pos[2]);
      // Radius hit-sphere kecil & tetap (0.32) — dikombinasikan dengan
      // klaster yang sekarang jauh dari tengah, area invisible tiap node
      // tidak akan pernah tumpang tindih dengan area konten di tengah.
      dummy.scale.setScalar(0.32);
      dummy.updateMatrix();
      hitAreaRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.scale.setScalar(SIZE.core * pulse * activeBoost);
      dummy.updateMatrix();
      coreRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.scale.setScalar(SIZE.glow * pulse * activeBoost);
      dummy.updateMatrix();
      glowRef.current?.setMatrixAt(i, dummy.matrix);

      const sprite = auraRefs.current[i];
      if (sprite) {
        sprite.position.set(pos[0], pos[1], pos[2]);
        const s = SIZE.aura * pulse * activeBoost;
        sprite.scale.set(s, s, 1);
        const mat = sprite.material as THREE.SpriteMaterial;
        mat.opacity = isSelected ? 0.65 : isHovered ? 0.55 : 0.35;
        mat.color.copy(
          isSelected ? COLOR.selected : isHovered ? COLOR.hover : COLOR.idle,
        );
      }

      const targetColor = isSelected
        ? COLOR.selected
        : isHovered
          ? COLOR.hover
          : COLOR.idle;
      coreRef.current?.setColorAt(i, targetColor);
      glowRef.current?.setColorAt(i, targetColor);
      coreColorDirty = true;
      glowColorDirty = true;
    }

    if (hitAreaRef.current)
      hitAreaRef.current.instanceMatrix.needsUpdate = true;
    if (coreRef.current) {
      coreRef.current.instanceMatrix.needsUpdate = true;
      if (coreColorDirty && coreRef.current.instanceColor)
        coreRef.current.instanceColor.needsUpdate = true;
    }
    if (glowRef.current) {
      glowRef.current.instanceMatrix.needsUpdate = true;
      if (glowColorDirty && glowRef.current.instanceColor)
        glowRef.current.instanceColor.needsUpdate = true;
    }

    // Selection ring — billboard manual (selalu menghadap kamera) supaya
    // tetap kelihatan sebagai lingkaran bersih dari sudut manapun, dan
    // dikasih sedikit rotasi pelan biar terasa "hidup" tanpa mengganggu
    // pembacaan bahwa ini adalah penanda persist, bukan efek hover.
    if (selectionRingRef.current) {
      const pos = NODE_POSITIONS[selectedIndex];
      selectionRingRef.current.position.set(pos[0], pos[1], pos[2]);
      selectionRingRef.current.quaternion.copy(camera.quaternion);
      selectionRingRef.current.rotation.z = time * 0.4;
      const ringPulse = reducedMotion ? 1 : 1 + Math.sin(time * 1.6) * 0.06;
      const s = SIZE.aura * 0.62 * ringPulse;
      selectionRingRef.current.scale.set(s, s, 1);
    }

    const lineMat = linesRef.current?.material as
      | THREE.ShaderMaterial
      | undefined;
    if (lineMat) {
      const target = hoverIndex !== null ? 0.6 : 0.32;
      lineMat.uniforms.uOpacity.value +=
        (target - lineMat.uniforms.uOpacity.value) * 0.1;
      lineMat.uniforms.uTime.value = time;
    }

    const sparkleMat = sparkleRef.current?.material as
      | THREE.ShaderMaterial
      | undefined;
    if (sparkleMat) {
      sparkleMat.uniforms.uTime.value = time;
    }
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
    if (e.instanceId !== undefined) onNodeHover(e.instanceId);
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = "auto";
    onNodeHover(null);
  };
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) onNodeClick(e.instanceId);
  };

  return (
    // Wrapper scale — cuma buat jaga hover di layar sempit. Rotasi
    // independen tetap terjadi di leftGroupRef/rightGroupRef masing-masing
    // (dua group kosong dipakai HANYA buat state rotation reference; posisi
    // sebenarnya tetap dihitung absolut per-node di NODE_POSITIONS di atas,
    // jadi rotasi ini murni kosmetik/opsional dan tidak menggeser klaster
    // saling mendekat).
    <group scale={safeScale}>
      <group ref={leftGroupRef} />
      <group ref={rightGroupRef} />

      <points ref={sparkleRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[sparklePositions, 3]}
            count={SPARKLE_COUNT}
            array={sparklePositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aPhase"
            args={[sparklePhases, 1]}
            count={SPARKLE_COUNT}
            array={sparklePhases}
            itemSize={1}
          />
        </bufferGeometry>
        <primitive object={SPARKLE_MATERIAL} attach="material" />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
            count={CONNECTIONS.length * 2}
            array={linePositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aProgress"
            args={[lineProgress, 1]}
            count={CONNECTIONS.length * 2}
            array={lineProgress}
            itemSize={1}
          />
        </bufferGeometry>
        <primitive object={LINE_MATERIAL} attach="material" />
      </lineSegments>

      {NODE_POSITIONS.map((_, i) => (
        <sprite
          key={`aura-${i}`}
          ref={(el) => {
            auraRefs.current[i] = el;
          }}
        >
          <spriteMaterial
            map={glowTexture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* Ring permanen — satu-satunya elemen yang menandakan "ini yang
          sedang dipilih user", tidak pernah ikut animasi hover node lain
          supaya tidak ketuker secara visual. */}
      <mesh ref={selectionRingRef} renderOrder={10}>
        <ringGeometry args={[0.34, 0.44, 48]} />
        <meshBasicMaterial
          color={COLOR.selected}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <instancedMesh
        ref={hitAreaRef}
        args={[undefined, undefined, NODE_COUNT]}
        frustumCulled={false}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </instancedMesh>

      <instancedMesh
        ref={coreRef}
        args={[undefined, undefined, NODE_COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={glowRef}
        args={[undefined, undefined, NODE_COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 14, 14]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
