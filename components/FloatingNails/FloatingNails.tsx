'use client';

import styles from './FloatingNails.module.css';

// TODO(real photos): replace these with cropped nail-design closeups
// extracted from Mariam's own work photos, once she sends them as file
// attachments (pasted chat images aren't accessible as files — see
// DEPLOY.md). Each entry is one floating nail image; keep 5-6 for the
// hero cluster. Crop tight to a single nail, square-ish aspect, transparent
// or matching background works best.
const NAIL_IMAGES = [
  '/gallery/nail-crop-1.png',
  '/gallery/nail-crop-2.png',
  '/gallery/nail-crop-3.png',
  '/gallery/nail-crop-4.png',
  '/gallery/nail-crop-5.png',
];

const POSITIONS = [
  { className: styles.n1 },
  { className: styles.n2 },
  { className: styles.n3 },
  { className: styles.n4 },
  { className: styles.n5 },
];

export default function FloatingNails() {
  return (
    <div className={styles.stage}>
      {POSITIONS.map((pos, i) => (
        <div key={i} className={`${styles.nail} ${pos.className}`}>
          <img
            src={NAIL_IMAGES[i % NAIL_IMAGES.length]}
            alt=""
            aria-hidden="true"
            onError={(e) => {
              // Placeholder swatch until real crops exist at /public/gallery
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.style.background =
                'linear-gradient(160deg, var(--gold), var(--pink))';
            }}
          />
        </div>
      ))}
    </div>
  );
}
