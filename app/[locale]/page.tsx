import { useTranslations } from 'next-intl';
import Link from 'next/link';
import NailProcess from '@/components/NailProcess/NailProcess';
import FloatingNails from '@/components/FloatingNails/FloatingNails';
import { SERVICES_CATALOG } from '@/lib/services-catalog';
import { formatDuration } from '@/lib/format';
import styles from './page.module.css';

// Real work photos (public/nails-gallery → public/gallery). No captions
// per her request — grid tiles only.
const GALLERY_IMAGES = Array.from({ length: 10 }, (_, i) => `/gallery/work-${i + 1}.jpg`);

export default function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations();

  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <div className={styles.glowOrb} />
        <FloatingNails />
        <div className={styles.brandName}>{t('brand.name')}</div>
        <div className={styles.tag}>{t('hero.subtitle')}</div>
        <Link href={`/${locale}/book`} className={`btn btn-primary ${styles.ctaHero}`}>
          {t('hero.cta')}
        </Link>
        <div className={styles.scrollHint}>{t('hero.scrollHint')} ↓</div>
      </section>

      <div className={styles.processIntro}>
        <h2>{t('process.title')}</h2>
        <p className="sans">{t('process.subtitle')}</p>
      </div>

      <NailProcess />

      <section className={styles.section}>
        <h2>{t('services.title')}</h2>
        <div className={styles.services}>
          {SERVICES_CATALOG.map((s) => (
            <div key={s.id} className={styles.serviceCard}>
              <div>
                <h3>{locale === 'ar' ? s.nameAr : s.nameEn}</h3>
                <p className="sans">{formatDuration(s.baseMinutes)}</p>
              </div>
              <div className={styles.price}>{s.basePriceEgp} EGP</div>
            </div>
          ))}
        </div>
        <Link href={`/${locale}/book`} className={styles.bookBtn}>
          {t('hero.cta')}
        </Link>
      </section>

      <section className={styles.section}>
        <h2>Recent work</h2>
        <div className={styles.gallery}>
          {GALLERY_IMAGES.map((src, i) => (
            <div key={i} className={styles.galItem}>
              <img src={src} alt="" loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        {t('brand.name')} &middot; {t('brand.location')} &middot;{' '}
        <Link href={`/${locale}/login`} style={{ color: 'var(--deep)' }}>
          {t('nav.login')}
        </Link>{' '}
        &middot;{' '}
        <Link href={`/${locale}/admin/dashboard`} style={{ color: 'var(--deep)' }}>
          Admin
        </Link>
      </footer>
    </div>
  );
}
