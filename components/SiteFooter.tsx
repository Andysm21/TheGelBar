import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import styles from './SiteFooter.module.css';

const ADDRESS = '7 Ahmed Oraby, Madinet Al Eelam, Agouza, Giza Governorate 3755201';
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;
const INSTAGRAM_URL = 'https://www.instagram.com/thegelbar.eg';

export default async function SiteFooter({ locale }: { locale: string }) {
  const t = await getTranslations('nav');

  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div className={styles.brandCol}>
          <div className={styles.brand}>The Gel Bar</div>
          <p className={styles.brandSub}>Nails by Mariam Sherif El Gergawy</p>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={styles.ig}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="2" y="2" width="20" height="20" rx="5.5" />
              <circle cx="12" cy="12" r="4.3" />
              <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
            </svg>
            @thegelbar.eg
          </a>
        </div>

        <div>
          <p className={styles.heading}>Salon</p>
          <Link href={`/${locale}/services`} className={styles.link}>
            {t('services')}
          </Link>
          <Link href={`/${locale}/work`} className={styles.link}>
            {t('ourWork')}
          </Link>
          <Link href={`/${locale}/book`} className={styles.link}>
            {t('book')}
          </Link>
        </div>

        <div>
          <p className={styles.heading}>Visit</p>
          <p className={styles.text}>By appointment only</p>
          <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className={styles.text}>
            {ADDRESS}
          </a>
        </div>

        <div>
          <p className={styles.heading}>Account</p>
          <Link href={`/${locale}/bookings`} className={styles.link}>
            {t('bookings')}
          </Link>
          <Link href={`/${locale}/login`} className={styles.link}>
            {t('login')}
          </Link>
          <Link href={`/${locale}/admin/dashboard`} className={styles.link}>
            Admin
          </Link>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>&copy; {new Date().getFullYear()} The Gel Bar</span>
        <span>Mohandeseen · Cairo</span>
      </div>
    </footer>
  );
}
