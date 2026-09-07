'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import LangSwitch from './LangSwitch';
import styles from './SiteHeader.module.css';

const LEFT = [
  { href: '', key: 'home' },
  { href: 'services', key: 'services' },
];
const RIGHT = [
  { href: 'work', key: 'ourWork' },
  { href: 'bookings', key: 'bookings' },
];

export default function SiteHeader() {
  const t = useTranslations('nav');
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const base = `/${locale}`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const href = (h: string) => (h ? `${base}/${h}` : base);
  const isActive = (h: string) => (h ? pathname?.startsWith(href(h)) : pathname === base);

  const navLink = (item: { href: string; key: string }) => (
    <Link key={item.key} href={href(item.href)} className={`${styles.navLink} ${isActive(item.href) ? styles.active : ''}`}>
      {t(item.key)}
    </Link>
  );

  return (
    <>
      <div className={styles.announce} aria-hidden="true">
        <div className={styles.marquee}>
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className={styles.marqueeTrack}>
              By appointment only &nbsp;·&nbsp; Mohandeseen, Cairo &nbsp;·&nbsp; Hand-painted nail art &nbsp;·&nbsp; One client at a
              time &nbsp;·&nbsp; @thegelbar.eg &nbsp;·&nbsp;
            </span>
          ))}
        </div>
      </div>

      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.inner}>
          <button className={styles.burger} onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>
            <span />
            <span />
            <span />
          </button>

          <nav className={`${styles.navSide} ${styles.navLeft}`}>{LEFT.map(navLink)}</nav>

          <Link href={base} className={styles.wordmark}>
            The Gel Bar
            <span className={styles.wordmarkSub}>Nails by Mariam</span>
          </Link>

          <div className={styles.right}>
            <nav className={styles.navSide}>{RIGHT.map(navLink)}</nav>
            <div className={styles.actions}>
              <LangSwitch />
              <Link href={`${base}/book`} className={`btn btn-sm ${styles.bookBtn}`}>
                {t('book')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}>
        {[...LEFT, ...RIGHT].map((item) => (
          <Link key={item.key} href={href(item.href)} className={styles.drawerLink}>
            {t(item.key)}
          </Link>
        ))}
        <Link href={`${base}/book`} className={`btn ${styles.drawerCta}`}>
          {t('book')}
        </Link>
        <Link href={`${base}/login`} className={styles.drawerSmall}>
          {t('login')}
        </Link>
      </div>
      {open && <div className={styles.backdrop} onClick={() => setOpen(false)} />}
    </>
  );
}
