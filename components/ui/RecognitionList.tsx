"use client";

import { RECOGNITIONS } from "@/lib/awardsData";

export default function RecognitionList() {
  return (
    // Dibuat plain, tanpa scroll dan tanpa card box sama sekali. Ini
    // sengaja beda gaya dari AwardsCanvas di atasnya, yang pakai border,
    // backdrop blur, dan warna amber yang mencolok. Di sini, warnanya abu
    // muted dan tanpa border, jadi kebaca sebagai info pelengkap, bukan
    // section utama yang setara dengan Awards.
    <section
      aria-label="Pengakuan dan pencapaian tambahan"
      className="relative w-full px-6 md:px-16 lg:px-24 pt-2 pb-16"
    >
      <div className="max-w-4xl mx-auto text-center">
        <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-gray-500 mb-5 block">
          Pengakuan Lainnya
        </span>

        <ul
          className="flex flex-wrap justify-center gap-x-6 gap-y-3 list-none"
          role="list"
        >
          {RECOGNITIONS.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 text-xs sm:text-sm text-gray-400"
            >
              <span
                className="h-1 w-1 rounded-full bg-gray-500"
                aria-hidden="true"
              />
              {item.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
