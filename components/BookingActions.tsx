'use client';

import { useState, useTransition } from 'react';
import { cancelBooking, requestReschedule } from '@/lib/supabase/actions';

export default function BookingActions({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<'idle' | 'reschedule'>('idle');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');

  function handleCancel() {
    setError('');
    startTransition(async () => {
      try {
        await cancelBooking(bookingId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  function handleReschedule() {
    if (!date || !time) {
      setError('Pick a new date and time.');
      return;
    }
    setError('');
    startTransition(async () => {
      try {
        await requestReschedule(bookingId, date, time);
        setMode('idle');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  if (mode === 'reschedule') {
    return (
      <div style={{ marginTop: '.9rem' }}>
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.6rem' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ flex: 1 }} />
          <input type="text" placeholder="e.g. 14:00" value={time} onChange={(e) => setTime(e.target.value)} style={{ flex: 1 }} />
        </div>
        {error && (
          <p className="sans" style={{ fontSize: '.7rem', color: 'var(--danger)', marginBottom: '.5rem' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="btn btn-primary btn-sm" disabled={pending} onClick={handleReschedule}>
            Confirm new time
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setMode('idle')}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="sans" style={{ fontSize: '.7rem', color: 'var(--danger)', marginTop: '.6rem' }}>
          {error}
        </p>
      )}
      <div style={{ display: 'flex', gap: '.6rem', marginTop: '.9rem', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setMode('reschedule')}>
          Request reschedule
        </button>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} disabled={pending} onClick={handleCancel}>
          Cancel booking
        </button>
      </div>
    </div>
  );
}
