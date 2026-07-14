"use client";

import { useEffect, useRef } from "react";
import SpaceCanvas from "@/components/three/SpaceCanvas";
import WardekaCanvas from "@/components/three/WardekaCanvas";
import VRCanvas from "@/components/three/VRCanvas";
import AwardsCanvas from "@/components/three/AwardsCanvas";
import CustomCursor from "@/components/ui/CustomCursor";
import SpiderCreature from "@/components/ui/SpiderCreature";
import SmoothScroll from "@/components/ui/SmoothScroll";
import Navbar from "@/components/ui/Navbar";
import RecognitionList from "@/components/ui/RecognitionList";
import ContactSection from "@/components/ui/ContactSection";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Fade in di awal, tetap penuh di tengah, fade out sebelum habis.
// fadeInEnd/fadeOutStart dalam skala progress trigger-nya sendiri (0-1),
// bukan skala scroll section, makanya butuh trigger terpisah dari 3D.
function getFadeInOut(progress: number, fadeInEnd = 0.18, fadeOutStart = 0.85) {
  let opacity = 1;
  if (progress <= fadeInEnd) {
    opacity = progress / fadeInEnd;
  } else if (progress >= fadeOutStart) {
    opacity = 1 - (progress - fadeOutStart) / (1 - fadeOutStart);
  }
  opacity = Math.max(0, Math.min(1, opacity));
  const translateY = (1 - opacity) * 24;
  return { opacity, translateY };
}

export default function Home() {
  const scrollProgressRef = useRef<number>(0);
  const wardekaProgressRef = useRef<number>(0);
  const vrProgressRef = useRef<number>(0);
  const awardsProgressRef = useRef<number>(0);
  // Full-page 0→1 scroll progress used exclusively by SpaceCanvas background camera
  const bgScrollRef = useRef<number>(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const wardekaTextRef = useRef<HTMLDivElement>(null);
  const vrTextRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // Controls loading vs main experience visibility
  // Loading overlay removed — show main immediately so user can click.
  const mainVisible = true;

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

    // Progress KHUSUS buat fade in/out TEKS — rentang jauh lebih lebar,
    // dari section mulai kelihatan di bawah layar sampai section sepenuhnya
    // keluar dari atas layar. Ini yang bikin fade-in kerasa "pas waktu",
    // bukan nunggu section pin dulu baru muncul.
    const wardekaFadeTrigger = ScrollTrigger.create({
      trigger: "#wardeka-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        if (wardekaTextRef.current) {
          const { opacity, translateY } = getFadeInOut(self.progress);
          wardekaTextRef.current.style.opacity = opacity.toString();
          wardekaTextRef.current.style.transform = `translate3d(0, ${translateY}px, 0)`;
        }
      },
    });

    // FIX: section VR sebelumnya gak punya trigger buat update progress-nya
    // sendiri, jadi vrProgressRef.current selalu 0 dan objek 3D VR gak
    // pernah react ke scroll sama sekali.
    const vrTrigger = ScrollTrigger.create({
      trigger: "#vr-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        vrProgressRef.current = self.progress;
      },
    });

    // Progress khusus buat section Awards & Recognition (constellation drift)
    const awardsTrigger = ScrollTrigger.create({
      trigger: "#awards-section",
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        awardsProgressRef.current = self.progress;
      },
    });

    if (vrTextRef.current) {
      gsap.set(vrTextRef.current, { opacity: 0, y: 24 });
      gsap.to(vrTextRef.current, {
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
      wardekaFadeTrigger.kill();
      vrTrigger.kill();
      awardsTrigger.kill();
      cancelAnimationFrame(raf);
    };
  }, [mainVisible]);

  // loading removed; no handler needed

  return (
    <>
      {/* loading overlay removed */}

      <div
        ref={mainRef}
        style={{
          opacity: mainVisible ? 1 : 0,
          transition: "opacity 1.2s ease-in-out",
          pointerEvents: mainVisible ? "auto" : "none",
        }}
      >
        <SmoothScroll>
          <SpaceCanvas
            scrollProgressRef={scrollProgressRef}
            bgScrollRef={bgScrollRef}
          />
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
                <div className="absolute -z-10 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[100px] pointer-events-none" />
                <div className="absolute -z-10 h-64 w-64 translate-x-20 translate-y-10 rounded-full bg-violet-500/15 blur-[120px] pointer-events-none" />

                <span className="text-[11px] font-bold tracking-[0.45em] uppercase text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,58,187,0.4)] mb-5 animate-pulse">
                  Next-Gen Game Studio
                </span>

                <h1 className="flex flex-col items-center mb-7 select-none">
                  <span className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-[0.25em] text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] uppercase leading-none">
                    Kawanua
                  </span>
                  <span className="font-display text-[10px] md:text-xs lg:text-sm font-bold tracking-[0.55em] text-emerald-400 uppercase mt-4 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)] leading-none animate-pulse">
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
                    <div className="h-2 w-1.5 rounded-full bg-emerald-400 animate-bounce" />
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION: WARDEKA EDONISIA */}
            <section id="wardeka-section" className="relative w-full h-[160vh]">
              <WardekaCanvas scrollProgressRef={wardekaProgressRef}>
                <div
                  ref={wardekaTextRef}
                  className="w-full h-full grid grid-cols-1 lg:grid-cols-12 px-6 md:px-16 lg:px-24 items-center pointer-events-none gap-8"
                  style={{ willChange: "opacity, transform" }}
                >
                  {/* Left Column — Header and Intro */}
                  <div className="lg:col-span-4 pointer-events-auto max-w-sm flex flex-col justify-center">
                    <span className="text-[10px] font-bold tracking-[0.35em] uppercase text-fuchsia-400 mb-2 block animate-pulse">
                      Game Development · Esports
                    </span>

                    <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
                      Wardeka{" "}
                      <span className="text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,58,187,0.4)]">
                        Edonisia
                      </span>
                    </h2>

                    <p className="font-body text-gray-300 text-xs md:text-sm leading-relaxed mb-5">
                      Game esports shooter mobile pertama karya Indonesia,
                      dikembangkan Big Dade Interactive di bawah PT Kawanua
                      Virtual Teknologi.
                    </p>

                    {/* STAT CALLOUT */}
                    <div className="flex items-end gap-6 border-l-2 border-fuchsia-400/30 pl-4">
                      <div>
                        <p className="font-display text-xl md:text-2xl font-bold text-white leading-none">
                          95%
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-[110px] leading-snug">
                          pasar game Indonesia (Rp33T) direbut developer asing
                        </p>
                      </div>
                      <div>
                        <p className="font-display text-xl md:text-2xl font-bold text-fuchsia-400 leading-none">
                          5%
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-[110px] leading-snug">
                          sisanya untuk developer lokal <span className="text-gray-500">(detikINET, Apr 2025)</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Center Spacer — 3D Model sits here */}
                  <div className="hidden lg:block lg:col-span-4" />

                  {/* Right Column — Solution Details */}
                  <div className="lg:col-span-4 pointer-events-auto max-w-sm flex flex-col justify-center">
                    <div className="space-y-4">
                      <div className="border-l-2 border-fuchsia-400/30 pl-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1.5">
                          Solusi
                        </p>
                        <p className="font-body text-gray-300 text-xs md:text-sm leading-relaxed">
                          Game shooter dengan karakter, senjata, skin, dan
                          cerita bernuansa budaya Indonesia: arena futuristik,
                          karakter berbahasa Indonesia, enam ability unik (Fast,
                          Scan, Invisible, Heal, Shield, Stun), dirancang untuk
                          turnamen esports nasional & internasional.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </WardekaCanvas>
            </section>

            {/* SECTION: VR EXPERIENCE */}
            <section id="vr-section" className="relative w-full h-[160vh]">
              <VRCanvas scrollProgressRef={vrProgressRef}>
                <div
                  ref={vrTextRef}
                  className="w-full h-full grid grid-cols-1 lg:grid-cols-12 px-6 md:px-16 lg:px-24 items-center pointer-events-none gap-8"
                  style={{ willChange: "opacity, transform" }}
                >
                  {/* Left Column — Header and Intro */}
                  <div className="lg:col-span-4 pointer-events-auto max-w-sm flex flex-col justify-center">
                    <span className="text-[10px] font-bold tracking-[0.35em] uppercase text-violet-400 mb-2 block animate-pulse">
                      EdTech · VR Simulation
                    </span>

                    <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
                      Interactive Learning{" "}
                      <span className="text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]">
                        Nusa Space
                      </span>
                    </h2>

                    <p className="font-body text-gray-300 text-xs md:text-sm leading-relaxed mb-5">
                      Simulasi edukasi interaktif berbasis PC dan VR bertema eksplorasi luar angkasa, disusun oleh Big Dade Interactive di bawah PT Kawanua Virtual Teknologi.
                    </p>

                    {/* STAT CALLOUT */}
                    <div className="flex items-end gap-6 border-l-2 border-violet-400/30 pl-4">
                      <div>
                        <p className="font-display text-xl md:text-2xl font-bold text-white leading-none">
                          3
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-[110px] leading-snug">
                          fase misi luar angkasa
                        </p>
                      </div>
                      <div>
                        <p className="font-display text-xl md:text-2xl font-bold text-violet-400 leading-none">
                          98
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-[110px] leading-snug">
                          skor evaluasi akhir (Grade A)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Center Spacer — 3D Model sits here */}
                  <div className="hidden lg:block lg:col-span-4" />

                  {/* Right Column — Features and Info */}
                  <div className="lg:col-span-4 pointer-events-auto max-w-sm flex flex-col justify-center">
                    <div className="space-y-4">
                      <div className="border-l-2 border-violet-400/30 pl-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1.5">
                          Fitur Utama
                        </p>
                        <p className="font-body text-gray-300 text-xs md:text-sm leading-relaxed">
                          Object Inspector untuk merotasi, zoom, dan membongkar (dismantle) model 3D seperti roket Falcon Heavy, satelit, dan modul ISS. Dilengkapi kuis interaktif, login ID tracking progres, dan mendukung PC/VR.
                        </p>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-500 mt-5 italic">
                      ✦ Seret objek di tengah untuk memutarnya 360°
                    </p>
                  </div>
                </div>
              </VRCanvas>
            </section>

            {/* SECTION: AWARDS & RECOGNITION */}
            {/* CATATAN: sebelumnya section ini pakai h-[160vh] (pola yang
                cocok buat WardekaCanvas/VRCanvas yang sticky-pinned selama
                scroll, sehingga butuh "jalur scroll" panjang buat animasi
                3D-nya jalan). AwardsCanvas TIDAK sticky-pinned — tingginya
                mengikuti konten sendiri (lihat AwardsCanvas.tsx: div
                pembungkus "relative w-full" tanpa tinggi tetap, Canvas 3D
                absolute inset-0 mengikuti tinggi itu). Height paksa 160vh
                itu jauh lebih tinggi dari konten aslinya (~600-700px),
                sehingga menyisakan ruang kosong besar di bawah konten
                sebelum RecognitionList mulai — INI penyebab jarak yang
                terasa jauh banget. Dihapus supaya tinggi section murni
                mengikuti konten & jaraknya rapat ke RecognitionList. */}
            <section id="awards-section" className="relative w-full">
              <AwardsCanvas scrollProgressRef={awardsProgressRef} />
            </section>

            {/* Milestone/recognition tambahan — statis, alur scroll normal,
                bukan di dalam sticky canvas. Lihat rationale HCI di
                RecognitionList.tsx. */}
            <RecognitionList />

            {/* SECTION: CONTACT (replaces bottom demo card) */}
            <ContactSection />
          </main>
        </SmoothScroll>
      </div>
    </>
  );
}
