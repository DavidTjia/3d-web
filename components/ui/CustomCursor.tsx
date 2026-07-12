'use client';

/**
 * CustomCursor — Glowing diamond crosshair cursor.
 * A sleek, premium sci-fi targeting reticle with rotating ring and pulsing core.
 */

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 60;
    canvas.height = 60;
    canvas.style.width = '60px';
    canvas.style.height = '60px';

    const mouse = { x: -200, y: -200 };
    const pos   = { x: -200, y: -200 };
    let angle = 0;
    let speed = 0;
    let lastX = -200, lastY = -200;
    let rafId = 0;
    const t0 = performance.now();

    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener('mousemove', onMove);

    const draw = () => {
      const t = (performance.now() - t0) / 1000;

      // Snap on first move
      if (pos.x === -200 && mouse.x !== -200) { pos.x = mouse.x; pos.y = mouse.y; }
      pos.x += (mouse.x - pos.x) * 0.16;
      pos.y += (mouse.y - pos.y) * 0.16;

      const dx = pos.x - lastX, dy = pos.y - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      speed += (dist - speed) * 0.12;
      lastX = pos.x; lastY = pos.y;

      // Position canvas exactly at cursor
      canvas.style.transform = `translate(${pos.x - 30}px, ${pos.y - 30}px)`;

      // Rotate outer ring based on movement
      angle += (0.012 + speed * 0.003);

      ctx.clearRect(0, 0, 60, 60);
      const cx = 30, cy = 30;

      // ── Outer rotating dashed ring ────────────────
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r1 = 22, r2 = 26;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
        ctx.strokeStyle = `rgba(0,210,255,${0.5 + 0.4 * Math.sin(t * 3 + i)})`;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();

      // ── Inner thin circle ─────────────────────────
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,210,255,${0.25 + 0.1 * Math.sin(t * 2)})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // ── Four crosshair lines ──────────────────────
      const gap = 5, len = 8;
      ctx.strokeStyle = `rgba(255,255,255,${0.7 + 0.2 * Math.sin(t * 4)})`;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      // Top
      ctx.beginPath(); ctx.moveTo(cx, cy - gap); ctx.lineTo(cx, cy - gap - len); ctx.stroke();
      // Bottom
      ctx.beginPath(); ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + len); ctx.stroke();
      // Left
      ctx.beginPath(); ctx.moveTo(cx - gap, cy); ctx.lineTo(cx - gap - len, cy); ctx.stroke();
      // Right
      ctx.beginPath(); ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + len, cy); ctx.stroke();

      // ── Core glowing dot ──────────────────────────
      const pulse = 1 + Math.sin(t * 5) * 0.3;
      const coreGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 5 * pulse);
      coreGrd.addColorStop(0, 'rgba(255,255,255,0.95)');
      coreGrd.addColorStop(0.4, 'rgba(0,210,255,0.6)');
      coreGrd.addColorStop(1, 'rgba(0,210,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, 5 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = coreGrd;
      ctx.fill();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <>
      {/* Hide native cursor */}
      <style>{`* { cursor: none !important; }`}</style>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed top-0 left-0 z-[99999]"
        style={{ willChange: 'transform' }}
      />
    </>
  );
}
