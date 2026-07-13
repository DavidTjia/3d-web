"use client";

import { useId, useState } from "react";
import { RECOGNITIONS } from "@/lib/awardsData";

const INITIAL_VISIBLE = 3;

export default function RecognitionList() {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  const hasMore = RECOGNITIONS.length > INITIAL_VISIBLE;
  const visibleItems = expanded
    ? RECOGNITIONS
    : RECOGNITIONS.slice(0, INITIAL_VISIBLE);
  const hiddenCount = RECOGNITIONS.length - INITIAL_VISIBLE;

  return (
    // Tetap plain, tanpa card box. Sengaja beda gaya dari AwardsCanvas di
    // atasnya, jadi kebaca sebagai info pelengkap, bukan section utama.
    <section
      aria-label="Pengakuan dan pencapaian tambahan"
      className="relative w-full px-6 md:px-16 lg:px-24 pt-2 pb-16"
    >
      <div className="max-w-4xl mx-auto text-center">
        <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-gray-500 mb-5 block">
          Pengakuan Lainnya
        </span>

        <ul
          id={listId}
          className="flex flex-wrap justify-center gap-x-6 gap-y-3 list-none"
          role="list"
        >
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 animate-in fade-in duration-300"
            >
              <span
                className="h-1 w-1 rounded-full bg-gray-500 shrink-0"
                aria-hidden="true"
              />
              {item.text}
            </li>
          ))}
        </ul>

        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={listId}
            className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-emerald-400/80 hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-full px-3 py-1.5 transition-colors"
          >
            {expanded
              ? "Sembunyikan"
              : `Lihat ${hiddenCount} pengakuan lainnya`}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              <path
                d="M2.5 4.5L6 8L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
