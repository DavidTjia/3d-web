"use client";

import { useEffect, useRef } from "react";
import SpaceCanvas from "@/components/three/SpaceCanvas";
import WardekaCanvas from "@/components/three/WardekaCanvas";
import CustomCursor from "@/components/ui/CustomCursor";
import SpiderCreature from "@/components/ui/SpiderCreature";
// import SmoothScroll from '@/components/ui/SmoothScroll'; // sementara dimatikan buat testing
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Home() {
  const scrollProgressRef = useRef<number>(0);
  const wardekaProgressRef = useRef<number>(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Register GSAP ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Track scroll progress and animate the HTML Hero overlay
    const trigger = ScrollTrigger.create({
      trigger: "body",
      start: "top top",
      end: "+=100%", // Ends when user has scrolled 100vh (equivalent to one viewport height)
      scrub: true,
      onUpdate: (self) => {
        // Feed scroll progress (0.0 to 1.0) to the background WebGL scene
        scrollProgressRef.current = self.progress;

        // Fade out and translate the Hero text overlay
        if (heroRef.current) {
          heroRef.current.style.opacity = Math.max(
            0,
            1 - self.progress * 1.5,
          ).toString();
          heroRef.current.style.transform = `translate3d(0, -${self.progress * 120}px, 0)`;
        }
      },
    });

    // Track scroll progress khusus section Wardeka (0 -> 1 selama section itu discroll)
    const wardekaTrigger = ScrollTrigger.create({
      trigger: "#wardeka-section",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        wardekaProgressRef.current = self.progress;
      },
    });

    return () => {
      trigger.kill();
      wardekaTrigger.kill();
    };
  }, []);

  return (
    <>
      {/* Premium WebGL Background */}
      <SpaceCanvas scrollProgressRef={scrollProgressRef} />

      {/* 2D Spider Creature Overlay */}
      <SpiderCreature />

      {/* Premium Interactive Cursor */}
      <CustomCursor />

      {/* HTML Layout Container */}
      <main className="relative z-10 w-full min-h-screen">
        {/* SECTION 1: HERO OVERLAY */}
        <section className="relative flex h-screen w-full flex-col items-center justify-center px-6 overflow-hidden">
          <div
            ref={heroRef}
            className="flex flex-col items-center text-center select-none"
            style={{ willChange: "opacity, transform" }}
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
              Architecting premium interactive 3D ecosystems and celestial
              gameplay experiences.
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

        {/* SECTION 3: CASE STUDY — WARDEKA EDONISIA */}
        {/* SECTION: WARDEKA EDONISIA */}
        <section id="wardeka-section" className="relative w-full h-[300vh]">
          <WardekaCanvas scrollProgressRef={wardekaProgressRef} />
          <div className="absolute inset-0 flex items-center px-6 md:px-16 pointer-events-none">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold tracking-[0.35em] uppercase text-cyan-glow mb-4 block">
                Game Development · Esports
              </span>

              <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
                Wardeka <span className="text-cyan-glow">Edonisia</span>
              </h2>

              <p className="font-body text-gray-300 text-sm md:text-base leading-relaxed mb-6 max-w-xl">
                Game esports shooter mobile pertama karya Indonesia,
                dikembangkan Big Dade Interactive di bawah PT Kawanua Virtual
                Teknologi.
              </p>

              {/* Problem → Solution */}
              <div className="space-y-3 mb-6 max-w-xl">
                <div className="border-l-2 border-cyan-glow/40 pl-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-1">
                    Tantangan
                  </p>
                  <p className="font-body text-gray-400 text-sm leading-relaxed">
                    Dari Rp33 triliun pasar game Indonesia, 95% direbut
                    developer luar negeri — Indonesia lebih banyak jadi penonton
                    ketimbang pemain di industrinya sendiri.
                    <span className="text-gray-600">
                      {" "}
                      (detikINET, April 2025)
                    </span>
                  </p>
                </div>
                <div className="border-l-2 border-cyan-glow/40 pl-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-1">
                    Solusi
                  </p>
                  <p className="font-body text-gray-400 text-sm leading-relaxed">
                    Game shooter dengan karakter, senjata, skin, dan cerita
                    bernuansa budaya Indonesia — arena futuristik, karakter
                    berbahasa Indonesia, enam ability unik (Fast, Scan,
                    Invisible, Heal, Shield, Stun), dirancang untuk turnamen
                    esports nasional & internasional.
                  </p>
                </div>
              </div>

              {/* Tech highlights — compact grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6 max-w-xl text-xs text-gray-400">
                <p>
                  ⚙ Game client + PC client turnamen skala
                  nasional/internasional
                </p>
                <p>⚙ Dashboard & analytic custom (performa, item, penjualan)</p>
                <p>
                  ⚙ Cloud architecture sendiri — &quot;Delta Garuda&quot;, 7
                  tahun pengembangan
                </p>
                <p>
                  ⚙ 86 item fashion · 57 skin senjata · battlepass · gacha
                  system
                </p>
              </div>

              {/* Achievements — chip style biar ringkas tapi lengkap */}
              <div className="mb-6 max-w-xl">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-2">
                  Pencapaian
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Cabang esports resmi — PON 2024/2025",
                    "Piala Presiden Esports 2024",
                    "Cabang olahraga — PORPROV XII Sulut 2025",
                    "Juara Nasional AKI 2023",
                    "Apresiasi 5 Menteri + Wapres + Gubernur Sulut",
                    "Turnamen shooter lokal pertama — Sabang–Merauke",
                    "Diliput ratusan media nasional",
                  ].map((item) => (
                    <span
                      key={item}
                      className="text-[11px] text-gray-300 bg-white/5 border border-white/10 rounded-full px-3 py-1"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Roadmap */}
              <div className="max-w-xl">
                <p className="font-body text-gray-500 text-xs italic">
                  Ke depan:{" "}
                  <span className="text-cyan-glow not-italic">
                    Wardeka World War 2025
                  </span>{" "}
                  — target 1% market share game Indonesia.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
