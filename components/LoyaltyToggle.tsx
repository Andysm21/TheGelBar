'use client';

import { useState, useTransition } from 'react';
import { setLoyaltyEnabled } from '@/lib/supabase/actions';

export default function LoyaltyToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      try {
        await setLoyaltyEnabled(next);
      } catch (e) {
        setEnabled(!next);
        alert(e instanceof Error ? e.message : 'Failed to update.');
      }
    });
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '.85rem' }}>Loyalty program</div>
        <p className="sans" style={{ fontSize: '.72rem', color: 'var(--sub)', marginTop: '.2rem' }}>
          {enabled ? 'Enabled — points are being tracked.' : 'Disabled — no points awarded, no free sessions.'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={isPending}
        className={`btn ${enabled ? 'btn-primary' : 'btn-ghost'}`}
        style={{ fontSize: '.7rem', padding: '.5rem 1rem' }}
      >
        {enabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
}
