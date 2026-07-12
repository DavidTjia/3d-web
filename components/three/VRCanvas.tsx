"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, ReactNode } from "react";
import * as THREE from "three";
import VRHeadset from "./VRHeadset";

interface VRCanvasProps {
  scrollProgressRef: React.RefObject<number>;
  children?: ReactNode;
}

export default function VRCanvas({ scrollProgressRef, children }: VRCanvasProps) {
  return (
    <div className="sticky top-0 h-screen w-full">
      <Canvas
        camera={{ position: [1.2, 0, 5.5], fov: 42 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        shadows="soft"
        dpr={[1, 1.5]}
        className="absolute inset-0"
        style={{ cursor: "grab" }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Suspense fallback={null}>
          <VRHeadset scrollProgressRef={scrollProgressRef} />
        </Suspense>
      </Canvas>

      {/* Text overlay — pointer-events-none so drag events reach the canvas */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {children}
      </div>
    </div>
  );
}
