'use client';

import { useState, useTransition } from 'react';
import { refreshServicesCache } from '@/lib/supabase/actions';

export default function RefreshCacheButton() {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function refresh() {
    setDone(false);
    startTransition(async () => {
      try {
        await refreshServicesCache();
        setDone(true);
        setTimeout(() => setDone(false), 2500);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to refresh.');
      }
    });
  }

  return (
    <button onClick={refresh} disabled={isPending} className="btn btn-ghost" style={{ fontSize: '.7rem', padding: '.5rem 1rem' }}>
      {isPending ? 'Refreshing…' : done ? '✓ Refreshed' : '↻ Refresh data'}
    </button>
  );
}
