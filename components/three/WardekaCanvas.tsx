"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, ReactNode } from "react";
import WardekaTrophy from "./WardekaTrophy";

interface WardekaCanvasProps {
  scrollProgressRef: React.RefObject<number>;
  children?: ReactNode;
}

export default function WardekaCanvas({
  scrollProgressRef,
  children,
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
        className="absolute inset-0"
      >
        <ambientLight intensity={0.5} color="#88aaff" />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        <pointLight position={[-4, 2, -3]} intensity={3} color="#00d2ff" />
        <Suspense fallback={null}>
          <WardekaTrophy scrollProgressRef={scrollProgressRef} />
        </Suspense>
      </Canvas>

      {/* pointer-events-none di sini penting — tanpa ini, div overlay ini
          nyerap semua event mouse duluan sebelum sempat sampai ke Canvas
          di bawahnya, jadi state.pointer di R3F nggak pernah ke-update.
          Kalau ada elemen interaktif (tombol, link) di dalam children,
          kasih pointer-events-auto khusus di elemen itu. */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {children}
      </div>
    </div>
  );
}
