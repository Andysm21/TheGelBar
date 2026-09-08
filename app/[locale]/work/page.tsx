import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import styles from './work.module.css';

const GALLERY_IMAGES = Array.from({ length: 10 }, (_, i) => `/gallery/work-${i + 1}.jpg`);
const INSTAGRAM_URL = 'https://www.instagram.com/thegelbar.eg';

export default async function OurWorkPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className="eyebrow">Gallery &middot; Inspiration</p>
        <h1 className={styles.title}>Browse nail designs</h1>
        <p className={styles.sub}>
          Real sets from the studio. Save anything here and bring it to your appointment — or bring your own reference and
          it gets matched by hand.
        </p>
      </header>

      <div className={styles.gallery}>
        {GALLERY_IMAGES.map((src, i) => (
          <Reveal key={src} delay={(i % 4) * 80} className={styles.galCell}>
            <div className={`zoomable ${styles.galItem}`}>
              <img src={src} alt="" loading="lazy" />
            </div>
          </Reveal>
        ))}
      </div>


      <section className={styles.cta}>
        <Reveal>
          <p className="eyebrow">Follow along</p>
          <h2 className={styles.ctaTitle}>More on Instagram</h2>
          <p className={styles.sub} style={{ marginBottom: '2.2rem' }}>
            {t('brand.name')} posts every new set at @thegelbar.eg.
          </p>
          <div className={styles.ctaRow}>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn">
              Open Instagram
            </a>
            <Link href={`/${locale}/book`} className="btn btn-solid">
              {t('hero.cta')}
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
