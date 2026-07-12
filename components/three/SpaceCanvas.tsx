'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import SceneContent from './SceneContent';

interface SpaceCanvasProps {
  scrollProgressRef: React.RefObject<number>;
  bgScrollRef: React.RefObject<number>;
}

export default function SpaceCanvas({ scrollProgressRef, bgScrollRef }: SpaceCanvasProps) {
  return (
    <div className="fixed inset-0 z-0 h-screen w-full overflow-hidden bg-black">
      <Canvas
        camera={{ position: [0, 0.5, 10], fov: 60, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        dpr={[1, 1.5]}
      >
        {/* Deep space background */}
        <color attach="background" args={['#030308']} />

        <ambientLight intensity={0.18} />

        {/* Key blue light top-right */}
        <directionalLight position={[5, 5, 5]} intensity={1.5} color="#00d2ff" />

        {/* Purple fill bottom-left */}
        <directionalLight position={[-5, -5, -5]} intensity={0.8} color="#6d28d9" />

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
