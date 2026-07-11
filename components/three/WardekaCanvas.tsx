"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import WardekaTrophy from "./WardekaTrophy";

interface WardekaCanvasProps {
  scrollProgressRef: React.RefObject<number>;
}

export default function WardekaCanvas({
  scrollProgressRef,
}: WardekaCanvasProps) {
  return (
    <div className="sticky top-0 h-screen w-full">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.5} color="#88aaff" />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        <pointLight position={[-4, 2, -3]} intensity={3} color="#00d2ff" />
        <Suspense fallback={null}>
          <WardekaTrophy scrollProgressRef={scrollProgressRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
