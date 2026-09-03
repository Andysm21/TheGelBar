'use client';

import { useEffect, useState } from 'react';
import styles from './ServicesGrid.module.css';

interface ServiceRow {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  base_price_egp: number;
}

const GALLERY_IMAGES = Array.from({ length: 10 }, (_, i) => `/gallery/work-${i + 1}.jpg`);

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
          <button key={s.id} className={styles.card} onClick={() => setOpenId(s.id)}>
            <div className={styles.imgWrap}>
              <img src={GALLERY_IMAGES[i % GALLERY_IMAGES.length]} alt="" loading="lazy" />
            </div>
            <div className={styles.body}>
              <h3>{locale === 'ar' ? s.name_ar : s.name_en}</h3>
              <div className={styles.price}>{s.base_price_egp} EGP</div>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div className={styles.overlay} onClick={() => setOpenId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.close} onClick={() => setOpenId(null)} aria-label="Close">
              ×
            </button>
            <div className={styles.modalImgWrap}>
              <img src={GALLERY_IMAGES[services.findIndex((s) => s.id === open.id) % GALLERY_IMAGES.length]} alt="" />
            </div>
            <div className={styles.modalBody}>
              <h3>{locale === 'ar' ? open.name_ar : open.name_en}</h3>
              <p className="sans">{locale === 'ar' ? open.description_ar : open.description_en}</p>
              <div className={styles.modalPrice}>{open.base_price_egp} EGP</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
