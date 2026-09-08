'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './AdminShell.module.css';

const NAV = [
  { href: 'admin/dashboard', label: 'Overview', icon: '◆' },
  { href: 'admin/bookings', label: 'Bookings', icon: '▤' },
  { href: 'admin/calendar', label: 'Calendar', icon: '▦' },
  { href: 'admin/clients', label: 'Clients', icon: '◇' },
  { href: 'admin/services', label: 'Catalog', icon: '❋' },
  { href: 'admin/analytics', label: 'Analytics', icon: '◐' },
];

export default function AdminShell({ children, title, subtitle, actions }: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function logOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/${locale}/admin/login`;
  }

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <Link href={`/${locale}`} className={styles.brand}>
          The Gel Bar
          <span className={styles.brandSub}>Studio admin</span>
        </Link>

        <nav className={styles.nav}>
          {NAV.map((item) => {
            const href = `/${locale}/${item.href}`;
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={item.href}
                href={href}
                className={`${styles.navLink} ${active ? styles.navActive : ''}`}
                onClick={() => setOpen(false)}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFoot}>
          <Link href={`/${locale}`} className={styles.footLink}>
            View site ↗
          </Link>
          <button onClick={logOut} className={styles.logout}>
            Log out
          </button>
        </div>
      </aside>

      {open && <div className={styles.backdrop} onClick={() => setOpen(false)} />}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.burger} onClick={() => setOpen((v) => !v)} aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
          <div className={styles.topbarText}>
            {title && <h1 className={styles.title}>{title}</h1>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.topbarActions}>{actions}</div>}
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
