"use client";

import { FEATURED_AWARDS } from "@/lib/awardsData";

interface AwardCardProps {
  activeIndex: number;
}

export default function AwardCard({ activeIndex }: AwardCardProps) {
  const award = FEATURED_AWARDS[activeIndex];

  return (
    // PENTING: h-[...] (tinggi TETAP), bukan min-h-[...] seperti sebelumnya.
    // Root cause bug "konstelasi gepeng saat pilih item 1": card ini dulu
    // pakai min-height, jadi kalau teks award tertentu lebih panjang
    // (misalnya grantor "Kementerian Komunikasi dan Informatika (Kominfo)"
    // di item index 0), card jadi lebih tinggi dari card award lain. Karena
    // Canvas 3D di AwardsCanvas.tsx bersifat `absolute inset-0` — tingginya
    // ngikutin tinggi total section (yang ditentukan oleh flow konten,
    // termasuk card ini) — setiap kali card berubah tinggi, tinggi Canvas
    // ikut berubah sementara lebarnya tetap. Itu mengubah aspect ratio
    // kamera Three.js dan bikin constellation kelihatan melebar/gepeng.
    //
    // Solusi: tinggi card dikunci fixed + line-clamp di title/grantor/
    // description supaya teks sepanjang apapun akan dipotong rapi (dengan
    // "…") ke jumlah baris yang sama persis, jadi tinggi card — dan tinggi
    // Canvas — TIDAK PERNAH berubah lagi berapa pun panjang teksnya.
    <div
      className="h-[172px] md:h-[180px] rounded-xl border border-cyan-glow/20 bg-space-navy/50 backdrop-blur-md p-6 flex flex-col justify-center overflow-hidden"
      aria-live="polite"
    >
      <h3 className="font-display text-xl md:text-2xl font-bold text-white mb-1.5 line-clamp-2">
        {award.title}
      </h3>
      <p className="text-xs uppercase tracking-[0.2em] text-amber-400 mb-3 line-clamp-1">
        {award.grantor}
        {award.year ? ` · ${award.year}` : ""}
      </p>
      <p className="font-body text-gray-200 text-sm md:text-base leading-relaxed line-clamp-3">
        {award.description}
      </p>
    </div>
  );
}
