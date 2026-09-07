import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getServiceCatalog, getDesignOptions } from '@/lib/supabase/cached-queries';
import ServicesGrid from '@/components/ServicesGrid';
import MarqueeBand from '@/components/MarqueeBand';
import Reveal from '@/components/Reveal';
import styles from './services.module.css';

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const [services, designs] = await Promise.all([getServiceCatalog(), getDesignOptions()]);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className="eyebrow">Menu &middot; Prices</p>
        <h1 className={styles.title}>{t('services.title')}</h1>
        <p className={styles.sub}>
          Real pricing, no surprises. Tap any service to see what it includes — design add-ons are listed below.
        </p>
      </header>

      <div className={styles.gridWrap}>
        <ServicesGrid services={services} locale={locale} />
      </div>

      <MarqueeBand items={['Hand-painted detail', 'Gel & hard gel', 'Design add-ons available']} />

      <section className={styles.addons}>
        <Reveal className={styles.addonsHead}>
          <p className="eyebrow">Add-ons</p>
          <h2 className={styles.addonsTitle}>Nail art &amp; finishes</h2>
          <p className={styles.sub}>Layer any of these onto a base service when you book.</p>
        </Reveal>
        <Reveal delay={100}>
          <ul className={styles.addonList}>
            {designs.map((d) => (
              <li key={d.id} className={styles.addonRow}>
                <span className={styles.addonName}>{locale === 'ar' ? d.name_ar : d.name_en}</span>
                <span className={styles.addonDots} aria-hidden="true" />
                <span className={styles.addonPrice}>+{d.price_egp} EGP</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <section className={styles.cta}>
        <Reveal>
          <p className={`eyebrow ${styles.ctaEyebrow}`}>Ready?</p>
          <h2 className={styles.ctaTitle}>Pick your service and a time</h2>
          <Link href={`/${locale}/book`} className="btn btn-light">
            {t('hero.cta')}
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
