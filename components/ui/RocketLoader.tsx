'use client';

/**
 * RocketLoader — Cinematic Earth-to-Space launch sequence.
 *
 * Phases:
 *   0–20%   idle       Rocket on pad, Earth pre-dawn atmosphere
 *   20–70%  ignition   5-layer fire builds BELOW nozzle, dark smoke billows
 *   70–99%  prelift    Full thrust, camera pulls, countdown
 *   100%    ascent     Rocket blasts up, Earth scrolls away → space landing page
 */

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface RocketLoaderProps {
  onComplete: () => void;
}

// ─── Smoke particle data ───────────────────────────────────────────────
const SMOKE_PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  side: i % 2 === 0 ? -1 : 1,
  tx: 22 + (i % 12) * 14,
  size: 30 + Math.sin(i * 2.3) * 16,
  delay: i * 0.055,
  dur: 2.4 + Math.sin(i * 0.9) * 0.8,
}));

// ─── Cloud data ────────────────────────────────────────────────────────
const CLOUD_DATA = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: (Math.sin(i * 53.7) * 0.5 + 0.5) * 100,
  y: 14 + (Math.sin(i * 29.1) * 0.5 + 0.5) * 28,
  w: 100 + (Math.sin(i * 41.3) * 0.5 + 0.5) * 160,
  o: 0.12 + (Math.sin(i * 17.9) * 0.5 + 0.5) * 0.22,   // much lower opacity
  speed: 28 + i * 10,
}));

// ─── Realistic Falcon-9 inspired rocket SVG ────────────────────────────
function RocketSVG() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 280"
      width="72"
      height="252"
      style={{ display: 'block', filter: 'drop-shadow(0 0 8px rgba(80,140,220,0.35))' }}
    >
      <defs>
        {/* Body gradient — metallic silver-white, shaded left */}
        <linearGradient id="rk-body" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#4a6080" />
          <stop offset="18%"  stopColor="#8aa8cc" />
          <stop offset="40%"  stopColor="#d8e8f8" />
          <stop offset="62%"  stopColor="#f0f6ff" />
          <stop offset="85%"  stopColor="#c0d4e8" />
          <stop offset="100%" stopColor="#3a5070" />
        </linearGradient>
        {/* Nose gradient — same shading */}
        <linearGradient id="rk-nose" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#5a7898" />
          <stop offset="40%"  stopColor="#b0cce4" />
          <stop offset="70%"  stopColor="#e4f0fc" />
          <stop offset="100%" stopColor="#4a6888" />
        </linearGradient>
        {/* Interstage band */}
        <linearGradient id="rk-interstage" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#283848" />
          <stop offset="40%"  stopColor="#3a5068" />
          <stop offset="100%" stopColor="#202830" />
        </linearGradient>
        {/* Engine bell */}
        <linearGradient id="rk-bell" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#1a2535" />
          <stop offset="60%"  stopColor="#0f1820" />
          <stop offset="100%" stopColor="#080c14" />
        </linearGradient>
        {/* Fins */}
        <linearGradient id="rk-fin" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#304050" />
          <stop offset="60%"  stopColor="#5a7898" />
          <stop offset="100%" stopColor="#405060" />
        </linearGradient>
        {/* Window */}
        <radialGradient id="rk-win" cx="38%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#d0f0ff" />
          <stop offset="30%"  stopColor="#1878cc" />
          <stop offset="100%" stopColor="#040e1c" />
        </radialGradient>
        {/* Nozzle aperture glow */}
        <radialGradient id="rk-nozzle-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(100,160,255,0.4)" />
          <stop offset="100%" stopColor="rgba(40,80,180,0)" />
        </radialGradient>
      </defs>

      {/* ─ Nose fairing — slender ogive curve ─ */}
      <path
        d="M40 2 C37 2 29 24 26 64 L54 64 C51 24 43 2 40 2 Z"
        fill="url(#rk-nose)"
      />
      {/* Nose tip highlight */}
      <ellipse cx="40" cy="5" rx="2.5" ry="4" fill="rgba(220,240,255,0.95)" />

      {/* ─ First stage body ─ */}
      <rect x="26" y="62"  width="28" height="140" rx="2" fill="url(#rk-body)" />
      {/* Left edge shadow */}
      <rect x="26" y="62"  width="2.5" height="140" fill="rgba(0,0,0,0.18)" rx="1.5" />
      {/* Right specular highlight */}
      <rect x="50" y="62"  width="1.5" height="140" fill="rgba(255,255,255,0.12)" rx="1" />

      {/* Porthole window */}
      <circle cx="40" cy="96"  r="11"   fill="#080e1c" />
      <circle cx="40" cy="96"  r="9.5"  fill="url(#rk-win)" />
      <ellipse cx="36" cy="91" rx="3.5" ry="2.5" fill="rgba(255,255,255,0.5)" />
      <circle  cx="40" cy="96" r="9.5"  fill="none" stroke="rgba(80,160,240,0.45)" strokeWidth="0.7" />

      {/* Panel detail lines — horizontal stringer bands */}
      <line x1="26" y1="120" x2="54" y2="120" stroke="rgba(0,170,255,0.28)" strokeWidth="0.8" />
      <line x1="26" y1="143" x2="54" y2="143" stroke="rgba(0,170,255,0.20)" strokeWidth="0.6" />
      <line x1="26" y1="166" x2="54" y2="166" stroke="rgba(0,170,255,0.15)" strokeWidth="0.5" />

      {/* AETHERIS mission text */}
      <text x="40" y="133" textAnchor="middle" fontSize="4" fill="rgba(0,190,255,0.65)"
        fontFamily="monospace" letterSpacing="1.4">AETHERIS</text>

      {/* Mission stripe */}
      <rect x="26" y="150" width="28" height="4" rx="1" fill="rgba(0,180,255,0.25)" />

      {/* ─ Interstage section (slightly darker band) ─ */}
      <rect x="24" y="200" width="32" height="16" rx="2" fill="url(#rk-interstage)" />
      {/* Interstage separation detail */}
      <line x1="24" y1="200" x2="56" y2="200" stroke="rgba(0,150,255,0.35)" strokeWidth="0.9" />
      <line x1="24" y1="216" x2="56" y2="216" stroke="rgba(0,120,220,0.25)" strokeWidth="0.7" />
      {/* Small bolt heads along the interstage */}
      {[29, 35, 40, 45, 51].map((bx, i) => (
        <circle key={i} cx={bx} cy="208" r="1.2" fill="rgba(80,140,200,0.5)" />
      ))}

      {/* ─ Engine section (below interstage) ─ */}
      <rect x="26" y="216" width="28" height="10" rx="1" fill="#101828" />
      {/* Turbopump / plumbing lines */}
      <line x1="33" y1="218" x2="33" y2="226" stroke="rgba(0,140,200,0.4)" strokeWidth="1.2" />
      <line x1="40" y1="218" x2="40" y2="226" stroke="rgba(0,140,200,0.4)" strokeWidth="1.2" />
      <line x1="47" y1="218" x2="47" y2="226" stroke="rgba(0,140,200,0.4)" strokeWidth="1.2" />

      {/* ─ Engine bell — Merlin-style flared nozzle ─ */}
      {/* Outer bell */}
      <path d="M28 226 L52 226 L59 262 L21 262 Z" fill="url(#rk-bell)" />
      {/* Inner bell wall shading */}
      <path d="M30 226 L50 226 L56 262 L24 262 Z" fill="rgba(255,255,255,0.025)" />
      {/* Nozzle throat highlight ring */}
      <ellipse cx="40" cy="226" rx="12" ry="2.5" fill="rgba(60,120,200,0.3)" />
      {/* Bell rim */}
      <line x1="21" y1="262" x2="59" y2="262" stroke="rgba(60,120,200,0.5)" strokeWidth="1.4" />
      {/* Nozzle exit aperture glow (very subtle) */}
      <ellipse cx="40" cy="262" rx="19" ry="4" fill="url(#rk-nozzle-glow)" />

      {/* ─ Fins — swept delta style ─ */}
      {/* Left fin */}
      <path d="M26 196 L4 256 L26 248 Z" fill="url(#rk-fin)" opacity="0.92" />
      {/* Left fin leading edge highlight */}
      <line x1="5" y1="255" x2="26" y2="205" stroke="rgba(120,170,220,0.35)" strokeWidth="0.7" />

      {/* Right fin */}
      <path d="M54 196 L76 256 L54 248 Z" fill="url(#rk-fin)" opacity="0.92" />
      {/* Right fin leading edge highlight */}
      <line x1="75" y1="255" x2="54" y2="205" stroke="rgba(120,170,220,0.35)" strokeWidth="0.7" />

      {/* ─ Landing legs (folded along fins at base) ─ */}
      {/* Left landing leg (folded) */}
      <line x1="26" y1="244" x2="12" y2="260" stroke="rgba(80,130,180,0.45)" strokeWidth="1.5" />
      <line x1="12" y1="260" x2="6"  y2="262" stroke="rgba(80,130,180,0.35)" strokeWidth="1.2" />
      {/* Right landing leg (folded) */}
      <line x1="54" y1="244" x2="68" y2="260" stroke="rgba(80,130,180,0.45)" strokeWidth="1.5" />
      <line x1="68" y1="260" x2="74" y2="262" stroke="rgba(80,130,180,0.35)" strokeWidth="1.2" />
    </svg>
  );
}

// ─── Launch Pad ────────────────────────────────────────────────────────
function LaunchPad() {
  return (
    <div className="rl-pad-wrap">
      <div className="rl-pad-platform" />
      <div className="rl-pad-leg rl-pad-leg-l" />
      <div className="rl-pad-leg rl-pad-leg-r" />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────
export default function RocketLoader({ onComplete }: RocketLoaderProps) {
  const [mounted, setMounted] = useState(false);

  const containerRef    = useRef<HTMLDivElement>(null);
  const earthSceneRef   = useRef<HTMLDivElement>(null);
  const skyRef          = useRef<HTMLDivElement>(null);
  const rocketWrapRef   = useRef<HTMLDivElement>(null);

  // Fire refs — 5 layers
  const firePlasmaRef   = useRef<HTMLDivElement>(null);  // innermost white plasma
  const fireCoreRef     = useRef<HTMLDivElement>(null);  // bright yellow core
  const fireMidRef      = useRef<HTMLDivElement>(null);  // orange mid plume
  const fireOuterRef    = useRef<HTMLDivElement>(null);  // dark red outer plume
  const fireHaloRef     = useRef<HTMLDivElement>(null);  // diffuse bloom glow

  const smokeRef        = useRef<HTMLDivElement>(null);
  const padGlowRef      = useRef<HTMLDivElement>(null);
  const statusRef       = useRef<HTMLParagraphElement>(null);
  const progressLineRef = useRef<HTMLDivElement>(null);
  const percentTextRef  = useRef<HTMLSpanElement>(null);
  const flashRef        = useRef<HTMLDivElement>(null);

  const [statusText, setStatusText] = useState('Awaiting Launch Sequence');
  const onCompleteRef = useRef(onComplete);
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true));
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(handle);
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!rocketWrapRef.current) return;

    // ── Shake ticker ──────────────────────────────────────────────────
    let shakeIntensity = 0;
    const shakeTick = () => {
      if (shakeIntensity > 0 && rocketWrapRef.current) {
        const sx = (Math.random() - 0.5) * shakeIntensity;
        const sy = (Math.random() - 0.5) * shakeIntensity * 0.25;
        rocketWrapRef.current.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
      }
    };
    gsap.ticker.add(shakeTick);

    // ── 5-layer fire intensity helper ─────────────────────────────────
    const setFire = (t: number) => {
      const c = Math.max(0, Math.min(1, t));

      // Layer 0 — White plasma core (innermost, hottest)
      if (firePlasmaRef.current) {
        firePlasmaRef.current.style.height  = `${c * 55 + 8}px`;
        firePlasmaRef.current.style.opacity  = String(c * 0.92 + 0.08);
        firePlasmaRef.current.style.width    = `${c * 14 + 10}px`;
      }
      // Layer 1 — Bright yellow core plume
      if (fireCoreRef.current) {
        fireCoreRef.current.style.height   = `${c * 100 + 14}px`;
        fireCoreRef.current.style.opacity   = String(c * 0.90 + 0.05);
        fireCoreRef.current.style.width     = `${c * 24 + 14}px`;
      }
      // Layer 2 — Orange mid plume
      if (fireMidRef.current) {
        fireMidRef.current.style.height    = `${c * 155 + 22}px`;
        fireMidRef.current.style.opacity    = String(c * 0.78 + 0.02);
        fireMidRef.current.style.width      = `${c * 48 + 20}px`;
      }
      // Layer 3 — Dark red outer plume
      if (fireOuterRef.current) {
        fireOuterRef.current.style.height   = `${c * 210 + 35}px`;
        fireOuterRef.current.style.opacity   = String(c * 0.50);
        fireOuterRef.current.style.width     = `${c * 88 + 28}px`;
      }
      // Layer 4 — Diffuse heat bloom (very wide, very blurry)
      if (fireHaloRef.current) {
        fireHaloRef.current.style.opacity   = String(c * 0.65);
        const r = c * 140 + 35;
        fireHaloRef.current.style.width     = `${r * 2}px`;
        fireHaloRef.current.style.height    = `${r * 2}px`;
        fireHaloRef.current.style.marginLeft = `-${r}px`;
        fireHaloRef.current.style.marginTop  = `-${r}px`;
      }
      // Pad blast glow
      if (padGlowRef.current) {
        padGlowRef.current.style.opacity   = String(c * 0.85);
      }
      // Smoke visibility
      if (smokeRef.current) {
        smokeRef.current.style.opacity     = String(c * 0.95);
      }
    };

    // ── Status text helper ────────────────────────────────────────────
    const setStatus = (text: string) => {
      if (statusRef.current && statusRef.current.textContent !== text) {
        gsap.to(statusRef.current, {
          opacity: 0, y: 4, duration: 0.14,
          onComplete: () => {
            setStatusText(text);
            if (statusRef.current) {
              gsap.fromTo(statusRef.current,
                { opacity: 0, y: -4 },
                { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' }
              );
            }
          },
        });
      }
    };

    // ── Progress helper ────────────────────────────────────────────────
    const setProgress = (p: number) => {
      const r = Math.min(100, Math.round(p));
      if (progressLineRef.current) progressLineRef.current.style.width = `${r}%`;
      if (percentTextRef.current)  percentTextRef.current.textContent  = `${r}%`;
    };

    const prog = { value: 0 };
    const tl = gsap.timeline({ defaults: { ease: 'none' } });

    // ── Phase 1: IDLE on pad (0–20%) ────────────────────────────────
    tl.to(prog, {
      value: 20, duration: 1.2,
      onUpdate() { setProgress(prog.value); },
    });

    // ── Phase 2: IGNITION (20–70%) ───────────────────────────────────
    tl.call(() => setStatus('Engine Ignition'));
    tl.to(prog, {
      value: 50, duration: 1.2,
      onUpdate() {
        setProgress(prog.value);
        const t = (prog.value - 20) / 30;
        setFire(t * 0.42);
        shakeIntensity = t * 1.4;
      },
    });
    tl.call(() => setStatus('All Systems Go'));
    tl.to(prog, {
      value: 70, duration: 1.0,
      onUpdate() {
        setProgress(prog.value);
        const t = (prog.value - 20) / 50;
        setFire(t * 0.72);
        shakeIntensity = t * 2.8;
      },
    });

    // ── Phase 3: PRE-LIFT (70–99%) ────────────────────────────────────
    tl.call(() => setStatus('Preparing Launch'));
    tl.to(prog, {
      value: 87, duration: 0.65,
      onUpdate() {
        setProgress(prog.value);
        const t = (prog.value - 70) / 29;
        setFire(0.72 + t * 0.28);
        shakeIntensity = 2.8 + t * 4.5;
      },
    });
    tl.call(() => setStatus('Ignition Sequence'));
    tl.to(prog, {
      value: 95, duration: 0.4,
      onUpdate() {
        setProgress(prog.value);
        setFire(1.0);
        shakeIntensity = 7 + (prog.value - 87) * 1.5;
      },
    });
    tl.call(() => setStatus('T − 3 . . . 2 . . . 1'));
    tl.to(prog, {
      value: 99, duration: 0.5,
      onUpdate() { setProgress(prog.value); setFire(1.0); shakeIntensity = 10; },
    });
    tl.to({}, { duration: 0.38 }); // tension pause

    // ── Phase 4: LAUNCH + ATMOSPHERIC ASCENT TRANSITION ──────────────
    tl.call(() => {
      setProgress(100);
      setStatus('LIFT   OFF');
      shakeIntensity = 0;
      if (rocketWrapRef.current) rocketWrapRef.current.style.transform = 'translate3d(0,0,0)';
      if (statusRef.current) gsap.to(statusRef.current.parentElement!, { opacity: 0, duration: 0.4 });
    });

    // Ignition flash
    tl.fromTo(flashRef.current!,
      { opacity: 0 },
      { opacity: 0.9, duration: 0.06, yoyo: true, repeat: 1 }
    );

    // Rocket ascent — natural inertia
    tl.to(rocketWrapRef.current!, {
      y: '-115vh', scale: 0.04, opacity: 0,
      duration: 2.5, ease: 'power3.in',
    }, '<+=0.04');

    // Earth scene scrolls down as rocket ascends (parallax transition)
    tl.to(earthSceneRef.current!, {
      y: '58vh', opacity: 0,
      duration: 2.9, ease: 'power2.inOut',
    }, '<+=0.28');

    tl.call(() => {
      gsap.to(containerRef.current!, {
        opacity: 0, duration: 0.4, ease: 'power1.in',
        onComplete: () => onCompleteRef.current(),
      });
    }, undefined, '+=0.12');

    return () => {
      tl.kill();
      gsap.ticker.remove(shakeTick);
    };
  }, [mounted]);

  // SSR placeholder
  if (!mounted) {
    return (
      <div className="rl-root rl-earth-bg">
        <div className="rl-hud">
          <p className="rl-status-text">Awaiting Launch Sequence</p>
          <div className="rl-progress-track">
            <div className="rl-progress-fill" style={{ width: '0%' }} />
          </div>
          <div className="rl-percent-wrap">
            <span className="rl-percent-text">0%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="rl-root" style={{ pointerEvents: 'none' }}>

      {/* ══ EARTH SCENE ═══════════════════════════════════════════════════ */}
      <div ref={earthSceneRef} className="rl-earth-scene">

        <div ref={skyRef} className="rl-sky" aria-hidden />
        <div className="rl-sun-glow" aria-hidden />

        {/* Clouds — muted, darker at pre-dawn */}
        <div className="rl-clouds" aria-hidden>
          {CLOUD_DATA.map(c => (
            <div key={c.id} className="rl-cloud" style={{
              left: `${c.x}%`, top: `${c.y}%`,
              width: `${c.w}px`, opacity: c.o,
              animationDuration: `${c.speed}s`,
            }} />
          ))}
        </div>

        {/* Dark smoke columns */}
        <div ref={smokeRef} className="rl-smoke-wrap" aria-hidden style={{ opacity: 0 }}>
          {SMOKE_PARTICLES.map(p => (
            <div key={p.id} className="rl-smoke-puff" style={{
              width: `${p.size}px`, height: `${p.size}px`,
              left: `calc(50% + ${p.side * p.tx}px - ${p.size / 2}px)`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }} />
          ))}
        </div>

        <div className="rl-ground" aria-hidden />

        {/* Launch pad area */}
        <div className="rl-launch-area" aria-hidden>
          <LaunchPad />
          <div ref={padGlowRef} className="rl-pad-blast-glow" style={{ opacity: 0 }} />
        </div>

        <div className="rl-ground-mist" aria-hidden />
      </div>

      {/* ══ ROCKET + FIRE ══════════════════════════════════════════════════ */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(18vh + 42px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9008,
      }}>
        <div ref={rocketWrapRef} style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>

          {/* ─ 5-Layer fire system below the rocket nozzle ─ */}
          <div className="rl-fire-below" aria-hidden>
            {/* Layer 4: wide diffuse heat bloom */}
            <div ref={fireHaloRef}  className="rl-fire-halo"  style={{ opacity: 0 }} />
            {/* Layer 3: dark red outer plume */}
            <div ref={fireOuterRef} className="rl-fire-outer-plume" style={{ height: '0px', opacity: 0, width: '28px' }} />
            {/* Layer 2: orange mid plume */}
            <div ref={fireMidRef}   className="rl-fire-mid-plume"   style={{ height: '0px', opacity: 0, width: '20px' }} />
            {/* Layer 1: bright yellow core */}
            <div ref={fireCoreRef}  className="rl-fire-core-plume"  style={{ height: '14px', opacity: 0.06, width: '14px' }} />
            {/* Layer 0: white plasma (innermost) */}
            <div ref={firePlasmaRef} className="rl-fire-plasma"     style={{ height: '8px', opacity: 0.08, width: '10px' }} />
          </div>

          {/* Rocket body */}
          <RocketSVG />
        </div>
      </div>

      {/* ══ HUD ═══════════════════════════════════════════════════════════ */}
      <div className="rl-hud" style={{ zIndex: 9015 }}>
        <p ref={statusRef} className="rl-status-text">{statusText}</p>
        <div className="rl-progress-track">
          <div ref={progressLineRef} className="rl-progress-fill" style={{ width: '0%' }} />
          <div className="rl-progress-shimmer" />
        </div>
        <div className="rl-percent-wrap">
          <span ref={percentTextRef} className="rl-percent-text">0%</span>
        </div>
      </div>

      {/* Flash */}
      <div ref={flashRef} className="rl-flash" style={{ opacity: 0, zIndex: 9020 }} aria-hidden />
    </div>
  );
}
