import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import NailProcess from '@/components/NailProcess/NailProcess';
import InstagramCard from '@/components/InstagramCard';
import HeroVideo from '@/components/HeroVideo';
import { getServiceCatalog } from '@/lib/supabase/cached-queries';
import styles from './page.module.css';

const ADDRESS = '7 Ahmed Oraby, Madinet Al Eelam, Agouza, Giza Governorate 3755201';
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;
const MAPS_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`;
const WORK_IMAGES = Array.from({ length: 3 }, (_, i) => `/gallery/work-${i + 1}.jpg`);
const FEATURED_IMAGES = ['/gallery/work-4.jpg', '/gallery/work-6.jpg', '/gallery/work-8.jpg'];

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const services = await getServiceCatalog();
  const featured = services.slice(0, 3);

  return (
    <div className={styles.wrap}>
      <HeroVideo className={styles.bgVideo} />
      <div className={styles.bgScrim} />

      <section className={styles.hero}>
        <p className={`eyebrow ${styles.heroEyebrow}`}>Welcome to</p>
        <h1 className={styles.brandName}>{t('brand.name')}</h1>
        <p className={styles.tag}>{t('hero.subtitle')}</p>
        <Link href={`/${locale}/book`} className={`btn btn-primary ${styles.ctaHero}`}>
          Schedule your appointment
        </Link>
      </section>

      <section className={styles.aboutSection}>
        <p className="eyebrow" style={{ textAlign: 'center', display: 'block' }}>
          About &middot; Salon
        </p>
        <h2 className={styles.aboutTitle}>Instagram-Worthy Nails You Deserve</h2>
        <p className={styles.aboutBody}>
          {t('brand.name')} is a solo nail studio run by Mariam Sherif El Gergawy in {t('brand.location')}. Every
          appointment is one-on-one, by reservation only — no rush, no crowd, just careful, detailed work using
          quality gel and hard-gel systems built to last.
        </p>
        <div style={{ textAlign: 'center' }}>
          <Link href={`/${locale}/book`} className="btn btn-primary">
            Book Appointment
          </Link>
        </div>
      </section>

      <section className={styles.featuredGrid}>
        {featured.map((s, i) => (
          <div key={s.id} className={styles.featuredItem}>
            <div className={styles.featuredImg}>
              <img src={FEATURED_IMAGES[i % FEATURED_IMAGES.length]} alt="" loading="lazy" />
            </div>
            <p className="eyebrow" style={{ display: 'block', marginTop: '1.4rem' }}>
              {s.design_tier === 'complex' ? 'Detailed' : s.design_tier === 'simple' ? 'Signature' : 'Essential'}
            </p>
            <h3 className={styles.featuredTitle}>{locale === 'ar' ? s.name_ar : s.name_en}</h3>
            <p className={styles.featuredDesc}>{locale === 'ar' ? s.description_ar : s.description_en}</p>
          </div>
        ))}
        <div className={styles.featuredCta}>
          <Link href={`/${locale}/services`} className="btn btn-primary">
            Explore Services
          </Link>
        </div>
      </section>

      <div className={styles.processIntro}>
        <p className="eyebrow" style={{ display: 'block' }}>
          The Process
        </p>
        <h2>{t('process.title')}</h2>
        <p className="sans">{t('process.subtitle')}</p>
      </div>

      <NailProcess />

      <section className={styles.twoCol}>
        <div className={styles.twoColItem}>
          <div className={styles.twoColImg}>
            <img src="/gallery/work-2.jpg" alt="" loading="lazy" />
          </div>
          <p className="eyebrow" style={{ display: 'block', marginTop: '1.2rem' }}>
            Our Work
          </p>
          <h3 className={styles.twoColTitle}>Browse Real Nail Designs</h3>
          <p className={styles.twoColDesc}>
            A gallery of real sets {t('brand.name')} has created — bring any of them as inspiration, or start from
            scratch.
          </p>
          <Link href={`/${locale}/work`} className="btn btn-ghost">
            View Gallery
          </Link>
        </div>

        <div className={styles.twoColItem}>
          <div className={styles.twoColImg}>
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
          <p className="eyebrow" style={{ display: 'block', marginTop: '1.2rem' }}>
            Location
          </p>
          <h3 className={styles.twoColTitle}>Find The Studio</h3>
          <p className={styles.twoColDesc}>{ADDRESS}</p>
          <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            Open in Maps
          </a>
        </div>
      </section>

      <section className={styles.section} style={{ paddingTop: 0 }}>
        <InstagramCard />
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <div className={styles.footerBrand}>{t('brand.name')}</div>
            <p className={styles.footerSub}>{t('brand.tagline')}</p>
          </div>
          <div>
            <p className={styles.footerHeading}>Salon</p>
            <Link href={`/${locale}/services`} className={styles.footerLink}>
              Services
            </Link>
            <Link href={`/${locale}/work`} className={styles.footerLink}>
              Our Work
            </Link>
            <Link href={`/${locale}/book`} className={styles.footerLink}>
              Book Now
            </Link>
          </div>
          <div>
            <p className={styles.footerHeading}>Hours</p>
            <p className={styles.footerText}>By appointment only</p>
            <p className={styles.footerText}>{ADDRESS}</p>
          </div>
          <div>
            <p className={styles.footerHeading}>Account</p>
            <Link href={`/${locale}/login`} className={styles.footerLink}>
              {t('nav.login')}
            </Link>
            <Link href={`/${locale}/admin/dashboard`} className={styles.footerLink}>
              Admin
            </Link>
          </div>
        </div>
        <p className={styles.footerCopy}>&copy; {new Date().getFullYear()} {t('brand.name')}. All rights reserved.</p>
      </footer>
    </div>
  );
}
