"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize Lenis
    const lenis = new Lenis({
      // Duration diturunkan dari 1.6 ke 1.1 — Lenis 1.6 itu berat/lambat,
      // gabungan sama section yang panjang bikin scroll kerasa "harus jauh banget"
      // sebelum konten kelihatan bergerak. 1.1 masih smooth tapi jauh lebih responsif.
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom premium deceleration curve
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    // Update ScrollTrigger tiap kali Lenis scroll
    lenis.on("scroll", ScrollTrigger.update);

    // Pakai gsap.ticker sebagai satu-satunya "clock" buat Lenis & GSAP,
    // bukan requestAnimationFrame manual terpisah — biar keduanya sinkron
    // di frame yang sama persis.
    function raf(time: number) {
      lenis.raf(time * 1000);
    }
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Refresh sekali di awal (biar langsung ada perhitungan dasar)
    ScrollTrigger.refresh();

    // Refresh lagi setelah window benar-benar selesai load (font, gambar, canvas, dll)
    const handleLoad = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener("load", handleLoad);

    // Refresh tambahan sekali lagi setelah delay kecil, buat jaga-jaga
    // kalau ada konten async (Three.js canvas, Suspense) yang selesai mount belakangan
    const delayedRefresh = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    // Clean up on unmount
    return () => {
      lenis.destroy();
      gsap.ticker.remove(raf);
      window.removeEventListener("load", handleLoad);
      clearTimeout(delayedRefresh);
    };
  }, []);

  return <>{children}</>;
}
