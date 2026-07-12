'use client';

/**
 * Navbar — Kawanua Virtual Teknologi
 * Premium glassmorphic portfolio navigation bar.
 * Transparent at top, activates frosted-glass blur on scroll.
 */

import { useEffect, useRef, useState } from 'react';

const NAV_LINKS = [
  { label: 'About',     href: '#about' },
  { label: 'Services',  href: '#services' },
  { label: 'Portfolio', href: '#portfolio' },
  { label: 'Team',      href: '#team' },
  { label: 'Contact',   href: '#contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-[1000] transition-all duration-500"
        style={{
          background: scrolled
            ? 'rgba(3, 3, 15, 0.72)'
            : 'rgba(3, 3, 15, 0.0)',
          backdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'none',
          borderBottom: scrolled
            ? '1px solid rgba(0, 210, 255, 0.08)'
            : '1px solid transparent',
          boxShadow: scrolled
            ? '0 4px 32px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(0, 210, 255, 0.06) inset'
            : 'none',
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">

          {/* Logo */}
          <a
            href="#"
            className="flex items-center gap-3 group select-none"
            id="navbar-logo"
          >
            <div
              className="relative flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(0,210,255,0.18) 0%, rgba(109,40,217,0.22) 100%)',
                border: '1px solid rgba(0,210,255,0.30)',
                boxShadow: '0 0 14px rgba(0,210,255,0.15)',
              }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(circle, rgba(0,210,255,0.18) 0%, transparent 70%)' }}
              />
              <span
                className="relative z-10 font-display font-extrabold text-xs tracking-widest"
                style={{ color: '#00d2ff', letterSpacing: '0.15em' }}
              >
                KVT
              </span>
            </div>

            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-sm tracking-wider text-white group-hover:text-cyan-300 transition-colors duration-300">
                Kawanua
              </span>
              <span
                className="text-[9px] font-medium tracking-[0.3em] uppercase"
                style={{ color: 'rgba(0,210,255,0.65)' }}
              >
                Virtual Teknologi
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <ul className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  id={`navbar-link-${link.label.toLowerCase()}`}
                  className="relative px-4 py-2 text-[11.5px] font-medium tracking-[0.12em] uppercase text-gray-400 hover:text-white transition-colors duration-200 group"
                >
                  {link.label}
                  <span
                    className="absolute bottom-1 left-1/2 h-[1.5px] w-0 -translate-x-1/2 rounded-full group-hover:w-4 transition-all duration-300"
                    style={{ background: 'linear-gradient(90deg, #00d2ff, #6d28d9)' }}
                  />
                </a>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="#contact"
              id="navbar-cta"
              className="relative overflow-hidden rounded-lg px-5 py-2 text-[11px] font-semibold tracking-[0.18em] uppercase text-white transition-all duration-300 hover:scale-105 group"
              style={{
                background: 'linear-gradient(135deg, rgba(0,210,255,0.15) 0%, rgba(109,40,217,0.20) 100%)',
                border: '1px solid rgba(0,210,255,0.35)',
                boxShadow: '0 0 16px rgba(0,210,255,0.12)',
              }}
            >
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, rgba(0,210,255,0.22) 0%, rgba(109,40,217,0.28) 100%)' }}
              />
              <span className="relative z-10">Get in Touch</span>
            </a>
          </div>

          {/* Mobile Hamburger */}
          <button
            id="navbar-mobile-toggle"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden flex flex-col gap-[5px] p-2"
            aria-label="Toggle mobile menu"
          >
            <span
              className="block h-[1.5px] w-5 rounded-full bg-gray-300 transition-all duration-300"
              style={{ transform: mobileOpen ? 'rotate(45deg) translateY(6.5px)' : 'none' }}
            />
            <span
              className="block h-[1.5px] w-5 rounded-full bg-gray-300 transition-all duration-300"
              style={{ opacity: mobileOpen ? 0 : 1 }}
            />
            <span
              className="block h-[1.5px] w-5 rounded-full bg-gray-300 transition-all duration-300"
              style={{ transform: mobileOpen ? 'rotate(-45deg) translateY(-6.5px)' : 'none' }}
            />
          </button>
        </div>

        {/* Mobile Dropdown */}
        <div
          className="md:hidden overflow-hidden transition-all duration-500"
          style={{
            maxHeight: mobileOpen ? '400px' : '0px',
            background: 'rgba(3, 3, 20, 0.92)',
            backdropFilter: 'blur(20px)',
            borderBottom: mobileOpen ? '1px solid rgba(0,210,255,0.10)' : 'none',
          }}
        >
          <ul className="flex flex-col gap-1 px-6 py-4">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 text-sm font-medium tracking-wider uppercase text-gray-400 hover:text-white hover:pl-2 transition-all duration-200"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="pt-3">
              <a
                href="#contact"
                onClick={() => setMobileOpen(false)}
                className="block text-center rounded-lg py-3 text-sm font-semibold tracking-wider uppercase text-white"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,210,255,0.15), rgba(109,40,217,0.20))',
                  border: '1px solid rgba(0,210,255,0.30)',
                }}
              >
                Get in Touch
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Top gradient accent line */}
      <div
        className="fixed top-0 left-0 right-0 z-[1001] h-[1px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(0,210,255,0.55) 30%, rgba(109,40,217,0.55) 70%, transparent 100%)',
          opacity: scrolled ? 0.75 : 0.35,
          transition: 'opacity 0.5s ease',
        }}
      />
    </>
  );
}
