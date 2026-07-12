"use client";

/**
 * SpiderCreature v3 — Local-only curved legs, no trailing ropes.
 *
 * Architecture (rebuilt from scratch):
 *  - A Map<starIndex, LegState> tracks all currently fading/active legs
 *  - Every frame: find stars inside ACTIVE_RADIUS → set targetAlpha=1
 *  - Every frame: all tracked stars outside radius → targetAlpha=0 → fast decay
 *  - Once alpha < threshold the entry is deleted from the Map entirely
 *  - Result: the cluster of legs is ALWAYS centered on the head. Nothing trails.
 *
 * Star sizes:
 *  - 90% tiny  (0.5–1.0 px), 8% medium (1.2–2.2 px), 2% bright (2.5–4.0 px)
 *
 * v3.1 update: menerima scrollProgressRef dari page.tsx supaya bisa fade-out
 * begitu user scroll keluar dari section hero, masuk ke section portfolio.
 */

import { useEffect, useRef } from "react";

// ─── Inline value noise ─────────────────────────────────────────────────
function hash2(x: number, y: number) {
  return (Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
}
function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}
function vnoise(x: number, y: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const fx = x - ix,
    fy = y - iy;
  const a = hash2(ix, iy),
    b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1),
    d = hash2(ix + 1, iy + 1);
  const ux = smoothstep(fx),
    uy = smoothstep(fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function snoise(x: number, y: number) {
  return vnoise(Math.abs(x), Math.abs(y)) * 2 - 1;
}

// ─── Config ─────────────────────────────────────────────────────────────
const STAR_COUNT = 1200;
const CLUSTER_COUNT = 14;
const ACTIVE_RADIUS = 220; // px — slightly increased to ensure legs find stars in all areas
const HEAD_LERP = 0.055;
const FADE_IN_STEP = 0.22;
const FADE_OUT_K = 0.38;
const MAX_LEGS = 18; // max simultaneous legs — prevents crowding
const HEAD_OFFSET_DIST = 90; // px — creature always stays this far from cursor

// ─── Types ───────────────────────────────────────────────────────────────
interface Star {
  x: number;
  y: number;
  r: number;
  tier: 0 | 1 | 2;
  phase: number;
  speed: number;
}

interface LegState {
  alpha: number;
  targetAlpha: number;
  bendAngle: number;
  bendMag: number;
  noiseFreq: number;
  noiseAmp: number;
  widthMul: number;
  opacityMul: number;
  seed: number;
}

let STARS: Star[] = [];

function gauss(mean: number, std: number) {
  const u = Math.random() + 1e-9;
  const v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildStars(W: number, H: number) {
  const centers = Array.from({ length: CLUSTER_COUNT }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    std: 60 + Math.random() * 140,
    w: 0.4 + Math.random() * 1.6,
  }));
  const totalW = centers.reduce((s, c) => s + c.w, 0);

  const clusteredCount = Math.floor(STAR_COUNT * 0.6);
  const uniformCount = STAR_COUNT - clusteredCount;
  const list: Star[] = [];

  // 1. Clustered stars (Gaussian distribution around random centers)
  for (let i = 0; i < clusteredCount; i++) {
    let r = Math.random() * totalW;
    let cl = centers[0];
    for (const c of centers) {
      r -= c.w;
      if (r <= 0) {
        cl = c;
        break;
      }
    }

    const x = Math.max(0, Math.min(W, gauss(cl.x, cl.std)));
    const y = Math.max(0, Math.min(H, gauss(cl.y, cl.std)));

    const roll = Math.random();
    let tier: 0 | 1 | 2, radius: number;
    if (roll < 0.96) {
      tier = 0;
      radius = 0.4 + Math.random() * 0.4;
    } else if (roll < 0.99) {
      tier = 1;
      radius = 1.0 + Math.random() * 1.0;
    } else {
      tier = 2;
      radius = 2.5 + Math.random() * 1.5;
    }

    list.push({
      x,
      y,
      r: radius,
      tier,
      phase: (i * 1.618033) % (Math.PI * 2),
      speed: 0.4 + Math.random() * 1.4,
    });
  }

  // 2. Uniform stars (distributed evenly to guarantee legs anywhere on screen)
  for (let i = 0; i < uniformCount; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;

    const roll = Math.random();
    let tier: 0 | 1 | 2, radius: number;
    if (roll < 0.96) {
      tier = 0;
      radius = 0.4 + Math.random() * 0.4;
    } else if (roll < 0.99) {
      tier = 1;
      radius = 1.0 + Math.random() * 1.0;
    } else {
      tier = 2;
      radius = 2.5 + Math.random() * 1.5;
    }

    list.push({
      x,
      y,
      r: radius,
      tier,
      phase: ((i + clusteredCount) * 1.618033) % (Math.PI * 2),
      speed: 0.4 + Math.random() * 1.4,
    });
  }

  STARS = list;
}

function qbez(
  ax: number,
  ay: number,
  cx: number,
  cy: number,
  bx: number,
  by: number,
  t: number,
): [number, number] {
  const mt = 1 - t;
  return [
    mt * mt * ax + 2 * mt * t * cx + t * t * bx,
    mt * mt * ay + 2 * mt * t * cy + t * t * by,
  ];
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  footX: number,
  footY: number,
  headX: number,
  headY: number,
  leg: LegState,
  t: number,
  stretchX = 0,
  stretchY = 0,
  speed = 0,
) {
  const dx = headX - footX,
    dy = headY - footY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 4) return;

  const baseAngle = Math.atan2(dy, dx) + Math.PI / 2 + leg.bendAngle;
  const reach = Math.max(dist * leg.bendMag, 40);

  const nx =
    snoise(t * leg.noiseFreq + leg.seed, leg.seed * 2.3) * leg.noiseAmp;
  const ny =
    snoise(leg.seed * 1.7, t * leg.noiseFreq + leg.seed * 0.5) * leg.noiseAmp;

  const elasticScale = Math.min(speed * 4, 1.0);
  const cpX =
    (footX + headX) / 2 +
    Math.cos(baseAngle) * reach +
    nx +
    stretchX * elasticScale;
  const cpY =
    (footY + headY) / 2 +
    Math.sin(baseAngle) * reach +
    ny +
    stretchY * elasticScale;

  const SEGS = 24;
  for (let s = 0; s < SEGS; s++) {
    const t0 = s / SEGS,
      t1 = (s + 1) / SEGS;
    const [x0, y0] = qbez(footX, footY, cpX, cpY, headX, headY, t0);
    const [x1, y1] = qbez(footX, footY, cpX, cpY, headX, headY, t1);

    // Opacity profile: fade out slightly near the center, very bright near the head and foot
    const env = Math.pow(t0, 0.55);
    const opacityEnv = 0.25 * (1.0 - t0) + env * 0.75;
    const a = leg.alpha * leg.opacityMul * (0.05 + opacityEnv * 0.95);
    if (a < 0.004) continue;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = `rgba(185,225,255,${a})`;

    // Thicken near foot (t0 -> 0) and head (t0 -> 1) for realistic anatomy
    const thicknessEnv = 0.55 * Math.pow(1.0 - t0, 1.5) + env * 1.75;
    ctx.lineWidth = leg.widthMul * (0.45 + thicknessEnv * 1.6);
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // ── Draw 3-layered glowing footpad circle at foot anchor ──
  const w = leg.alpha;
  const pulse = 1.0 + Math.sin(t * 5.0 + leg.seed) * 0.12;

  // Layer 1: Wide soft blue-violet aura (radius ~12px)
  const auraRad = 12 * w * pulse;
  if (auraRad > 0.5) {
    const gAura = ctx.createRadialGradient(
      footX,
      footY,
      0,
      footX,
      footY,
      auraRad,
    );
    gAura.addColorStop(0, `rgba(104, 136, 255, ${0.16 * w})`);
    gAura.addColorStop(0.5, `rgba(104, 136, 255, ${0.05 * w})`);
    gAura.addColorStop(1, "rgba(104, 136, 255, 0)");
    ctx.beginPath();
    ctx.arc(footX, footY, auraRad, 0, Math.PI * 2);
    ctx.fillStyle = gAura;
    ctx.fill();
  }

  // Layer 2: Tight blue-white glow halo (radius ~6px)
  const glowRad = 6.2 * w * pulse;
  if (glowRad > 0.5) {
    const gGlow = ctx.createRadialGradient(
      footX,
      footY,
      0,
      footX,
      footY,
      glowRad,
    );
    gGlow.addColorStop(0, `rgba(184, 232, 255, ${0.72 * w})`);
    gGlow.addColorStop(0.6, `rgba(184, 232, 255, ${0.25 * w})`);
    gGlow.addColorStop(1, "rgba(184, 232, 255, 0)");
    ctx.beginPath();
    ctx.arc(footX, footY, glowRad, 0, Math.PI * 2);
    ctx.fillStyle = gGlow;
    ctx.fill();
  }

  // Layer 3: Soft core (not solid white, but soft, blurry, semi-transparent blue-white)
  const coreRad = 2.8 * w * pulse;
  if (coreRad > 0.5) {
    const gCore = ctx.createRadialGradient(
      footX,
      footY,
      0,
      footX,
      footY,
      coreRad,
    );
    gCore.addColorStop(0, `rgba(191, 232, 255, ${0.65 * w})`);
    gCore.addColorStop(0.5, `rgba(191, 232, 255, ${0.3 * w})`);
    gCore.addColorStop(1, "rgba(191, 232, 255, 0)");
    ctx.beginPath();
    ctx.arc(footX, footY, coreRad, 0, Math.PI * 2);
    ctx.fillStyle = gCore;
    ctx.fill();
  }
}

// ─── Component ────────────────────────────────────────────────────────────
interface SpiderCreatureProps {
  scrollProgressRef?: React.RefObject<number>;
}

export default function SpiderCreature({
  scrollProgressRef,
}: SpiderCreatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0,
      H = 0;
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      buildStars(W, H);
    };
    resize();
    window.addEventListener("resize", resize);

    const mouse = { x: W / 2, y: H / 2 };
    const head = { x: W / 2, y: H / 2 };
    const vel = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", onMove);

    const legMap = new Map<number, LegState>();
    let seedCounter = 0;

    let rafId = 0;
    const t0 = performance.now();

    const frame = () => {
      const t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      const prevX = head.x,
        prevY = head.y;
      const toCursorX = mouse.x - head.x;
      const toCursorY = mouse.y - head.y;
      const toCursorDist = Math.sqrt(
        toCursorX * toCursorX + toCursorY * toCursorY,
      );

      let targetX = mouse.x,
        targetY = mouse.y;
      if (toCursorDist > HEAD_OFFSET_DIST) {
        const nx = toCursorX / toCursorDist;
        const ny = toCursorY / toCursorDist;
        targetX = mouse.x - nx * HEAD_OFFSET_DIST;
        targetY = mouse.y - ny * HEAD_OFFSET_DIST;
      } else {
        targetX = head.x;
        targetY = head.y;
      }

      head.x += (targetX - head.x) * HEAD_LERP;
      head.y += (targetY - head.y) * HEAD_LERP;

      vel.x += (head.x - prevX - vel.x) * 0.2;
      vel.y += (head.y - prevY - vel.y) * 0.2;

      const hx = head.x + snoise(t * 0.45, 99) * 2.2;
      const hy = head.y + snoise(88, t * 0.38) * 1.8;

      for (let i = 0; i < STARS.length; i++) {
        const s = STARS[i];
        const tw = 0.6 + 0.4 * Math.sin(t * s.speed + s.phase);

        if (s.tier === 0) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(210,222,255,${0.2 * tw})`;
          ctx.fill();
        } else if (s.tier === 1) {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.5);
          g.addColorStop(0, `rgba(225,235,255,${0.5 * tw})`);
          g.addColorStop(1, "rgba(210,225,255,0)");
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.7 * tw})`;
          ctx.fill();
        } else {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
          g.addColorStop(0, `rgba(210,230,255,${0.38 * tw})`);
          g.addColorStop(0.5, `rgba(190,215,255,${0.1 * tw})`);
          g.addColorStop(1, "rgba(170,200,255,0)");
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.85 * tw})`;
          ctx.fill();
        }
      }

      const nearby: { idx: number; dist2: number }[] = [];
      const R2 = ACTIVE_RADIUS * ACTIVE_RADIUS;
      for (let i = 0; i < STARS.length; i++) {
        const s = STARS[i];
        const dx = hx - s.x,
          dy = hy - s.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) nearby.push({ idx: i, dist2: d2 });
      }
      nearby.sort((a, b) => a.dist2 - b.dist2);
      const active = new Set(nearby.slice(0, MAX_LEGS).map((n) => n.idx));

      for (const [idx, leg] of legMap) {
        if (active.has(idx)) {
          leg.targetAlpha = 1;
          leg.alpha = Math.min(1, leg.alpha + FADE_IN_STEP);
        } else {
          leg.targetAlpha = 0;
          leg.alpha *= 1 - FADE_OUT_K;
        }
        if (leg.alpha < 0.008 && leg.targetAlpha === 0) {
          legMap.delete(idx);
        }
      }

      for (const idx of active) {
        if (!legMap.has(idx)) {
          legMap.set(idx, {
            alpha: 0.05,
            targetAlpha: 1,
            bendAngle: (Math.random() - 0.5) * Math.PI * 1.1,
            bendMag: 0.55 + Math.random() * 1.05,
            noiseFreq: 0.4 + Math.random() * 1.6,
            noiseAmp: 6 + Math.random() * 18,
            widthMul: 0.45 + Math.random() * 1.4,
            opacityMul: 0.4 + Math.random() * 0.55,
            seed: ++seedCounter * 0.37,
          });
        }
      }

      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      const stretchX = vel.x * 6;
      const stretchY = vel.y * 6;
      for (const [idx, leg] of legMap) {
        if (leg.alpha < 0.005) continue;
        const s = STARS[idx];
        drawLeg(ctx, s.x, s.y, hx, hy, leg, t, stretchX, stretchY, speed);
      }

      const pulse = 1 + Math.sin(t * 3.4) * 0.1;
      const hr = 6.5 * pulse;

      const aura = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr * 8);
      aura.addColorStop(0, "rgba(140,200,255,0.12)");
      aura.addColorStop(0.5, "rgba(120,175,255,0.04)");
      aura.addColorStop(1, "rgba(100,160,255,0)");
      ctx.beginPath();
      ctx.arc(hx, hy, hr * 8, 0, Math.PI * 2);
      ctx.fillStyle = aura;
      ctx.fill();

      const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr * 3);
      glow.addColorStop(0, "rgba(230,245,255,0.55)");
      glow.addColorStop(0.55, "rgba(200,225,255,0.15)");
      glow.addColorStop(1, "rgba(180,210,255,0)");
      ctx.beginPath();
      ctx.arc(hx, hy, hr * 3, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      const core = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
      core.addColorStop(0, "rgba(255,255,255,1)");
      core.addColorStop(0.45, "rgba(240,248,255,0.88)");
      core.addColorStop(1, "rgba(210,235,255,0)");
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();

      // ── FADE OUT begitu keluar dari hero section ─────────
      const progress = scrollProgressRef?.current ?? 0;
      const fadeOpacity = Math.max(0, 1 - progress * 2.5);
      canvas.style.opacity = fadeOpacity.toString();

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, [scrollProgressRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 9999, transition: "opacity 0.1s linear" }}
    />
  );
}
