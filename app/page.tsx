'use client';

import { useEffect, useRef } from 'react';
import SpaceCanvas from '@/components/three/SpaceCanvas';
import CustomCursor from '@/components/ui/CustomCursor';
import SpiderCreature from '@/components/ui/SpiderCreature';
import SmoothScroll from '@/components/ui/SmoothScroll';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function Home() {
  const scrollProgressRef = useRef<number>(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Register GSAP ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Track scroll progress and animate the HTML Hero overlay
    const trigger = ScrollTrigger.create({
      trigger: 'body',
      start: 'top top',
      end: '+=100%', // Ends when user has scrolled 100vh (equivalent to one viewport height)
      scrub: true,
      onUpdate: (self) => {
        // Feed scroll progress (0.0 to 1.0) to the background WebGL scene
        scrollProgressRef.current = self.progress;

        // Fade out and translate the Hero text overlay
        if (heroRef.current) {
          heroRef.current.style.opacity = Math.max(0, 1 - self.progress * 1.5).toString();
          heroRef.current.style.transform = `translate3d(0, -${self.progress * 120}px, 0)`;
        }
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <SmoothScroll>
      {/* Premium WebGL Background */}
      <SpaceCanvas scrollProgressRef={scrollProgressRef} />

      {/* 2D Spider Creature Overlay */}
      <SpiderCreature />

      {/* Premium Interactive Cursor */}
      <CustomCursor />

      {/* HTML Layout Container */}
      <main className="relative z-10 w-full min-h-[220vh]">
        {/* SECTION 1: HERO OVERLAY */}
        <section className="relative flex h-screen w-full flex-col items-center justify-center px-6 overflow-hidden">
          <div
            ref={heroRef}
            className="flex flex-col items-center text-center select-none"
            style={{ willChange: 'opacity, transform' }}
          >
            {/* Ambient background nebulae glow colors (adds depth behind the title) */}
            <div className="absolute -z-10 h-64 w-64 rounded-full bg-cyan-glow/10 blur-[100px] pointer-events-none" />
            <div className="absolute -z-10 h-64 w-64 translate-x-20 translate-y-10 rounded-full bg-nebula-purple/15 blur-[120px] pointer-events-none" />

            {/* Game Studio Sub-heading */}
            <span className="text-[11px] font-semibold tracking-[0.45em] uppercase text-cyan-glow drop-shadow-[0_0_8px_rgba(0,210,255,0.35)] mb-5 animate-pulse">
              Next-Gen Game Studio
            </span>

            {/* Title */}
            <h1 className="font-display text-5xl md:text-8xl lg:text-9xl font-extrabold tracking-[0.18em] text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] mb-5">
              AETHERIS
            </h1>

            {/* Paragraph Subtitle */}
            <p className="max-w-md font-body text-sm md:text-base text-gray-400 font-light tracking-wide leading-relaxed mb-12">
              Architecting premium interactive 3D ecosystems and celestial gameplay experiences.
            </p>

            {/* Custom Interactive Scroll Prompt */}
            <div className="flex flex-col items-center gap-3.5">
              <span className="text-[9px] tracking-[0.35em] uppercase text-gray-500 font-medium">
                Scroll to Explore
              </span>
              <div className="relative h-12 w-5.5 rounded-full border border-gray-800 flex justify-center p-1 bg-space-navy/20">
                <div className="h-2 w-1.5 rounded-full bg-cyan-glow animate-bounce" />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: TRANSITION & DEMO CARD */}
        <section className="relative flex min-h-screen w-full items-center justify-center px-6 py-24 bg-transparent">
          <div className="glassmorphism max-w-3xl w-full p-10 md:p-14 rounded-2xl relative overflow-hidden group">
            {/* Interactive glow border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-glow/5 to-nebula-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <span className="text-xs font-semibold tracking-[0.35em] uppercase text-cyan-glow mb-4 block">
              01 // The Odyssey
            </span>
            
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-wide text-white mb-6">
              Experiences Shaped in Deep Space.
            </h2>
            
            <p className="font-body text-gray-400 text-base md:text-lg font-light leading-relaxed mb-8">
              We push the boundaries of real-time WebGL and game engine technologies to build immersive, high-performance interactive portals. Hover the cursor to watch the alien constellation creature adapt its energy tentacles to local space coordinates in real-time.
            </p>
            
            <div className="w-16 h-[2px] bg-gradient-to-r from-cyan-glow to-nebula-purple" />
          </div>
        </section>
      </main>
    </SmoothScroll>
  );
}
