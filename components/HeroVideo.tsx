'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * Getting true autoplay on every phone/browser needs more than the
 * plain `autoplay muted playsinline` attributes:
 * - `muted` must also be set as a JS property (not just the attribute)
 *   before play() is called, or some mobile browsers still block it.
 * - play() has to be attempted as early as possible (useLayoutEffect,
 *   not useEffect) and retried — canplay/loadeddata don't fire
 *   reliably on every device, so this also polls on a short interval
 *   for the first few seconds after mount.
 * - A user gesture (first touch/scroll/click) is honored as a last
 *   resort by every browser, in case a device-level setting (iOS Low
 *   Power Mode is the one real exception Apple gives no JS override
 *   for) blocked the programmatic attempts entirely.
 */
export default function HeroVideo({ className }: { className: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useLayoutEffect(() => {
    const video = ref.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const tryPlay = () => {
      if (!video.paused) return;
      video.play().catch(() => {
        // Blocked for now — the poll below and the gesture listeners keep retrying.
      });
    };

    tryPlay();
    video.addEventListener('canplay', tryPlay);
    video.addEventListener('canplaythrough', tryPlay);
    video.addEventListener('loadeddata', tryPlay);
    video.addEventListener('loadedmetadata', tryPlay);

    // Some mobile browsers never fire the events above reliably —
    // brute-force retry for the first few seconds covers those.
    let attempts = 0;
    const poll = window.setInterval(() => {
      attempts += 1;
      if (!video.paused || attempts > 15) {
        window.clearInterval(poll);
        return;
      }
      tryPlay();
    }, 250);

    const onGesture = () => tryPlay();
    const opts = { passive: true } as const;
    window.addEventListener('touchstart', onGesture, opts);
    window.addEventListener('scroll', onGesture, opts);
    window.addEventListener('click', onGesture, opts);
    document.addEventListener('visibilitychange', tryPlay);

    return () => {
      window.clearInterval(poll);
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('canplaythrough', tryPlay);
      video.removeEventListener('loadeddata', tryPlay);
      video.removeEventListener('loadedmetadata', tryPlay);
      window.removeEventListener('touchstart', onGesture);
      window.removeEventListener('scroll', onGesture);
      window.removeEventListener('click', onGesture);
      document.removeEventListener('visibilitychange', tryPlay);
    };
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      // Legacy/vendor variants some mobile WebViews still key off:
      // eslint-disable-next-line react/no-unknown-property
      webkit-playsinline="true"
      // eslint-disable-next-line react/no-unknown-property
      x5-playsinline="true"
      disableRemotePlayback
      disablePictureInPicture
      controls={false}
      controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
      tabIndex={-1}
      preload="auto"
    >
      <source src="/GelbarBGVideo.mp4" type="video/mp4" />
    </video>
  );
}
