'use client';

import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './login.module.css';

export default function LoginPage() {
  const t = useTranslations();
  const { locale } = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const oauthError = searchParams.get('error') === 'oauth';

  async function signInWithGoogle() {
    const supabase = createClient();
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
    callbackUrl.searchParams.set('locale', locale);
    callbackUrl.searchParams.set('next', next);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl.toString() },
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <Link href={`/${locale}`} className={styles.brand}>
          {t('brand.name')}
        </Link>
        <p className={styles.tagline}>{t('hero.subtitle')}</p>

        <div className={styles.card}>
          <p className="eyebrow" style={{ display: 'block', textAlign: 'center', marginBottom: '1.4rem' }}>
            Client sign in
          </p>

          {oauthError && <p className={styles.error}>Google sign-in didn't go through — try again.</p>}

          <button onClick={signInWithGoogle} className="btn btn-solid btn-block">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.17v2.96h5.26c-.23 1.37-1.62 4.01-5.26 4.01-3.17 0-5.76-2.62-5.76-5.86s2.59-5.86 5.76-5.86c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.83 3.79 14.72 2.9 12.18 2.9 6.98 2.9 2.76 7.1 2.76 12.2s4.22 9.3 9.42 9.3c5.44 0 9.04-3.82 9.04-9.2 0-.62-.07-1.09-.15-1.56z"
              />
            </svg>
            Continue with Google
          </button>

          <p className={styles.note}>Apple sign-in coming soon — Google is the primary path for now.</p>
        </div>

        <p className={styles.owner}>
          Salon owner?{' '}
          <a href={`/${locale}/admin/login`} className={styles.ownerLink}>
            Go to admin →
          </a>
        </p>
      </div>

      <div className={styles.art} aria-hidden="true">
        <img src="/gallery/work-3.jpg" alt="" />
      </div>
    </div>
  );
}
