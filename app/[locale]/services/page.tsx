import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { SERVICES_CATALOG } from '@/lib/services-catalog';
import styles from './services.module.css';

// Cycle through the real work photos so every service card has an
// image, without needing a dedicated photo shot per service yet.
const GALLERY_IMAGES = Array.from({ length: 10 }, (_, i) => `/gallery/work-${i + 1}.jpg`);

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{t('services.title')}</h1>
      <p className="sans" style={{ textAlign: 'center', color: 'var(--sub)', fontSize: '.8rem', marginBottom: '2rem' }}>
        Every service, real pricing — no guesswork.
      </p>
      <div className={styles.grid}>
        {SERVICES_CATALOG.map((s, i) => (
          <div key={s.id} className={styles.card}>
            <div className={styles.imgWrap}>
              <img src={GALLERY_IMAGES[i % GALLERY_IMAGES.length]} alt="" loading="lazy" />
            </div>
            <div className={styles.body}>
              <h3>{locale === 'ar' ? s.nameAr : s.nameEn}</h3>
              <div className={styles.price}>{s.basePriceEgp} EGP</div>
            </div>
          </div>
        ))}
      </div>
      <Link href={`/${locale}/book`} className={styles.bookBtn}>
        {t('hero.cta')}
      </Link>
    </div>
  );
}
