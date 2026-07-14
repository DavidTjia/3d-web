"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface RocketLoaderProps {
  onComplete: () => void;
}

export default function RocketLoader({ onComplete }: RocketLoaderProps) {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [readyToContinue, setReadyToContinue] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const prog = { value: 0 };
    const tl = gsap.timeline({ defaults: { ease: "power1.out" } });

    // simple linear-ish ramp to 100
    tl.to(prog, {
      value: 100,
      duration: 2.2,
      onUpdate() {
        setProgress(Math.round(prog.value));
      },
    });

    tl.call(() => setReadyToContinue(true));

    return () => tl.kill();
  }, [mounted]);

  const handleContinue = () => {
    if (!readyToContinue) return;
    // fade out and call onComplete
    if (rootRef.current) {
      gsap.to(rootRef.current, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: onComplete,
      });
    } else {
      onComplete();
    }
  };

  // SSR placeholder
  if (!mounted) {
    return (
      <div className="rl-root" style={{ opacity: 1 }}>
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 220,
                height: 8,
                background: "#222",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: 0,
                  height: "100%",
                  background: "linear-gradient(90deg,#06b6d4,#a78bfa)",
                }}
              />
            </div>
            <div style={{ marginTop: 12, color: "#ddd" }}>0%</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="rl-root"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "linear-gradient(180deg,#05060b, #080815)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        onClick={handleContinue}
        style={{
          cursor: readyToContinue ? "pointer" : "default",
          textAlign: "center",
          userSelect: "none",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            width: 320,
            height: 12,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg,#06b6d4,#a78bfa)",
              transition: "width 0.12s linear",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 14,
            color: "#e6eef8",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {progress}%
        </div>
        {readyToContinue && (
          <div style={{ marginTop: 12, color: "#9bd5ff", opacity: 0.95 }}>
            Click anywhere to continue
          </div>
        )}
      </div>
    </div>
  );
}
