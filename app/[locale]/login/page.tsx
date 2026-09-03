'use client';

import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const t = useTranslations();
  const { locale } = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/${locale}${next}` },
    });
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '4rem 1.25rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--deep)' }}>{t('brand.name')}</div>
        <p className="sans" style={{ fontSize: '.82rem', color: 'var(--sub)', marginTop: '.4rem' }}>
          {t('hero.subtitle')}
        </p>
      </div>

      <div className="card">
        <button onClick={signInWithGoogle} className="btn btn-ghost btn-block" style={{ marginBottom: '.8rem', gap: '.6rem' }}>
          Continue with Google
        </button>
        <p className="sans" style={{ fontSize: '.7rem', color: 'var(--sub)', textAlign: 'center', marginTop: '1rem' }}>
          Apple sign-in coming soon — Google is the primary path for v1.
        </p>
      </div>

      <p className="sans" style={{ textAlign: 'center', fontSize: '.7rem', color: 'var(--sub)', marginTop: '1.5rem' }}>
        Salon owner? <a href={`/${locale}/admin/login`} style={{ color: 'var(--deep)', fontWeight: 700 }}>Go to admin →</a>
      </p>
    </div>
  );
}
