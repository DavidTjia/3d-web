"use client";

import AwardCard from "@/components/ui/AwardCard";
import { FEATURED_AWARDS } from "@/lib/awardsData";

interface AwardsCanvasProps {
  scrollProgressRef: React.RefObject<number>;
}

type Accent = "fuchsia" | "violet" | "emerald";
const ACCENTS: Accent[] = ["fuchsia", "violet", "emerald"];

export default function AwardsCanvas({}: AwardsCanvasProps) {
  return (
    <div className="relative w-full py-24 px-6 md:px-12 lg:px-20 overflow-hidden">
      {/* Judul besar transparan di belakang card — dekoratif murni */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
        aria-hidden="true"
      >
        <h2 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold text-white/[0.05] text-center leading-tight select-none">
          Penghargaan
          <br />
          &amp; Pengakuan
        </h2>
      </div>

      {/* Heading asli yang accessible */}
      <div className="relative z-10 text-center mb-14">
        <span className="text-sm font-bold tracking-[0.35em] uppercase text-emerald-400 mb-3 block">
          Recognition · Achievement
        </span>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
          Pengakuan Formal atas Karya Kami
        </h2>
      </div>

      {/* Backdrop tipis di belakang area card — menjaga kontras teks
          terhadap grid lantai neon + judul transparan di belakangnya. */}
      <div className="relative">
        <div
          className="pointer-events-none absolute -inset-x-6 -inset-y-6 rounded-[2rem] bg-black/25 backdrop-blur-[2px] -z-[1]"
          aria-hidden="true"
        />

        {/* flex + justify-center (bukan grid) — kunci supaya baris terakhir
            yang isinya cuma 2 card ikut ter-center, bukan rata kiri dengan
            ruang kosong nanggung di kanan. gap-y dilebihkan supaya antar
            baris tetap aman meski tinggi card #3 sedikit beda (judul 2 baris). */}
        <div className="relative z-10 flex flex-wrap justify-center gap-x-6 gap-y-10 max-w-5xl mx-auto">
          {FEATURED_AWARDS.map((award, i) => (
            <div
              key={award.id}
              className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
            >
              <AwardCard
                award={award}
                accent={ACCENTS[i % ACCENTS.length]}
                index={i}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
