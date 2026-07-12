"use client";

import { useEffect, useRef, useState } from "react";
import SpaceCanvas from "@/components/three/SpaceCanvas";
import WardekaCanvas from "@/components/three/WardekaCanvas";
import VRCanvas from "@/components/three/VRCanvas";
import AwardsCanvas from "@/components/three/AwardsCanvas";
import CustomCursor from "@/components/ui/CustomCursor";
import SpiderCreature from "@/components/ui/SpiderCreature";
import SmoothScroll from "@/components/ui/SmoothScroll";
import RocketLoader from "@/components/ui/RocketLoader";
import Navbar from "@/components/ui/Navbar";
import RecognitionList from "@/components/ui/RecognitionList";
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
      wardekaFadeTrigger.kill();
      vrTrigger.kill();
      awardsTrigger.kill();
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
                      Wardeka{" "}
                      <span className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]">
                        Edonisia
                      </span>
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
                      EdTech · VR Simulation
                    </span>

                    <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-5">
                      Interactive Learning{" "}
                      <span className="text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]">
                        Nusa Space
                      </span>
                    </h2>

                    <p className="font-body text-gray-100 text-base md:text-lg leading-relaxed mb-8">
                      Simulasi edukasi interaktif berbasis PC dan VR bertema
                      eksplorasi luar angkasa, disusun oleh Big Dade Interactive
                      di bawah PT Kawanua Virtual Teknologi. Pengguna menjalani
                      misi berjenjang dari lokasi peluncuran hingga orbit
                      Stasiun Luar Angkasa Internasional (ISS), lengkap dengan
                      Player HUD dan panel progres.
                    </p>

                    <div className="flex items-end gap-8 mb-8 border-l-2 border-violet-400/30 pl-5">
                      <div>
                        <p className="font-display text-3xl md:text-4xl font-bold text-white leading-none">
                          3
                        </p>
                        <p className="text-xs text-gray-300 mt-1.5 max-w-[130px] leading-snug">
                          fase misi, dari landasan peluncuran hingga orbit ISS
                        </p>
                      </div>
                      <div>
                        <p className="font-display text-3xl md:text-4xl font-bold text-violet-400 leading-none">
                          98
                        </p>
                        <p className="text-xs text-gray-300 mt-1.5 max-w-[130px] leading-snug">
                          contoh skor evaluasi akhir, grade A (22/23 benar)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="border-l-2 border-violet-400/30 pl-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-1.5">
                          Fitur Utama
                        </p>
                        <p className="font-body text-gray-200 text-base leading-relaxed">
                          Object Inspector untuk merotasi, zoom, dan membongkar
                          (dismantle) model 3D seperti roket Falcon Heavy,
                          satelit, dan modul ISS (Columbus/ESA, JPM/JAXA, Lab AS
                          Destiny). Dilengkapi kuis interaktif per fase, login
                          ID pengguna untuk tracking progres dan skor, serta
                          mendukung mode PC dan VR.
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-6 italic">
                      ✦ Seret objek di sebelah kiri untuk memutarnya 360°
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
