'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export type LoadingPhase =
  | 'init'
  | 'birth'
  | 'grow'
  | 'collapse'
  | 'flash'
  | 'explode'
  | 'done';

const LOADING_MESSAGES = [
  'Initializing Neural Engine...',
  'Generating Celestial Physics...',
  'Building Starfield...',
  'Preparing Interactive Systems...',
  'Connecting AR/VR Modules...',
  'Synchronizing Experience...',
  'Complete',
];

interface LoadingState {
  phase: LoadingPhase;
  progress: number;        // 0–1 galaxy growth / loading progress
  collapseProgress: number; // 0–1 collapse animation
  explodeProgress: number; // 0–1 explosion animation
  message: string;
  titleOpacity: number;    // 0–1 for AETHERIS title
}

export function useLoadingSequence(onComplete: () => void) {
  const [state, setState] = useState<LoadingState>({
    phase: 'init',
    progress: 0,
    collapseProgress: 0,
    explodeProgress: 0,
    message: LOADING_MESSAGES[0],
    titleOpacity: 0,
  });

  const stateRef = useRef(state);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const obj = {
      progress: 0,
      collapseProgress: 0,
      explodeProgress: 0,
      titleOpacity: 0,
      messageIndex: 0,
    };

    let currentPhase: LoadingPhase = 'init';

    const update = (overrides: Partial<LoadingState> = {}) => {
      const next: LoadingState = {
        phase: currentPhase,
        progress: obj.progress,
        collapseProgress: obj.collapseProgress,
        explodeProgress: obj.explodeProgress,
        message: LOADING_MESSAGES[Math.min(Math.round(obj.messageIndex), LOADING_MESSAGES.length - 1)],
        titleOpacity: obj.titleOpacity,
        ...overrides,
      };
      stateRef.current = next;
      setState(next);
    };

    const tl = gsap.timeline();

    // ─── SCENE 1: INITIALIZATION (0s – 0.8s) ─────────────────────────
    tl.call(() => { currentPhase = 'init'; update(); })
      .to(obj, {
        titleOpacity: 1,
        duration: 0.8,
        ease: 'power2.out',
        onUpdate: update,
      });

    // ─── SCENE 2: GALAXY BIRTH (0.8s – 1.5s) ────────────────────────
    tl.call(() => { currentPhase = 'birth'; update(); })
      .to(obj, {
        progress: 0.04,
        duration: 0.7,
        ease: 'power1.in',
        onUpdate: update,
      });

    // ─── SCENE 3: GALAXY GROWTH (1.5s – 5.5s) ───────────────────────
    tl.call(() => { currentPhase = 'grow'; update(); })
      .to(obj, {
        progress: 1.0,
        messageIndex: 5.99,
        duration: 4.0,
        ease: 'power1.inOut',
        onUpdate: update,
      });

    // ─── SCENE 4: COLLAPSE (5.5s – 6.2s) ────────────────────────────
    tl.call(() => { currentPhase = 'collapse'; update(); })
      .to(obj, {
        collapseProgress: 1.0,
        duration: 0.7,
        ease: 'power3.in',
        onUpdate: update,
      });

    // ─── SCENE 5: FLASH (6.2s – 6.4s) ───────────────────────────────
    tl.call(() => { currentPhase = 'flash'; update(); })
      .to(obj, {
        duration: 0.2,
        onUpdate: update,
      });

    // ─── SCENE 6: EXPLOSION (6.4s – 7.5s) ───────────────────────────
    tl.call(() => { currentPhase = 'explode'; update(); })
      .to(obj, {
        explodeProgress: 1.0,
        duration: 1.1,
        ease: 'power2.out',
        onUpdate: update,
      });

    // ─── DONE (7.5s+) ────────────────────────────────────────────────
    tl.call(() => {
      currentPhase = 'done';
      update({ phase: 'done' });
      onCompleteRef.current();
    });

    return () => {
      tl.kill();
    };
  }, []);

  return stateRef.current;
}
