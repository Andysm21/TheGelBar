import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getServiceCatalog } from '@/lib/supabase/cached-queries';
import styles from './services.module.css';

// Cycle through the real work photos so every service card has an
// image, without needing a dedicated photo shot per service yet.
const GALLERY_IMAGES = Array.from({ length: 10 }, (_, i) => `/gallery/work-${i + 1}.jpg`);

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const services = await getServiceCatalog();

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{t('services.title')}</h1>
      <p className="sans" style={{ textAlign: 'center', color: 'var(--sub)', fontSize: '.8rem', marginBottom: '2rem' }}>
        Every service, real pricing — no guesswork.
      </p>
      <div className={styles.grid}>
        {services.map((s, i) => (
          <div key={s.id} className={styles.card}>
            <div className={styles.imgWrap}>
              <img src={GALLERY_IMAGES[i % GALLERY_IMAGES.length]} alt="" loading="lazy" />
            </div>
            <div className={styles.body}>
              <h3>{locale === 'ar' ? s.name_ar : s.name_en}</h3>
              <p className="sans" style={{ fontSize: '.75rem', color: 'var(--sub)', marginTop: '.3rem' }}>
                {locale === 'ar' ? s.description_ar : s.description_en}
              </p>
              <div className={styles.price}>{s.base_price_egp} EGP</div>
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
