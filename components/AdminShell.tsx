'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import styles from './AdminShell.module.css';

const NAV = [
  { href: 'admin/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: 'admin/bookings', icon: '📥', label: 'Requests' },
  { href: 'admin/calendar', icon: '📅', label: 'Calendar' },
  { href: 'admin/clients', icon: '👥', label: 'Clients' },
  { href: 'admin/services', icon: '💅', label: 'Services' },
  { href: 'admin/analytics', icon: '📊', label: 'Analytics' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <div className={styles.sidebar}>
        <div className={styles.brand}>
          The Gel Bar <span style={{ color: 'var(--gold)' }}>Admin</span>
        </div>
        {NAV.map((item) => {
          const href = `/${locale}/${item.href}`;
          const active = pathname?.startsWith(href);
          return (
            <Link key={item.href} href={href} className={`sans ${styles.navLink} ${active ? styles.active : ''}`}>
              <span>{item.icon}</span> {item.label}
            </Link>
          );
        })}
        <Link href={`/${locale}/login`} className={`sans ${styles.navLink} ${styles.logoutLink}`}>
          🚪 Log out
        </Link>
      </div>
      <div className={styles.main}>{children}</div>
    </div>
  );
}
