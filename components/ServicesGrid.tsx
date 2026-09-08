'use client';

import { useEffect, useState } from 'react';
import Reveal from './Reveal';
import styles from './ServicesGrid.module.css';

interface Variant {
  id: string;
  kind: 'color' | 'simple' | 'complex';
  name_en: string;
  name_ar: string;
  price_egp: number;
  duration_minutes: number;
  requires_inspo: boolean;
}
interface Service {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  service_variants: Variant[];
}

const SERVICE_IMAGES: Record<string, string> = {
  'gel-manicure': '/gallery/work-4.jpg',
  'hard-gel-overlay': '/gallery/work-6.jpg',
  'hard-gel-new-set': '/gallery/work-8.jpg',
  'false-nails': '/gallery/work-2.jpg',
};

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export default function ServicesGrid({
  services,
  locale,
  bookHref,
}: {
  services: Service[];
  locale: string;
  bookHref: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = services.find((s) => s.id === openId) ?? null;
  const isAr = locale === 'ar';

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenId(null);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div className={styles.grid}>
        {services.map((s, i) => {
          const prices = s.service_variants.map((v) => v.price_egp);
          const from = prices.length ? Math.min(...prices) : 0;
          return (
            <Reveal key={s.id} delay={(i % 3) * 100}>
              <button className={styles.card} onClick={() => setOpenId(s.id)}>
                <div className={styles.imgWrap}>
                  <img src={SERVICE_IMAGES[s.id] ?? '/gallery/work-1.jpg'} alt="" loading="lazy" />
                  <span className={styles.veil}>View options</span>
                </div>
                <p className={`eyebrow ${styles.cardEyebrow}`}>{s.service_variants.length} options</p>
                <h3 className={styles.cardTitle}>{isAr ? s.name_ar : s.name_en}</h3>
                <div className={styles.price}>from {from} EGP</div>
              </button>
            </Reveal>
          );
        })}
      </div>

      {open && (
        <div className={styles.overlay} onClick={() => setOpenId(null)} role="dialog" aria-modal="true">
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.close} onClick={() => setOpenId(null)} aria-label="Close">
              ×
            </button>
            <div className={styles.modalImgWrap}>
              <img src={SERVICE_IMAGES[open.id] ?? '/gallery/work-1.jpg'} alt="" />
            </div>
            <div className={styles.modalBody}>
              <p className="eyebrow" style={{ display: 'block', marginBottom: '.6rem' }}>
                Service
              </p>
              <h3>{isAr ? open.name_ar : open.name_en}</h3>
              {(isAr ? open.description_ar : open.description_en) && (
                <p className={styles.modalDesc}>{isAr ? open.description_ar : open.description_en}</p>
              )}

              <ul className={styles.variantList}>
                {open.service_variants.map((v) => (
                  <li key={v.id} className={styles.variantRow}>
                    <span>
                      <span className={styles.variantName}>{isAr ? v.name_ar : v.name_en}</span>
                      <span className={styles.variantMeta}>
                        {formatDuration(v.duration_minutes)}
                        {v.requires_inspo ? ' · inspo photo required' : ''}
                      </span>
                    </span>
                    <span className={styles.variantPrice}>{v.price_egp} EGP</span>
                  </li>
                ))}
              </ul>

              <a href={bookHref} className="btn btn-solid btn-block">
                Book this service
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
