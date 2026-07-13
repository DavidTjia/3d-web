"use client";

import { useEffect, useRef, useState } from "react";
import type { FeaturedAward } from "@/lib/awardsData";

type Accent = "fuchsia" | "violet" | "emerald";

interface AwardCardProps {
  award: FeaturedAward;
  accent: Accent;
  index: number;
}

type AccentStyle = {
  border: string;
  text: string;
  ring: string;
  glowRgb: string;
  badgeBg: string;
};

const FUCHSIA_STYLE: AccentStyle = {
  border:
    "border-fuchsia-400/25 hover:border-fuchsia-400/70 focus-visible:border-fuchsia-400/70",
  text: "text-fuchsia-400",
  ring: "focus-visible:ring-fuchsia-400",
  glowRgb: "232,58,187",
  badgeBg: "bg-fuchsia-400/10",
};

const VIOLET_STYLE: AccentStyle = {
  border:
    "border-violet-400/25 hover:border-violet-400/70 focus-visible:border-violet-400/70",
  text: "text-violet-400",
  ring: "focus-visible:ring-violet-400",
  glowRgb: "167,139,250",
  badgeBg: "bg-violet-400/10",
};

const EMERALD_STYLE: AccentStyle = {
  border:
    "border-emerald-400/25 hover:border-emerald-400/70 focus-visible:border-emerald-400/70",
  text: "text-emerald-400",
  ring: "focus-visible:ring-emerald-400",
  glowRgb: "52,211,153",
  badgeBg: "bg-emerald-400/10",
};

function getAccentStyle(accent: Accent): AccentStyle {
  if (accent === "fuchsia") return FUCHSIA_STYLE;
  if (accent === "violet") return VIOLET_STYLE;
  return EMERALD_STYLE;
}

export default function AwardCard({ award, accent, index }: AwardCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(
    "perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)",
  );
  const [spot, setSpot] = useState({ x: 50, y: 50, active: false });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const s = getAccentStyle(accent);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 12;
    const rotateX = (0.5 - py) * 12;
    setTransform(
      `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`,
    );
    setSpot({ x: px * 100, y: py * 100, active: true });
  };

  const resetTilt = () => {
    setTransform("perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)");
    setSpot((prev) => ({ ...prev, active: false }));
  };

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      role="group"
      aria-label={`${award.title}, diberikan oleh ${award.grantor}${
        award.year ? `, ${award.year}` : ""
      }`}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onFocus={() => setSpot({ x: 50, y: 50, active: true })}
      onBlur={resetTilt}
      style={{
        transform,
        transitionProperty: "transform, border-color",
        transitionDuration: "200ms",
        transitionTimingFunction: "ease-out",
      }}
      className={`group relative h-full min-h-[190px] rounded-xl border ${s.border} bg-space-navy/50 backdrop-blur-md p-6 flex flex-col gap-2.5 overflow-hidden outline-none focus-visible:ring-2 ${s.ring} ring-offset-2 ring-offset-black`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: spot.active ? 1 : 0,
          background: `radial-gradient(circle at ${spot.x}% ${spot.y}%, rgba(${s.glowRgb},0.18), transparent 60%)`,
        }}
      />

      <span
        className={`relative w-fit text-[10px] font-bold tracking-[0.25em] uppercase ${s.badgeBg} ${s.text} px-2.5 py-1 rounded-full`}
      >
        Award #{index + 1}
      </span>

      <h3 className="relative font-display text-lg md:text-xl font-bold text-white leading-snug line-clamp-2">
        {award.title}
      </h3>

      <p
        className={`relative text-xs uppercase tracking-[0.15em] ${s.text} line-clamp-1`}
      >
        {award.grantor}
        {award.year ? ` · ${award.year}` : ""}
      </p>

      <p className="relative font-body text-gray-300 text-sm leading-relaxed line-clamp-3">
        {award.description}
      </p>
    </div>
  );
}
