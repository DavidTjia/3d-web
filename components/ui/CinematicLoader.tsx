'use client';

/**
 * CinematicLoader — Pure full-screen cinematic intro.
 * NO text, NO progress bar, NO UI. Just the galaxy visual effect.
 */

import { useEffect, useRef } from 'react';
import CinematicGalaxy from '@/components/three/CinematicGalaxy';
import { useLoadingSequence } from '@/hooks/useLoadingSequence';
import gsap from 'gsap';

interface CinematicLoaderProps {
  onComplete: () => void;
}

export default function CinematicLoader({ onComplete }: CinematicLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleComplete = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete,
      });
    } else {
      onComplete();
    }
  };

  const { phase, progress, collapseProgress, explodeProgress } =
    useLoadingSequence(handleComplete);

  // Prevent body scroll during loading
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="cinematic-loader-root"
      aria-label="Loading AETHERIS experience"
    >
      <CinematicGalaxy
        phase={phase}
        progress={progress}
        collapseProgress={collapseProgress}
        explodeProgress={explodeProgress}
      />

      {/* Flash overlay for the singularity moment */}
      <div
        className="cinematic-flash-overlay"
        style={{
          opacity: phase === 'flash' ? 1 : 0,
          transition: phase === 'flash' ? 'opacity 0.05s ease' : 'opacity 0.3s ease',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
