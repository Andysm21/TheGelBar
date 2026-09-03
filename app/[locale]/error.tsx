'use client';

import { useEffect } from 'react';

// Catches any render error under [locale] (including ones triggered by
// router.refresh() re-rendering a page after a Server Action) and shows
// a recoverable screen instead of the raw "This page couldn't load"
// crash with no way back.
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '4rem 1.25rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.3rem', color: 'var(--deep)', marginBottom: '.6rem' }}>Something went wrong</h1>
      <p className="sans" style={{ color: 'var(--sub)', fontSize: '.85rem', marginBottom: '1.5rem' }}>
        That didn't go through. Nothing was lost — try again.
      </p>
      <button onClick={reset} className="btn btn-primary">
        Try again
      </button>
    </div>
  );
}
