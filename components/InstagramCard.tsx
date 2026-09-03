import styles from './InstagramCard.module.css';

const INSTAGRAM_URL = 'https://www.instagram.com/thegelbar.eg';

export default function InstagramCard() {
  return (
    <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={styles.link}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="2" width="20" height="20" rx="5.5" />
            <circle cx="12" cy="12" r="4.3" />
            <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>@thegelbar.eg</div>
          <div className="sans" style={{ fontSize: '.7rem', color: 'var(--sub)' }}>
            Follow us on Instagram
          </div>
        </div>
      </div>
    </a>
  );
}
