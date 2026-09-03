'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { adminSignIn } from '@/lib/supabase/actions';

export default function AdminLoginPage() {
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
    try {
      // Sign-in now runs server-side (Server Action) so it can be rate
      // limited — a client-side call to Supabase auth has no chokepoint
      // our own code can throttle.
      await adminSignIn(email, password);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : 'Sign in failed.');
      return;
    }
    setLoading(false);
    // Full page load rather than a client-side transition — an auth
    // redirect needs the very next request to carry the fresh session
    // cookie through middleware cleanly, and a hard navigation sidesteps
    // any client-router/hydration edge case entirely (reported as a
    // "HierarchyRequestError… Only one element on document allowed"
    // crash on some mobile browsers after client-side router.push here).
    window.location.href = `/${locale}/admin/dashboard`;
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
