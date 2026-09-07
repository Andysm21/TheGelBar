'use client';

import { useEffect, useState } from 'react';
import Reveal from './Reveal';
import styles from './ServicesGrid.module.css';

interface ServiceRow {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  base_price_egp: number;
  base_minutes: number;
  design_tier: 'none' | 'simple' | 'complex';
}

const GALLERY_IMAGES = Array.from({ length: 10 }, (_, i) => `/gallery/work-${i + 1}.jpg`);

function eyebrowFor(tier: ServiceRow['design_tier']) {
  return tier === 'complex' ? 'Detailed' : tier === 'simple' ? 'Signature' : 'Essential';
}

export default function ServicesGrid({ services, locale }: { services: ServiceRow[]; locale: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = services.find((s) => s.id === openId) ?? null;

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
        {services.map((s, i) => (
          <Reveal key={s.id} delay={(i % 3) * 100}>
            <button className={styles.card} onClick={() => setOpenId(s.id)}>
              <div className={styles.imgWrap}>
                <img src={GALLERY_IMAGES[i % GALLERY_IMAGES.length]} alt="" loading="lazy" />
                <span className={styles.veil}>View details</span>
              </div>
              <p className={`eyebrow ${styles.cardEyebrow}`}>{eyebrowFor(s.design_tier)}</p>
              <h3 className={styles.cardTitle}>{locale === 'ar' ? s.name_ar : s.name_en}</h3>
              <div className={styles.price}>{s.base_price_egp} EGP</div>
            </button>
          </Reveal>
        ))}
      </div>

      {open && (
        <div className={styles.overlay} onClick={() => setOpenId(null)} role="dialog" aria-modal="true">
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.close} onClick={() => setOpenId(null)} aria-label="Close">
              ×
            </button>
            <div className={styles.modalImgWrap}>
              <img src={GALLERY_IMAGES[services.findIndex((s) => s.id === open.id) % GALLERY_IMAGES.length]} alt="" />
            </div>
            <div className={styles.modalBody}>
              <p className="eyebrow" style={{ display: 'block', marginBottom: '.6rem' }}>
                {eyebrowFor(open.design_tier)}
              </p>
              <h3>{locale === 'ar' ? open.name_ar : open.name_en}</h3>
              <p className={styles.modalDesc}>{locale === 'ar' ? open.description_ar : open.description_en}</p>
              <div className={styles.modalMeta}>
                <span className={styles.modalPrice}>{open.base_price_egp} EGP</span>
                <a href={`/${locale}/book`} className="btn btn-sm btn-solid">
                  Book this
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
