import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getServiceCatalog, getAddons } from '@/lib/supabase/cached-queries';
import ServicesGrid from '@/components/ServicesGrid';
import MarqueeBand from '@/components/MarqueeBand';
import Reveal from '@/components/Reveal';
import styles from './services.module.css';

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const [services, addons] = await Promise.all([getServiceCatalog(), getAddons()]);

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
        <ServicesGrid services={services as any} locale={locale} bookHref={`/${locale}/book`} />
      </div>

      <MarqueeBand items={['Hand-painted detail', 'Gel & hard gel', 'Design add-ons available']} />

      <section className={styles.addons}>
        <Reveal className={styles.addonsHead}>
          <p className="eyebrow">Add-ons</p>
          <h2 className={styles.addonsTitle}>Extras you can add on</h2>
          <p className={styles.sub}>Add any of these to your booking — pick as many as you need.</p>
        </Reveal>
        <Reveal delay={100}>
          <ul className={styles.addonList}>
            {addons.map((a: any) => (
              <li key={a.id} className={styles.addonRow}>
                <span className={styles.addonName}>{locale === 'ar' ? a.name_ar : a.name_en}</span>
                <span className={styles.addonDots} aria-hidden="true" />
                <span className={styles.addonPrice}>
                  +{a.price_egp} EGP{a.is_quantity ? ' each' : ''}
                </span>
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
