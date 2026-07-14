"use client";

import React, { useEffect, useRef, useState } from "react";

export default function ContactSection() {
  const [mounted, setMounted] = useState(false);
  const [blink, setBlink] = useState(true);
  const scanRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true));
    const b = setInterval(() => setBlink((v) => !v), 900);
    return () => {
      cancelAnimationFrame(handle);
      clearInterval(b);
    };
  }, []);

  // scanline animation loop (simple, subtle)
  useEffect(() => {
    let raf = 0;
    const el = scanRef.current;
    if (!el) return;
    const start = performance.now();
    const loop = (t: number) => {
      const dt = (t - start) / 6000; // 6s full pass
      const x = ((dt % 1) * 2 - 1) * 120; // -120% -> 120%
      el.style.transform = `translateX(${x}%)`;
      el.style.opacity = `${0.06}`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  return (
    <section
      id="contact-section"
      className="relative w-full pb-28 pt-20 overflow-hidden"
      style={{ background: "linear-gradient(180deg,#050505 0%,#0a0a0a 100%)" }}
    >
      {/* Minimal fog */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.03), transparent 30%), linear-gradient(180deg, rgba(0,0,0,0.18), transparent 40%)",
        }}
      />

      {/* Plaza floor */}
      <div
        className="absolute left-0 right-0 bottom-0 h-56 md:h-72 lg:h-96"
        aria-hidden
      >
        <div
          className="mx-auto h-full max-w-[1400px]"
          style={{
            background: "linear-gradient(180deg,#0a0a0a 0%, #050505 60%)",
            boxShadow: "inset 0 6px 30px rgba(0,0,0,0.6)",
            borderTop: "1px solid rgba(255,255,255,0.02)",
            transform: "translateZ(0)",
          }}
        >
          {/* subtle neon reflection stripe */}
          <div
            style={{
              height: 2,
              marginTop: 18,
              width: "60%",
              marginLeft: "20%",
              background:
                "linear-gradient(90deg, rgba(255,45,141,0.0), rgba(255,45,141,0.06), rgba(139,92,246,0.04), rgba(34,211,238,0.0))",
              opacity: 0.9,
            }}
          />
        </div>
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6">
        <div
          className={`transform transition-opacity duration-900 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT: Business intro */}
            <div className="lg:col-span-5 text-white">
              <span
                className="text-xs font-bold tracking-[0.35em] uppercase"
                style={{ color: "#ff2d8d" }}
              >
                Headquarters
              </span>

              <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-4 text-white">
                Let&apos;s Build the Future Together
              </h2>

              <p className="text-gray-300 mb-6 max-w-xl">
                You&apos;ve reached the Kawanua Virtual Teknologi plaza — a calm,
                premium space where projects are planned and launched. Tell us
                your goals and we&apos;ll respond promptly with a tailored plan.
              </p>

              <div className="text-sm text-gray-300 space-y-3 mb-6">
                <div>
                  <strong className="text-white block">Location</strong>
                  <span className="text-gray-400">Jakarta, Indonesia</span>
                </div>
                <div>
                  <strong className="text-white block">Email</strong>
                  <a className="text-pink-400" href="mailto:hello@kawanua.id">
                    hello@kawanua.id
                  </a>
                </div>
                <div>
                  <strong className="text-white block">Phone</strong>
                  <span className="text-gray-400">+62 812 3456 7890</span>
                </div>
                <div>
                  <strong className="text-white block">Hours</strong>
                  <span className="text-gray-400">
                    Mon–Fri, 09:00–18:00 WIB
                  </span>
                </div>
                <div>
                  <strong className="text-white block">Response Time</strong>
                  <span className="text-gray-400">
                    Typically within 2 business days
                  </span>
                </div>
              </div>

              {/* social icons (minimal) */}
              <div className="flex items-center gap-4 mt-4">
                <a
                  aria-label="twitter"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-black/20 border border-white/6"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22 5.75c-.65.3-1.35.5-2.05.6.73-.45 1.3-1.15 1.57-1.98-.68.4-1.44.7-2.25.86C18.9 4.3 17.95 4 17 4c-1.7 0-3.08 1.38-3.08 3.08 0 .24.03.47.08.7-2.56-.13-4.83-1.35-6.35-3.2-.27.46-.43 1-.43 1.6 0 1.1.56 2.06 1.42 2.63-.52-.02-1.02-.16-1.45-.4v.04c0 1.52 1.08 2.8 2.51 3.09-.26.07-.53.11-.81.11-.2 0-.4-.02-.6-.06.4 1.22 1.55 2.1 2.91 2.12C9.6 18.9 8.1 19.6 6.46 19.6c-.37 0-.74-.02-1.1-.06C5.6 21 7.1 22 9 22c5.4 0 8.35-4.48 8.35-8.36v-.38c.58-.4 1.08-.9 1.48-1.48-.56.25-1.16.42-1.79.5z"
                      fill="#fff"
                    />
                  </svg>
                </a>
                <a
                  aria-label="linkedin"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-black/20 border border-white/6"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.98 3.5C4.98 4.88 3.86 6 2.48 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8.99h4.96V23H0V8.99zM8.99 8.99h4.76v1.92h.07c.66-1.25 2.28-2.56 4.69-2.56C24.4 8.35 24.96 11.1 24.96 14.82V23h-4.96v-7.34c0-1.75-.03-4-2.44-4-2.44 0-2.82 1.9-2.82 3.87V23H8.99V8.99z"
                      fill="#fff"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* RIGHT: Holographic terminal (mounted) */}
            <div className="lg:col-span-7 flex justify-center items-end">
              <div
                className="relative w-full max-w-2xl"
                style={{ perspective: 800 }}
              >
                {/* mounted base plate */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-0 h-6 w-[86%] rounded-lg"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.75))",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
                    transform: "translateY(24px)",
                  }}
                />

                <div className="relative z-20">
                  <div
                    className="glassmorphism p-6 md:p-8 rounded-xl border border-white/6"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(10,10,10,0.5), rgba(6,6,6,0.45))",
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            background: blink
                              ? "#ff2d8d"
                              : "rgba(255,45,141,0.22)",
                            boxShadow: blink
                              ? "0 0 8px rgba(255,45,141,0.28)"
                              : "none",
                          }}
                        />
                        <div className="text-xs uppercase tracking-[0.35em] text-pink-300">
                          Control Terminal
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        Secure · Encrypted
                      </div>
                    </div>

                    <form className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        name="name"
                        placeholder="Name"
                        className="p-3 bg-transparent border border-white/6 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2"
                        style={{ borderColor: "rgba(255,255,255,0.06)" }}
                      />
                      <input
                        name="email"
                        placeholder="Email"
                        className="p-3 bg-transparent border border-white/6 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2"
                      />
                      <input
                        name="company"
                        placeholder="Company"
                        className="p-3 bg-transparent border border-white/6 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 md:col-span-2"
                      />
                      <select
                        name="projectType"
                        className="p-3 bg-transparent border border-white/6 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2"
                      >
                        <option value="product">Product Development</option>
                        <option value="experience">
                          Interactive Experience
                        </option>
                        <option value="consulting">Consulting / Audit</option>
                      </select>
                      <textarea
                        name="message"
                        rows={4}
                        placeholder="Tell us about your project"
                        className="md:col-span-2 p-3 bg-transparent border border-white/6 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2"
                      />

                      <div className="md:col-span-2 flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-400">
                          All fields are optional — we value context.
                        </div>
                        <button
                          type="button"
                          className="rounded-full px-5 py-2 font-semibold text-black"
                          style={{
                            background:
                              "linear-gradient(90deg,#ff2d8d,#8b5cf6)",
                            boxShadow: "0 6px 24px rgba(255,45,141,0.12)",
                            transition:
                              "transform 160ms ease, box-shadow 160ms ease",
                          }}
                          onMouseDown={(e) =>
                            (e.currentTarget.style.transform =
                              "translateY(1px)")
                          }
                          onMouseUp={(e) =>
                            (e.currentTarget.style.transform = "")
                          }
                        >
                          Start Your Project
                        </button>
                      </div>
                    </form>

                    {/* subtle scanline overlay */}
                    <div
                      className="pointer-events-none absolute inset-6 rounded-xl overflow-hidden"
                      aria-hidden
                    >
                      <div
                        ref={scanRef}
                        style={{
                          position: "absolute",
                          left: "-140%",
                          top: 0,
                          bottom: 0,
                          width: "40%",
                          background:
                            "linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.06), rgba(255,255,255,0.0))",
                          transform: "translateX(-120%)",
                          mixBlendMode: "screen",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
