'use client';

import styles from './FloatingNails.module.css';

// Real nail-design closeups, cropped from Mariam's own work photos
// (public/nails-gallery → public/gallery).
const NAIL_IMAGES = [
  '/gallery/nail-crop-1.jpg',
  '/gallery/nail-crop-2.jpg',
  '/gallery/nail-crop-3.jpg',
  '/gallery/nail-crop-4.jpg',
  '/gallery/nail-crop-5.jpg',
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
