import { getTranslations } from 'next-intl/server';
import styles from './work.module.css';

const GALLERY_IMAGES = Array.from({ length: 10 }, (_, i) => `/gallery/work-${i + 1}.jpg`);

export default async function OurWorkPage() {
  const t = await getTranslations();

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Our Work</h1>
      <p className="sans" style={{ textAlign: 'center', color: 'var(--sub)', fontSize: '.8rem', marginBottom: '2rem' }}>
        {t('brand.name')} · {t('brand.location')}
      </p>
      <div className={styles.gallery}>
        {GALLERY_IMAGES.map((src, i) => (
          <div key={i} className={styles.galItem}>
            <img src={src} alt="" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}
