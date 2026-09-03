'use client';

import styles from './NailLoader.module.css';

type Size = 'full' | 'inline' | 'mini';

const CAPTIONS = [
  'Buffing the pixels…',
  'Curing under the lamp…',
  'One coat at a time…',
  'Shaping things up…',
  'Almost polished…',
];

function pickCaption() {
  return CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
}

/**
 * Five nails, five distinct hand-painted finishes, painting in sequence
 * then wiping clean and looping. `size="full"` is the splash/page-load
 * treatment (with caption); `inline` sits next to body text; `mini` is a
 * single nail for buttons.
 */
export default function NailLoader({ size = 'full', caption }: { size?: Size; caption?: string | null }) {
  const showCaption = size === 'full' && caption !== null;
  const text = caption ?? pickCaption();

  if (size === 'mini') {
    return (
      <span className={styles.mini} role="status" aria-label="Loading">
        <Nail index={0} kind="marble" />
      </span>
    );
  }

  return (
    <div className={size === 'full' ? styles.full : styles.inlineWrap} role="status" aria-label="Loading">
      <Defs />
      <div className={styles.row}>
        <Nail index={0} kind="marble" />
        <Nail index={1} kind="foil" />
        <Nail index={2} kind="chrome" />
        <Nail index={3} kind="dotTip" />
        <Nail index={4} kind="floral" />
      </div>
      {showCaption && <div className={styles.caption}>{text}</div>}
    </div>
  );
}

function Defs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="nl-marble" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7e3ea" />
          <stop offset="100%" stopColor="#e2b6c9" />
        </linearGradient>
        <linearGradient id="nl-chrome" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f6cf8e" />
          <stop offset="45%" stopColor="#e8a0c4" />
          <stop offset="100%" stopColor="#982552" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const NAIL_PATH = 'M17 1c8 0 15 9 15 24 0 15-6 26-15 26S2 40 2 25C2 10 9 1 17 1Z';

function Nail({ index, kind }: { index: number; kind: 'marble' | 'foil' | 'chrome' | 'dotTip' | 'floral' }) {
  const clipId = `nl-clip-${kind}-${index}`;
  return (
    <div className={styles.nail} style={{ animationDelay: `${index * 0.22}s` } as React.CSSProperties}>
      <svg viewBox="0 0 34 52" className={styles.svg}>
        <path className={styles.bed} d={NAIL_PATH} />
        <clipPath id={clipId}>
          <path d={NAIL_PATH} />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <rect className={`${styles.polish} ${styles['polish-' + kind]}`} x="0" y="0" width="34" height="52" style={{ animationDelay: `${index * 0.22}s` } as React.CSSProperties} />
          <g className={styles.design} style={{ animationDelay: `${index * 0.22}s` } as React.CSSProperties}>
            {kind === 'marble' && (
              <>
                <path d="M0 14c8-4 14 2 22-2s10 6 12 2v10c-6 4-10-3-18 1s-12-2-16 2Z" fill="#982552" opacity="0.35" />
                <path d="M-2 30c10-6 16 3 24-3s10 5 12 0v8c-8 5-14-2-22 3s-12-3-14 1Z" fill="#ffffff" opacity="0.4" />
              </>
            )}
            {kind === 'foil' && (
              <>
                <polygon points="9,10 12,13 8,15" fill="#f6cf8e" />
                <polygon points="22,8 25,11 21,12" fill="#f6cf8e" />
                <polygon points="14,20 17,22 13,24" fill="#e8a0c4" />
                <polygon points="24,24 27,27 23,28" fill="#f6cf8e" />
                <polygon points="10,33 13,36 9,37" fill="#e8a0c4" />
                <polygon points="20,38 23,40 19,42" fill="#f6cf8e" />
              </>
            )}
            {kind === 'chrome' && (
              <>
                <circle cx="10" cy="14" r="1.2" fill="#fff" />
                <circle cx="22" cy="10" r="1" fill="#f6cf8e" />
                <circle cx="24" cy="22" r="1.3" fill="#fff" />
                <circle cx="12" cy="27" r="1" fill="#f6cf8e" />
                <circle cx="20" cy="33" r="1.2" fill="#fff" />
              </>
            )}
            {kind === 'dotTip' && (
              <>
                <path d="M17 1c8 0 15 9 15 24 0 3-.3 6-1 9H3c-.7-3-1-6-1-9C2 10 9 1 17 1Z" fill="#ffffff" />
                <circle cx="12" cy="24" r="2" fill="#fff" />
                <circle cx="22" cy="28" r="2" fill="#fff" />
                <circle cx="14" cy="34" r="2" fill="#fff" />
                <circle cx="20" cy="40" r="2" fill="#fff" />
              </>
            )}
            {kind === 'floral' && (
              <>
                <ellipse cx="17" cy="12" rx="3.4" ry="2.3" fill="#982552" transform="rotate(0 17 12)" />
                <ellipse cx="12" cy="16" rx="3.4" ry="2.3" fill="#982552" transform="rotate(72 12 16)" />
                <ellipse cx="14.5" cy="22" rx="3.4" ry="2.3" fill="#982552" transform="rotate(144 14.5 22)" />
                <ellipse cx="20" cy="21.5" rx="3.4" ry="2.3" fill="#982552" transform="rotate(-144 20 21.5)" />
                <ellipse cx="21.5" cy="15.5" rx="3.4" ry="2.3" fill="#982552" transform="rotate(-72 21.5 15.5)" />
                <circle cx="17" cy="17.5" r="2" fill="#f6cf8e" />
                <path d="M17 24c-1 6-2 10-4 14" stroke="#5c8a5c" strokeWidth="1" fill="none" />
                <ellipse cx="12" cy="34" rx="2.4" ry="1.3" fill="#7ba86f" transform="rotate(-30 12 34)" />
              </>
            )}
          </g>
          <rect className={styles.shine} x="6" y="4" width="6" height="44" rx="3" style={{ animationDelay: `${index * 0.22}s` } as React.CSSProperties} />
        </g>
      </svg>
    </div>
  );
}
