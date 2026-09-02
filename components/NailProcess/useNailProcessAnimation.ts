'use client';

import { useEffect, RefObject, MutableRefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface Step {
  step: string;
  title: string;
  desc: string;
}

interface OverlayRefs {
  baseCoat: RefObject<HTMLImageElement>;
  color: RefObject<HTMLImageElement>;
  design: RefObject<HTMLImageElement>;
  topCoat: RefObject<HTMLImageElement>;
}

interface CaptionRefs {
  eyebrow: RefObject<HTMLParagraphElement>;
  title: RefObject<HTMLParagraphElement>;
  desc: RefObject<HTMLParagraphElement>;
}

export function useNailProcessAnimation({
  sectionRef,
  overlayRefs,
  sparkleRefs,
  progressFillRef,
  captionRefs,
  steps,
  enabled,
}: {
  sectionRef: RefObject<HTMLElement>;
  overlayRefs: OverlayRefs;
  sparkleRefs: MutableRefObject<(HTMLSpanElement | null)[]>;
  progressFillRef: RefObject<HTMLDivElement>;
  captionRefs: CaptionRefs;
  steps: Step[];
  enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled || !sectionRef.current) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      const layers = [overlayRefs.baseCoat, overlayRefs.color, overlayRefs.design, overlayRefs.topCoat]
        .map((r) => r.current)
        .filter((el): el is HTMLImageElement => !!el);

      if (reduceMotion) {
        layers.forEach((el) => gsap.set(el, { opacity: 1, y: 0 }));
        sparkleRefs.current.forEach((el) => el && gsap.set(el, { opacity: 1, scale: 1 }));
        if (progressFillRef.current) gsap.set(progressFillRef.current, { height: '100%' });
        return;
      }

      layers.forEach((el) => gsap.set(el, { opacity: 0, y: -60 }));
      sparkleRefs.current.forEach((el) => el && gsap.set(el, { opacity: 0, scale: 0.4 }));

      const setActiveCaption = (index: number) => {
        const s = steps[index];
        if (!s || !captionRefs.eyebrow.current) return;
        captionRefs.eyebrow.current.textContent = s.step;
        captionRefs.title.current!.textContent = s.title;
        captionRefs.desc.current!.textContent = s.desc;
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          onUpdate: (self) => {
            if (progressFillRef.current) {
              progressFillRef.current.style.height = `${self.progress * 100}%`;
            }
            const idx = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
            setActiveCaption(idx);
          },
        },
        defaults: { ease: 'power2.out' },
      });

      tl.addLabel('phase1');

      tl.addLabel('phase2').to(overlayRefs.baseCoat.current, { y: 0, opacity: 1, duration: 1 }, 'phase2');

      tl.addLabel('phase3').to(overlayRefs.color.current, { y: 0, opacity: 1, duration: 1 }, 'phase3');

      tl.addLabel('phase4').to(overlayRefs.design.current, { y: 0, opacity: 1, duration: 1 }, 'phase4');

      tl.addLabel('phase5')
        .to(overlayRefs.topCoat.current, { y: 0, opacity: 1, duration: 1 }, 'phase5')
        .to(overlayRefs.topCoat.current, { scale: 1.015, duration: 0.25, ease: 'power1.out' }, '>-0.1')
        .to(overlayRefs.topCoat.current, { scale: 1, duration: 0.35, ease: 'power2.inOut' });

      tl.addLabel('phase6');
      sparkleRefs.current.forEach((el, i) => {
        if (!el) return;
        tl.to(el, { opacity: 1, scale: 1, duration: 0.35, ease: 'power1.out' }, `phase6+=${i * 0.12}`).to(
          el,
          { opacity: 0.3, duration: 0.4, ease: 'power1.inOut' },
          '>-0.05'
        );
      });
    }, sectionRef);

    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(refreshId);
      ctx.revert();
    };
  }, [enabled, sectionRef, overlayRefs, sparkleRefs, progressFillRef, captionRefs, steps]);
}
