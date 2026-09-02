'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Enter both email and password.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setLoading(false);
      // Showing the real Supabase message (not a generic "invalid
      // credentials") while this is being set up — it distinguishes a
      // genuine wrong password from an unconfirmed email, missing user,
      // or a project/env misconfiguration, which all otherwise look
      // identical to the person typing.
      setError(signInError.message);
      return;
    }

    // Role check happens again server-side in middleware on the next
    // request — this is just a fast client-side confirmation so a
    // non-owner account gets a clear message instead of a silent bounce.
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    setLoading(false);
    if (profile?.role !== 'owner') {
      await supabase.auth.signOut();
      setError('This account is not an admin account.');
      return;
    }
    router.push(`/${locale}/admin/dashboard`);
  }

  return (
    <div style={{ maxWidth: 380, margin: '0 auto', padding: '4rem 1.25rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 600, color: 'var(--deep)' }}>The Gel Bar</div>
        <p className="sans" style={{ fontSize: '.78rem', color: 'var(--sub)', marginTop: '.4rem' }}>
          Admin sign in
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && (
          <p className="sans" style={{ fontSize: '.75rem', color: 'var(--danger)', marginBottom: '1rem' }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="sans" style={{ textAlign: 'center', fontSize: '.7rem', color: 'var(--sub)', marginTop: '1.5rem' }}>
        Not the salon owner?{' '}
        <a href={`/${locale}/login`} style={{ color: 'var(--deep)', fontWeight: 700 }}>
          Client login →
        </a>
      </p>
    </div>
  );
}
