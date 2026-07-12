"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import AchievementConstellation from "./AchievementConstellation";
import AwardCard from "@/components/ui/AwardCard";
import { FEATURED_AWARDS } from "@/lib/awardsData";

interface AwardsCanvasProps {
  scrollProgressRef: React.RefObject<number>;
}

export default function AwardsCanvas({ scrollProgressRef }: AwardsCanvasProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  // Selalu ada satu item terpilih (default index 0) — menghindari empty state
  // yang bikin user bingung harus ngapain di awal.
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Lazy initializer: nilai awal dihitung sekali saat mount, bukan lewat
  // setState di body effect (React Compiler melarang pola itu karena bisa
  // memicu cascading render).
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  // AwardCard di bawah tetap menampilkan preview saat hover (UX cepat &
  // reversible), tapi node 3D sekarang membedakan hover vs selected secara
  // visual sendiri-sendiri — lihat AchievementConstellation.
  const previewIndex = hoverIndex ?? selectedIndex;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    // Container TANPA tinggi tetap — tingginya ditentukan oleh konten normal
    // (heading + card + list) yang mengalir di bawah ini. Canvas 3D
    // ditempatkan absolute inset-0 supaya otomatis mengisi seluruh tinggi
    // itu, jadi constellation "mengelilingi" konten di semua sisi, bukan
    // section terpisah di atas/bawah lagi.
    // CATATAN: sempat dicoba tambah min-h di sini sebagai "pengaman", tapi
    // itu justru bikin section punya tinggi minimum yang lebih besar dari
    // konten aslinya — hasilnya ruang kosong nganggur di bawah sebelum
    // RecognitionList, bukan penyempit. Dihapus karena sudah tidak perlu:
    // AwardCard sekarang fixed height (lihat AwardCard.tsx), jadi tinggi
    // section ini otomatis stabil murni dari flow kontennya sendiri.
    <div className="relative w-full">
      <div className="absolute inset-0 -z-0">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 45 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          dpr={[1, 1.5]}
          className="!absolute inset-0"
        >
          <ambientLight intensity={0.5} color="#88aaff" />
          <directionalLight position={[3, 4, 5]} intensity={1.2} />
          <pointLight position={[-4, 2, -3]} intensity={3} color="#00d2ff" />
          <Suspense fallback={null}>
            <AchievementConstellation
              scrollProgressRef={scrollProgressRef}
              hoverIndex={hoverIndex}
              selectedIndex={selectedIndex}
              reducedMotion={reducedMotion}
              onNodeHover={setHoverIndex}
              onNodeClick={setSelectedIndex}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Konten HTML normal flow, di atas Canvas (z-10) — inilah yang
          menentukan tinggi section secara keseluruhan. Constellation kiri
          (index 0,1,2) & kanan (index 3,4) otomatis muncul di celah kiri
          dan kanan konten ini karena posisi node sudah dirancang punya
          celah kosong di X≈-1.0..1.0.

          py-24/pb-32 (naik dari pt-16/pb-6) sengaja dipakai untuk menambah
          jarak vertikal ekstra antara area constellation 3D dan blok
          konten (heading/card/list) — sebelumnya kerasa terlalu mepet. */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-8">
        <span className="text-sm font-bold tracking-[0.35em] uppercase text-amber-400 mb-3 block">
          Recognition · Achievement
        </span>
        <h2 className="font-display text-3xl md:text-5xl font-bold text-white">
          Penghargaan{" "}
          <span className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]">
            &amp; Pengakuan
          </span>
        </h2>
      </div>

      {/* max-w-lg (turun dari max-w-xl) + padding horizontal ditambah agar
          card & list tombol lebih "menjauh" dari tepi, memberi jarak
          ekstra terhadap klaster constellation kiri/kanan yang sekarang
          juga sudah digeser lebih jauh (lihat LEFT_X_CENTER/RIGHT_X_CENTER
          di AchievementConstellation.tsx). */}
      <div className="relative z-10 max-w-lg mx-auto px-8 md:px-4 pb-8">
        <AwardCard activeIndex={previewIndex} />

        <div
          className="flex flex-wrap justify-center gap-2 mt-4"
          role="list"
          aria-label="Daftar penghargaan unggulan"
        >
          {FEATURED_AWARDS.map((award, i) => {
            const isSelected = selectedIndex === i;
            const isHovered = hoverIndex === i && !isSelected;
            return (
              <button
                key={award.id}
                type="button"
                role="listitem"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                onFocus={() => setHoverIndex(i)}
                onBlur={() => setHoverIndex(null)}
                onClick={() => setSelectedIndex(i)}
                aria-current={isSelected}
                className={`flex items-center gap-2.5 min-h-[44px] text-xs md:text-sm px-4 py-2.5 rounded-full border text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isSelected
                    ? "border-amber-400 text-amber-300 bg-amber-400/10"
                    : isHovered
                      ? "border-cyan-glow/60 text-white bg-space-navy/60 backdrop-blur-sm"
                      : "border-cyan-glow/25 text-gray-300 bg-space-navy/40 backdrop-blur-sm hover:border-cyan-glow/50"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${
                    isSelected
                      ? "bg-amber-400 text-space-navy"
                      : isHovered
                        ? "bg-white/20 text-white"
                        : "bg-white/10 text-gray-300"
                  }`}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                {award.title}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
