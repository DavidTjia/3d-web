"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import SceneContent from "./SceneContent";

interface SpaceCanvasProps {
  scrollProgressRef: React.RefObject<number>;
  bgScrollRef: React.RefObject<number>;
}

export default function SpaceCanvas({
  scrollProgressRef,
  bgScrollRef,
}: SpaceCanvasProps) {
  return (
    <div className="fixed inset-0 z-0 h-screen w-full overflow-hidden" style={{ background: '#08020e' }}>
      <Canvas
        camera={{ position: [0, 5.5, 14], fov: 62, near: 0.1, far: 600 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        dpr={[1, 1.5]}
      >
        {/* Deep purple-black sky — corporate cyberpunk night */}
        <color attach="background" args={["#08020e"]} />

        {/* Atmospheric fog — city fades into darkness, not empty space */}
        <fog attach="fog" args={["#08020e", 40, 280]} />

        {/* Very dim ambient — scene is mostly lit by emissives + point lights */}
        <ambientLight intensity={0.08} color="#120818" />

        {/* Subtle directional key light from above — barely touches building tops */}
        <directionalLight
          position={[0, 40, -50]}
          intensity={0.25}
          color="#2d0840"
        />

        {/* Very faint pink rim from behind camera — subtly illuminates near elements */}
        <directionalLight
          position={[0, 5, 20]}
          intensity={0.15}
          color="#ff2d87"
        />

        <Suspense fallback={null}>
          <SceneContent
            scrollProgressRef={scrollProgressRef}
            bgScrollRef={bgScrollRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
