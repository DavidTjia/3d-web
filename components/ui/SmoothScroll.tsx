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
      duration: 1.6, // Soft, heavy scroll feeling
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom premium deceleration curve
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    // Update ScrollTrigger on Lenis scroll
    lenis.on("scroll", ScrollTrigger.update);

    // Frame ticker loop for Lenis
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Refresh sekali di awal (biar langsung ada perhitungan dasar)
    ScrollTrigger.refresh();

    // Refresh lagi setelah window benar-benar selesai load (font, gambar, canvas, dll)
    // Ini yang nge-fix masalah "baru muncul pas buka DevTools" —
    // karena tanpa ini, ScrollTrigger keburu ngukur posisi section sebelum semua konten final.
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
      cancelAnimationFrame(rafId);
      window.removeEventListener("load", handleLoad);
      clearTimeout(delayedRefresh);
    };
  }, []);

  return <>{children}</>;
}
