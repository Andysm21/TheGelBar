'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './AuthMenu.module.css';

/**
 * Signed-out: a "Log in" link. Signed-in: the person's first name with a
 * dropdown holding their bookings and a real sign-out.
 */
export default function AuthMenu({ compact = false }: { compact?: boolean }) {
  const { locale } = useParams<{ locale: string }>();
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    const read = (user: any) => {
      if (!user) {
        setName(null);
        return;
      }
      const meta = user.user_metadata ?? {};
      const full = meta.full_name || meta.name || '';
      // Fall back to the local part of the email, not the whole address —
      // "Hello, thegelbar.eg@gmail.com" overflows the header.
      const label = full ? String(full).split(' ')[0] : String(user.email ?? '').split('@')[0];
      setName(label || 'there');
    };

    supabase.auth.getUser().then(({ data }) => {
      read(data.user);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => read(session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function logOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/${locale}`;
  }

  if (!ready) return <span className={styles.placeholder} aria-hidden="true" />;

  if (!name) {
    return (
      <Link href={`/${locale}/login`} className={styles.loginLink}>
        Log in
      </Link>
    );
  }

  if (compact) {
    return (
      <div className={styles.compact}>
        <span className={styles.compactHi}>Hello, {name}</span>
        <button onClick={logOut} className={styles.compactOut}>
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button className={styles.trigger} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={styles.avatar} aria-hidden="true">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className={styles.hi}>
          <span className={styles.hiPrefix}>Hello, </span>
          {name}
        </span>
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className={styles.menu}>
          <Link href={`/${locale}/bookings`} className={styles.menuItem} onClick={() => setOpen(false)}>
            My bookings
          </Link>
          <Link href={`/${locale}/dashboard`} className={styles.menuItem} onClick={() => setOpen(false)}>
            My account
          </Link>
          <button onClick={logOut} className={`${styles.menuItem} ${styles.menuOut}`}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
