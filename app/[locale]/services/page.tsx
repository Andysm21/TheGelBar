import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getServiceCatalog } from '@/lib/supabase/cached-queries';
import ServicesGrid from '@/components/ServicesGrid';
import styles from './services.module.css';

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const services = await getServiceCatalog();

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{t('services.title')}</h1>
      <p className="sans" style={{ textAlign: 'center', color: 'var(--sub)', fontSize: '.8rem', marginBottom: '2rem' }}>
        Every service, real pricing — tap a card for details.
      </p>
      <ServicesGrid services={services} locale={locale} />
      <Link href={`/${locale}/book`} className={styles.bookBtn}>
        {t('hero.cta')}
      </Link>
    </div>
  );
}
