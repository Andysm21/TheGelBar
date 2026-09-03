'use client';

import { useEffect, useRef } from 'react';

/**
 * Plain <video autoPlay> is not enough on iOS Safari — Low Power Mode
 * (and sometimes just a cold load) silently ignores autoplay and leaves
 * the video parked on its first frame, which then looks like a static
 * photo forever. This forces play() on mount, retries on the video's
 * own 'canplay'/'loadeddata' events, and nudges again on the first
 * touch/scroll/click — those count as a user gesture, which Safari will
 * honor even when plain autoplay was blocked. No poster image, so a
 * failed play never falls back to looking like a static photo — worst
 * case is the plain scrim color, never a misleading still frame.
 */
export default function HeroVideo({ className }: { className: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const tryPlay = () => {
      video.play().catch(() => {
        // Autoplay blocked — will retry on the next event/gesture below.
      });
    };

    tryPlay();
    video.addEventListener('canplay', tryPlay);
    video.addEventListener('loadeddata', tryPlay);

    const onGesture = () => {
      if (video.paused) tryPlay();
    };
    const opts = { passive: true, once: false } as const;
    window.addEventListener('touchstart', onGesture, opts);
    window.addEventListener('scroll', onGesture, opts);
    window.addEventListener('click', onGesture, opts);

    return () => {
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('loadeddata', tryPlay);
      window.removeEventListener('touchstart', onGesture);
      window.removeEventListener('scroll', onGesture);
      window.removeEventListener('click', onGesture);
    };
  }, []);

  return (
    <video ref={ref} className={className} autoPlay muted loop playsInline preload="auto">
      <source src="/GelbarBGVideo.mp4" type="video/mp4" />
    </video>
  );
}
