"use client";

import { RECOGNITIONS } from "@/lib/awardsData";

export default function RecognitionList() {
  return (
    <section
      aria-label="Pengakuan dan pencapaian tambahan"
      className="relative w-full px-6 md:px-16 lg:px-24 py-20"
    >
      <div className="max-w-4xl mx-auto">
        <span className="text-xs font-bold tracking-[0.35em] uppercase text-amber-400 mb-3 block text-center">
          Pengakuan Lainnya
        </span>
        <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-10 text-center">
          Milestone &amp; Apresiasi
        </h3>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none">
          {RECOGNITIONS.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-lg border border-cyan-glow/15 bg-space-navy/30 backdrop-blur-sm p-4"
            >
              <span
                className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"
                aria-hidden="true"
              />
              <p className="font-body text-sm md:text-base text-gray-200 leading-relaxed">
                {item.text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
