import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import NailProcess from '@/components/NailProcess/NailProcess';
import FloatingNails from '@/components/FloatingNails/FloatingNails';
import styles from './page.module.css';

const ADDRESS = '7 Ahmed Oraby, Madinet Al Eelam, Agouza, Giza Governorate 3755201';
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;
const MAPS_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`;

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();

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
        <h2>Who we are</h2>
        <p className="sans" style={{ textAlign: 'center', color: 'var(--sub)', fontSize: '.85rem', lineHeight: 1.9, maxWidth: 420, margin: '0 auto' }}>
          {t('brand.name')} is a solo nail studio run by Mariam Sherif El Gergawy in {t('brand.location')}. Every
          appointment is one-on-one, by reservation only — no rush, no crowd, just careful work on your nails.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <Link href={`/${locale}/services`} className={styles.bookBtn} style={{ margin: 0 }}>
            View services
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Location</h2>
        <p className="sans" style={{ textAlign: 'center', color: 'var(--sub)', fontSize: '.85rem', marginBottom: '1.5rem' }}>
          {ADDRESS}
        </p>
        <div className={styles.mapEmbedWrap}>
          <iframe
            src={MAPS_EMBED_URL}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="The Gel Bar location"
          />
        </div>
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
          <div className={styles.mapCard}>
            <span>📍</span>
            <div>
              <div style={{ fontWeight: 600 }}>Open in Google Maps</div>
              <div className="sans" style={{ fontSize: '.7rem', color: 'var(--sub)' }}>
                {ADDRESS}
              </div>
            </div>
          </div>
        </a>
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
