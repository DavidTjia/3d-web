"use client";

import { useEffect, useRef, useState } from "react";
import SpaceCanvas from "@/components/three/SpaceCanvas";
import WardekaCanvas from "@/components/three/WardekaCanvas";
import VRCanvas from "@/components/three/VRCanvas";
import CustomCursor from "@/components/ui/CustomCursor";
import SpiderCreature from "@/components/ui/SpiderCreature";
import SmoothScroll from "@/components/ui/SmoothScroll";
import RocketLoader from "@/components/ui/RocketLoader";
import Navbar from "@/components/ui/Navbar";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Home() {
  const scrollProgressRef = useRef<number>(0);
  const wardekaProgressRef = useRef<number>(0);
  const vrProgressRef = useRef<number>(0);
  // Full-page 0→1 scroll progress used exclusively by SpaceCanvas background camera
  const bgScrollRef = useRef<number>(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const wardekaTextRef = useRef<HTMLDivElement>(null);
  const vrTextRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // Controls loading vs main experience visibility
  const [isLoading, setIsLoading] = useState(true);
  const [mainVisible, setMainVisible] = useState(false);

  // Register GSAP plugin sekali di awal
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
  }, []);

  useEffect(() => {
    if (!mainVisible) return;

    // Hero fade/translate (still covers only first 100vh)
    const trigger = ScrollTrigger.create({
      trigger: "body",
      start: "top top",
      end: "+=100%",
      scrub: true,
      onUpdate: (self) => {
        scrollProgressRef.current = self.progress;

        if (heroRef.current) {
          heroRef.current.style.opacity = Math.max(
            0,
            1 - self.progress * 1.5,
          ).toString();
          heroRef.current.style.transform = `translate3d(0, -${self.progress * 120}px, 0)`;
        }
      },
    });

    // Full-page progress for background camera — covers entire scrollable height
    const bgTrigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        bgScrollRef.current = self.progress;
      },
    });

    // Progress khusus buat GERAKAN OBJEK 3D (bintang, dsb) — tetap
    // scrub terus-menerus sepanjang section, karena mereka emang perlu ngikutin
    // posisi scroll real-time buat muter/geser.
    const wardekaTrigger = ScrollTrigger.create({
      trigger: "#wardeka-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        wardekaProgressRef.current = self.progress;
      },
    });

    const vrTrigger = ScrollTrigger.create({
      trigger: "#vr-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        vrProgressRef.current = self.progress;
      },
    });

    // Fade teks — begitu section udah kelihatan ±25% dari bawah layar, teks
    // fade-in sekali (1 detik), lalu diam di situ.
    let fadeAnim: gsap.core.Tween | undefined;
    if (wardekaTextRef.current) {
      gsap.set(wardekaTextRef.current, { opacity: 0, y: 24 });
      fadeAnim = gsap.to(wardekaTextRef.current, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "#wardeka-section",
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });
    }

    let vrFadeAnim: gsap.core.Tween | undefined;
    if (vrTextRef.current) {
      gsap.set(vrTextRef.current, { opacity: 0, y: 24 });
      vrFadeAnim = gsap.to(vrTextRef.current, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "#vr-section",
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });
    }

    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      trigger.kill();
      bgTrigger.kill();
      wardekaTrigger.kill();
      vrTrigger.kill();
      fadeAnim?.scrollTrigger?.kill();
      fadeAnim?.kill();
      vrFadeAnim?.scrollTrigger?.kill();
      vrFadeAnim?.kill();
      cancelAnimationFrame(raf);
    };
  }, [mainVisible]);

  const handleLoadingComplete = () => {
    setMainVisible(true);
    setTimeout(() => setIsLoading(false), 400);
  };

  return (
    <>
      {isLoading && <RocketLoader onComplete={handleLoadingComplete} />}

      <div
        ref={mainRef}
        style={{
          opacity: mainVisible ? 1 : 0,
          transition: "opacity 1.2s ease-in-out",
          pointerEvents: mainVisible ? "auto" : "none",
        }}
      >
        <SmoothScroll>
          <SpaceCanvas scrollProgressRef={scrollProgressRef} bgScrollRef={bgScrollRef} />
          <Navbar />
          <SpiderCreature scrollProgressRef={scrollProgressRef} />
          <CustomCursor />

          <main className="relative z-10 w-full min-h-[220vh]">
            {/* SECTION 1: HERO OVERLAY */}
            <section className="relative flex h-screen w-full flex-col items-center justify-center px-6 overflow-hidden">
              <div
                ref={heroRef}
                className="flex flex-col items-center text-center select-none"
                style={{ willChange: "opacity, transform" }}
              >
                <div className="absolute -z-10 h-64 w-64 rounded-full bg-cyan-glow/10 blur-[100px] pointer-events-none" />
                <div className="absolute -z-10 h-64 w-64 translate-x-20 translate-y-10 rounded-full bg-nebula-purple/15 blur-[120px] pointer-events-none" />

                <span className="text-[11px] font-bold tracking-[0.45em] uppercase text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)] mb-5 animate-pulse">
                  Next-Gen Game Studio
                </span>

                <h1 className="flex flex-col items-center mb-7 select-none">
                  <span className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-[0.25em] text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] uppercase leading-none">
                    Kawanua
                  </span>
                  <span className="font-display text-[10px] md:text-xs lg:text-sm font-bold tracking-[0.55em] text-amber-400 uppercase mt-4 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)] leading-none animate-pulse">
                    Virtual Teknologi
                  </span>
                </h1>

                <p className="max-w-md font-body text-sm md:text-base text-gray-200 font-normal tracking-wide leading-relaxed mb-12">
                  Architecting premium interactive 3D ecosystems and celestial
                  gameplay experiences.
                </p>

                <div className="flex flex-col items-center gap-3.5">
                  <span className="text-[9px] tracking-[0.35em] uppercase text-gray-500 font-medium">
                    Scroll to Explore
                  </span>
                  <div className="relative h-12 w-5.5 rounded-full border border-gray-800 flex justify-center p-1 bg-space-navy/20">
                    <div className="h-2 w-1.5 rounded-full bg-amber-400 animate-bounce" />
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION: WARDEKA EDONISIA */}
            <section id="wardeka-section" className="relative w-full h-[160vh]">
              <WardekaCanvas scrollProgressRef={wardekaProgressRef}>
                <div
                  ref={wardekaTextRef}
                  className="w-full h-full grid grid-cols-1 lg:grid-cols-12 px-6 md:px-16 lg:px-24 items-center pointer-events-none"
                  style={{ willChange: "opacity, transform" }}
                >
                  <div className="lg:col-span-6 xl:col-span-5 max-w-xl">
                    <span className="text-sm font-bold tracking-[0.35em] uppercase text-amber-400 mb-4 block">
                      Game Development · Esports
                    </span>

                    <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-5">
                      Wardeka <span className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]">Edonisia</span>
                    </h2>

                    <p className="font-body text-gray-100 text-base md:text-lg leading-relaxed mb-8">
                      Game esports shooter mobile pertama karya Indonesia,
                      dikembangkan Big Dade Interactive di bawah PT Kawanua
                      Virtual Teknologi.
                    </p>

                    {/* STAT CALLOUT: angka besar sebagai hook, sebelum narasi panjang */}
                    <div className="flex items-end gap-8 mb-8 border-l-2 border-amber-400/30 pl-5">
                      <div>
                        <p className="font-display text-3xl md:text-4xl font-bold text-white leading-none">
                          95%
                        </p>
                        <p className="text-xs text-gray-300 mt-1.5 max-w-[140px] leading-snug">
                          pasar game Indonesia (Rp33T) direbut developer asing
                        </p>
                      </div>
                      <div>
                        <p className="font-display text-3xl md:text-4xl font-bold text-amber-400 leading-none">
                          5%
                        </p>
                        <p className="text-xs text-gray-300 mt-1.5 max-w-[140px] leading-snug">
                          sisanya untuk developer lokal
                          <span className="text-gray-400">
                            {" "}
                            (detikINET, Apr 2025)
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="border-l-2 border-amber-400/30 pl-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-1.5">
                          Solusi
                        </p>
                        <p className="font-body text-gray-200 text-base leading-relaxed">
                          Game shooter dengan karakter, senjata, skin, dan
                          cerita bernuansa budaya Indonesia: arena futuristik,
                          karakter berbahasa Indonesia, enam ability unik (Fast,
                          Scan, Invisible, Heal, Shield, Stun), dirancang untuk
                          turnamen esports nasional & internasional.
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Spacer for 3D content on the right */}
                  <div className="hidden lg:block lg:col-span-6 xl:col-span-7" />
                </div>
              </WardekaCanvas>
            </section>

            {/* SECTION: VR EXPERIENCE */}
            <section id="vr-section" className="relative w-full h-[160vh]">
              <VRCanvas scrollProgressRef={vrProgressRef}>
                <div
                  ref={vrTextRef}
                  className="w-full h-full grid grid-cols-1 lg:grid-cols-12 px-6 md:px-16 lg:px-24 items-center pointer-events-none"
                  style={{ willChange: "opacity, transform" }}
                >
                  {/* Left spacer — VR 3D sits here */}
                  <div className="hidden lg:block lg:col-span-6 xl:col-span-7" />

                  {/* Right column — text content */}
                  <div className="lg:col-span-6 xl:col-span-5 max-w-xl">
                    <span className="text-sm font-bold tracking-[0.35em] uppercase text-violet-400 mb-4 block">
                      VR · Immersive Technology
                    </span>

                    <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-5">
                      Virtual{" "}
                      <span className="text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]">
                        Reality
                      </span>
                    </h2>

                    <p className="font-body text-gray-100 text-base md:text-lg leading-relaxed mb-8">
                      Melampaui batas layar dengan teknologi Virtual Reality
                      yang dikembangkan oleh Kawanua Virtual Teknologi.
                      Pengalaman gaming dan simulasi yang benar-benar imersif
                      dan menghadirkan dunia digital ke hadapan Anda secara nyata.
                    </p>

                    <div className="flex items-end gap-8 mb-8 border-l-2 border-violet-400/30 pl-5">
                      <div>
                        <p className="font-display text-3xl md:text-4xl font-bold text-white leading-none">
                          360°
                        </p>
                        <p className="text-xs text-gray-300 mt-1.5 max-w-[130px] leading-snug">
                          field of view immersive experience
                        </p>
                      </div>
                      <div>
                        <p className="font-display text-3xl md:text-4xl font-bold text-violet-400 leading-none">
                          6DoF
                        </p>
                        <p className="text-xs text-gray-300 mt-1.5 max-w-[130px] leading-snug">
                          degrees of freedom tracking
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="border-l-2 border-violet-400/30 pl-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-1.5">
                          Fitur Utama
                        </p>
                        <p className="font-body text-gray-200 text-base leading-relaxed">
                          Headset ringan dengan display resolusi tinggi, hand
                          tracking tanpa controller, dan integrasi penuh dengan
                          ekosistem game Wardeka Edonisia untuk mode turnamen VR.
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-6 italic">
                      ✦ Drag the headset on the left to rotate it 360°
                    </p>
                  </div>
                </div>
              </VRCanvas>
            </section>

            {/* SECTION: TRANSITION & DEMO CARD */}
            <section className="relative flex min-h-screen w-full items-center justify-center px-6 py-24 bg-transparent">
              <div className="glassmorphism max-w-3xl w-full p-10 md:p-14 rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 to-nebula-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <span className="text-xs font-bold tracking-[0.35em] uppercase text-amber-400 mb-4 block">
                  01 // The Odyssey
                </span>

                <h2 className="font-display text-3xl md:text-5xl font-bold tracking-wide text-white mb-6">
                  Experiences Shaped in Deep Space.
                </h2>

                <p className="font-body text-gray-200 text-base md:text-lg font-normal leading-relaxed mb-8">
                  We push the boundaries of real-time WebGL and game engine
                  technologies to build immersive, high-performance interactive
                  portals. Hover the cursor to watch the alien constellation
                  creature adapt its energy tentacles to local space coordinates
                  in real-time.
                </p>

                <div className="w-16 h-[2px] bg-gradient-to-r from-amber-400 to-nebula-purple" />
              </div>
            </section>
          </main>
        </SmoothScroll>
      </div>
    </>
  );
}
