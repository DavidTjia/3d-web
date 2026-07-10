'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.6, // Soft, heavy scroll feeling
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom premium deceleration curve
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    // Update ScrollTrigger on Lenis scroll
    lenis.on('scroll', ScrollTrigger.update);

    // Frame ticker loop for Lenis
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Refresh ScrollTrigger to ensure accurate calculations
    ScrollTrigger.refresh();

    // Clean up on unmount
    return () => {
      lenis.destroy();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <>{children}</>;
}
