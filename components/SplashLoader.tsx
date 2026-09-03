'use client';

import { useEffect, useState } from 'react';
import NailLoader from './NailLoader/NailLoader';
import styles from './SplashLoader.module.css';

const SESSION_KEY = 'gelbar-splash-shown';
const VISIBLE_MS = 2200;
const FADE_MS = 400;

export default function SplashLoader() {
  const [phase, setPhase] = useState<'hidden' | 'visible' | 'fading'>('hidden');

  useEffect(() => {
    let alreadyShown = true;
    try {
      alreadyShown = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      // sessionStorage unavailable (private mode etc) — just skip the splash
    }
    if (alreadyShown) return;

    setPhase('visible');
    const fadeTimer = setTimeout(() => setPhase('fading'), VISIBLE_MS);
    const hideTimer = setTimeout(() => {
      setPhase('hidden');
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        // ignore
      }
    }, VISIBLE_MS + FADE_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <div className={`${styles.overlay} ${phase === 'fading' ? styles.fadeOut : ''}`}>
      <NailLoader size="full" />
    </div>
  );
}
