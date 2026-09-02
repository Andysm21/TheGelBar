'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './NailProcess.module.css';
import { useNailProcessAnimation, Step } from './useNailProcessAnimation';

const ASSETS = {
  base: '/nails/nail-base.png',
  baseCoat: '/nails/base-coat.png',
  color: '/nails/nail-color.png',
  design: '/nails/nail-design.png',
  topCoat: '/nails/top-coat.png',
};

function preloadImages(srcs: string[]) {
  return Promise.all(
    srcs.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        })
    )
  );
}

function Sparkle({
  innerRef,
  style,
}: {
  innerRef: (el: HTMLSpanElement | null) => void;
  style: React.CSSProperties;
}) {
  return (
    <span ref={innerRef} className={styles.sparkle} style={style}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0 L14 9 L24 12 L14 15 L12 24 L10 15 L0 12 L10 9 Z" fill="#fff" opacity="0.9" />
      </svg>
    </span>
  );
}

export default function NailProcess() {
  const t = useTranslations('process');
  const sectionRef = useRef<HTMLElement>(null);
  const baseCoatRef = useRef<HTMLImageElement>(null);
  const colorRef = useRef<HTMLImageElement>(null);
  const designRef = useRef<HTMLImageElement>(null);
  const topCoatRef = useRef<HTMLImageElement>(null);
  const sparkleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  const [assetsReady, setAssetsReady] = useState(false);

  const steps: Step[] = [
    { step: '1/5', title: t('step1Title'), desc: t('step1Desc') },
    { step: '2/5', title: t('step2Title'), desc: t('step2Desc') },
    { step: '3/5', title: t('step3Title'), desc: t('step3Desc') },
    { step: '4/5', title: t('step4Title'), desc: t('step4Desc') },
    { step: '5/5', title: t('step5Title'), desc: t('step5Desc') },
  ];

  useEffect(() => {
    let cancelled = false;
    preloadImages(Object.values(ASSETS)).then(() => {
      if (!cancelled) setAssetsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useNailProcessAnimation({
    sectionRef,
    overlayRefs: { baseCoat: baseCoatRef, color: colorRef, design: designRef, topCoat: topCoatRef },
    sparkleRefs,
    progressFillRef,
    captionRefs: { eyebrow: eyebrowRef, title: titleRef, desc: descRef },
    steps,
    enabled: assetsReady,
  });

  const sparklePositions: React.CSSProperties[] = [
    { top: '18%', left: '68%' },
    { top: '58%', left: '78%' },
    { top: '38%', left: '14%' },
  ];

  return (
    <section ref={sectionRef} className={styles.section} aria-label={t('title')}>
      <div className={styles.sticky}>
        <div className={styles.composition}>
          <img src={ASSETS.base} alt={steps[0].title} className={`${styles.layer} ${styles.baseLayer}`} />
          <img ref={baseCoatRef} src={ASSETS.baseCoat} alt="" aria-hidden="true" className={`${styles.layer} ${styles.overlayLayer}`} />
          <img ref={colorRef} src={ASSETS.color} alt="" aria-hidden="true" className={`${styles.layer} ${styles.overlayLayer}`} />
          <img ref={designRef} src={ASSETS.design} alt="" aria-hidden="true" className={`${styles.layer} ${styles.overlayLayer}`} />
          <img ref={topCoatRef} src={ASSETS.topCoat} alt="" aria-hidden="true" className={`${styles.layer} ${styles.overlayLayer}`} />

          <div className={styles.sparkleLayer}>
            {sparklePositions.map((pos, i) => (
              <Sparkle key={i} innerRef={(el) => (sparkleRefs.current[i] = el)} style={pos} />
            ))}
          </div>
        </div>

        <div className={styles.progressTrack}>
          <div ref={progressFillRef} className={styles.progressFill} />
        </div>

        <div className={styles.caption}>
          <p ref={eyebrowRef} className={styles.captionEyebrow}>
            1/5
          </p>
          <p ref={titleRef} className={styles.captionTitle}>
            {steps[0].title}
          </p>
          <p ref={descRef} className={styles.captionDesc}>
            {steps[0].desc}
          </p>
        </div>
      </div>
    </section>
  );
}
