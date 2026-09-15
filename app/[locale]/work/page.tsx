import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import { getGalleryImages } from '@/lib/supabase/cached-queries';
import { BUNDLED_GALLERY, publicImageUrl } from '@/lib/site-images';
import styles from './work.module.css';

const INSTAGRAM_URL = 'https://www.instagram.com/thegelbar.eg';

export default async function OurWorkPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const uploaded = await getGalleryImages();
  // Photos Mariam manages from the admin panel; the starter set until she adds any.
  const photos =
    uploaded.length > 0
      ? uploaded.map((g: any) => ({ src: publicImageUrl(g.storage_path), caption: g.caption as string }))
      : BUNDLED_GALLERY.map((src) => ({ src, caption: '' }));

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
        {photos.map(({ src, caption }, i) => (
          <Reveal key={src} delay={(i % 4) * 80} className={styles.galCell}>
            <figure className={`zoomable ${styles.galItem}`}>
              <img src={src} alt={caption} loading="lazy" />
              {caption && <figcaption className={styles.galCaption}>{caption}</figcaption>}
            </figure>
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
