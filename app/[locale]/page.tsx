import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import NailProcess from '@/components/NailProcess/NailProcess';
import HeroVideo from '@/components/HeroVideo';
import MarqueeBand from '@/components/MarqueeBand';
import Reveal from '@/components/Reveal';
import { getServiceCatalog } from '@/lib/supabase/cached-queries';
import styles from './page.module.css';

const ADDRESS = '7 Ahmed Oraby, Madinet Al Eelam, Agouza, Giza Governorate 3755201';
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;
const MAPS_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`;

const FEATURED_IMAGES = ['/gallery/work-4.jpg', '/gallery/work-6.jpg', '/gallery/work-8.jpg'];
const GALLERY_TEASER = ['/gallery/work-1.jpg', '/gallery/work-2.jpg', '/gallery/work-3.jpg', '/gallery/work-9.jpg'];

const VALUES = [
  {
    title: 'One client at a time',
    body: 'No overlapping appointments, no rushing. The studio is booked for you alone, so the set gets the hours it actually needs.',
  },
  {
    title: 'Bring your inspiration',
    body: 'Screenshots, Pinterest boards, a colour you saw once — bring it in. Every design is hand-painted to match, not approximated.',
  },
  {
    title: 'Built to last',
    body: 'Gel and hard-gel systems applied properly, cuticle work done carefully, and a finish that holds up for weeks of real life.',
  },
];

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const services = await getServiceCatalog();
  const featured = (services as any[]).slice(0, 3);

  return (
    <div className={styles.page}>
      {/* ---------- HERO ---------- */}
      <section className={styles.hero}>
        <HeroVideo className={styles.heroVideo} />
        <div className={styles.heroScrim} />
        <div className={styles.heroInner}>
          <p className={`eyebrow ${styles.heroEyebrow}`}>Welcome to</p>
          <h1 className={styles.heroTitle}>The Gel Bar</h1>
          <p className={styles.heroSub}>A solo nail studio in Mohandeseen, Cairo — by appointment only</p>
          <div className={styles.heroCtas}>
            <Link href={`/${locale}/book`} className="btn btn-light">
              Schedule your appointment
            </Link>
            <Link href={`/${locale}/services`} className={styles.heroTextLink}>
              View services &amp; prices →
            </Link>
          </div>
        </div>
        <div className={styles.scrollCue}>
          <span>Scroll</span>
          <i />
        </div>
      </section>

      <MarqueeBand items={['Hand-painted nail art', 'Gel & hard gel', 'By appointment only', 'Mohandeseen · Cairo']} />

      {/* ---------- ABOUT ---------- */}
      <section className={styles.about}>
        <Reveal>
          <p className="eyebrow">About · The Studio</p>
          <h2 className={styles.aboutTitle}>Nails worth the appointment</h2>
          <p className={`lede ${styles.aboutBody}`}>
            The Gel Bar is run start-to-finish by Mariam Sherif El Gergawy. Every booking is one-on-one in a calm studio
            — no crowd, no conveyor belt. Just careful prep, precise hand-painted detail, and a finish built to last.
          </p>
          <Link href={`/${locale}/book`} className="btn">
            Book appointment
          </Link>
        </Reveal>
      </section>

      {/* ---------- FEATURED SERVICES ---------- */}
      <section className={styles.featured}>
        <Reveal className={styles.sectionHead}>
          <p className="eyebrow">The Menu</p>
          <h2 className={styles.sectionTitle}>Signature services</h2>
        </Reveal>
        <div className={styles.featuredGrid}>
          {featured.map((s, i) => (
            <Reveal key={s.id} delay={i * 110}>
              <article className={styles.featuredCard}>
                <div className={`zoomable ${styles.featuredImg}`}>
                  <img src={FEATURED_IMAGES[i % FEATURED_IMAGES.length]} alt="" loading="lazy" />
                </div>
                <p className="eyebrow">{(s.service_variants ?? []).length} options</p>
                <h3 className={styles.featuredName}>{locale === 'ar' ? s.name_ar : s.name_en}</h3>
                <p className={styles.featuredDesc}>
                  {(locale === 'ar' ? s.description_ar : s.description_en) ||
                    (s.service_variants ?? []).map((v: any) => (locale === 'ar' ? v.name_ar : v.name_en)).join(' · ')}
                </p>
                <p className={styles.featuredPrice}>
                  from {Math.min(...(s.service_variants ?? [{ price_egp: 0 }]).map((v: any) => v.price_egp))} EGP
                </p>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal className={styles.centerCta}>
          <Link href={`/${locale}/services`} className="btn">
            Explore all services
          </Link>
        </Reveal>
      </section>

      {/* ---------- PROCESS ---------- */}
      <div className={styles.processIntro}>
        <Reveal>
          <p className="eyebrow">The Process</p>
          <h2 className={styles.sectionTitle}>{t('process.title')}</h2>
          <p className={styles.processSub}>{t('process.subtitle')}</p>
        </Reveal>
      </div>

      <NailProcess />

      {/* ---------- VALUES (split) ---------- */}
      <section className={styles.split}>
        <Reveal className={styles.splitMedia}>
          <div className={`zoomable ${styles.splitImgTall}`}>
            <img src="/gallery/work-5.jpg" alt="" loading="lazy" />
          </div>
          <div className={`zoomable ${styles.splitImgSmall}`}>
            <img src="/gallery/work-10.jpg" alt="" loading="lazy" />
          </div>
        </Reveal>
        <Reveal delay={120} className={styles.splitText}>
          <p className="eyebrow">Why the studio</p>
          <h2 className={styles.sectionTitle}>A quieter kind of nail appointment</h2>
          {VALUES.map((v) => (
            <div key={v.title} className={styles.valueItem}>
              <h3 className={styles.valueTitle}>{v.title}</h3>
              <p className={styles.valueBody}>{v.body}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ---------- GALLERY TEASER ---------- */}
      <section className={styles.galleryTeaser}>
        <Reveal className={styles.sectionHead}>
          <p className="eyebrow">Our Work</p>
          <h2 className={styles.sectionTitle}>Browse real sets</h2>
        </Reveal>
        <div className={styles.teaserGrid}>
          {GALLERY_TEASER.map((src, i) => (
            <Reveal key={src} delay={i * 90}>
              <div className={`zoomable ${styles.teaserItem}`}>
                <img src={src} alt="" loading="lazy" />
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className={styles.centerCta}>
          <Link href={`/${locale}/work`} className="btn">
            View the gallery
          </Link>
        </Reveal>
      </section>

      {/* ---------- LOCATION ---------- */}
      <section className={styles.location}>
        <Reveal className={styles.locationText}>
          <p className="eyebrow">Find us</p>
          <h2 className={styles.sectionTitle}>The studio</h2>
          <p className={`lede ${styles.locationAddr}`}>{ADDRESS}</p>
          <p className={styles.locationHours}>By appointment only · Confirmed per booking</p>
          <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="btn">
            Open in Google Maps
          </a>
        </Reveal>
        <Reveal delay={120} className={styles.locationMap}>
          <iframe
            src={MAPS_EMBED_URL}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="The Gel Bar location"
          />
        </Reveal>
      </section>

      {/* ---------- CLOSING CTA ---------- */}
      <section className={styles.closing}>
        <Reveal>
          <p className={`eyebrow ${styles.closingEyebrow}`}>Ready when you are</p>
          <h2 className={styles.closingTitle}>Book your next set</h2>
          <Link href={`/${locale}/book`} className="btn btn-light">
            {t('hero.cta')}
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
