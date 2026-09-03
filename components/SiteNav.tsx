'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './SiteNav.module.css';

const ITEMS = [
  { href: '', key: 'home' },
  { href: 'services', key: 'services' },
  { href: 'work', key: 'ourWork' },
  { href: 'book', key: 'bookings' },
];

export default function SiteNav() {
  const t = useTranslations('nav');
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const base = `/${locale}`;

  return (
    <>
      <button className={styles.burger} onClick={() => setOpen((v) => !v)} aria-label="Menu">
        <span />
        <span />
        <span />
      </button>

      <nav className={`${styles.nav} ${open ? styles.open : ''}`}>
        <div className={styles.brand}>The Gel Bar</div>
        {ITEMS.map((item) => {
          const href = item.href ? `${base}/${item.href}` : base;
          const active = pathname === href || (item.href && pathname?.startsWith(href));
          return (
            <Link key={item.key} href={href} className={`sans ${styles.link} ${active ? styles.active : ''}`} onClick={() => setOpen(false)}>
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
      {open && <div className={styles.backdrop} onClick={() => setOpen(false)} />}
    </>
  );
}
