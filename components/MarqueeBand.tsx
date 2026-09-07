import styles from './MarqueeBand.module.css';

/** Scrolling text divider — the band pattern used by several of the
 *  reference salon sites to break up long pages. */
export default function MarqueeBand({ items, tone = 'gold' }: { items: string[]; tone?: 'gold' | 'dark' }) {
  const line = items.join('   ✦   ');
  return (
    <div className={`${styles.band} ${tone === 'dark' ? styles.dark : ''}`} aria-hidden="true">
      <div className={styles.track}>
        {Array.from({ length: 2 }).map((_, i) => (
          <span key={i} className={styles.run}>
            {line}   ✦&nbsp;&nbsp;&nbsp;
          </span>
        ))}
      </div>
    </div>
  );
}
