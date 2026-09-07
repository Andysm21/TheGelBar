'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Fade-slides its children in when they scroll into view. Starts fully
 * visible and only hides itself once JS confirms the observer is
 * running — so with JS off, or before hydration, nothing is ever
 * stranded at opacity:0.
 */
export default function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    setArmed(true);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hidden = armed && !shown;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? 'translateY(24px)' : 'none',
        transition: `opacity .75s cubic-bezier(.22,.8,.3,1) ${delay}ms, transform .75s cubic-bezier(.22,.8,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
