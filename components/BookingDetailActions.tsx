'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setBookingStatus, markBookingPaid, ownerReschedule } from '@/lib/supabase/actions';

interface Props {
  bookingId: string;
  status: string;
  hasService: boolean;
  hasDesign: boolean;
  serviceLabel: string;
  designLabel: string | null;
  servicePriceEgp: number;
  designPriceEgp: number;
  isFree: boolean;
  nextPoints: number;
}

export default function BookingDetailActions({
  bookingId,
  status,
  hasService,
  hasDesign,
  serviceLabel,
  designLabel,
  servicePriceEgp,
  designPriceEgp,
  isFree,
  nextPoints,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serviceDone, setServiceDone] = useState(true);
  const [designDone, setDesignDone] = useState(hasDesign);
  const [error, setError] = useState('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const originalPrice = (serviceDone ? servicePriceEgp : 0) + (designDone && hasDesign ? designPriceEgp : 0);
  const finalPrice = isFree ? 0 : originalPrice;

  function act(fn: () => Promise<void>) {
    setError('');
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  if (status === 'pending') {
    return (
      <div className="card">
        {error && (
          <p className="sans" style={{ fontSize: '.75rem', color: 'var(--danger)', marginBottom: '.8rem' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: '.7rem' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={pending} onClick={() => act(() => setBookingStatus(bookingId, 'confirmed'))}>
            ✓ Approve booking
          </button>
          <button className="btn btn-ghost" style={{ flex: 1, color: 'var(--danger)' }} disabled={pending} onClick={() => act(() => setBookingStatus(bookingId, 'declined'))}>
            ✕ Decline
          </button>
        </div>
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className="card">
        <p className="sans" style={{ fontSize: '.72rem', color: 'var(--sub)', marginBottom: '.9rem' }}>
          Confirm what was actually done — price recalculates automatically.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.6rem 0', borderBottom: '1px solid #f6eef1' }}>
          <input type="checkbox" checked={serviceDone} onChange={(e) => setServiceDone(e.target.checked)} />
          <span style={{ flex: 1 }}>{serviceLabel}</span>
          <span className="sans" style={{ color: 'var(--sub)' }}>{servicePriceEgp} EGP</span>
        </label>
        {hasDesign && designLabel && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.6rem 0', borderBottom: '1px solid #f6eef1' }}>
            <input type="checkbox" checked={designDone} onChange={(e) => setDesignDone(e.target.checked)} />
            <span style={{ flex: 1 }}>{designLabel}</span>
            <span className="sans" style={{ color: 'var(--sub)' }}>{designPriceEgp} EGP</span>
          </label>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <span className="sans" style={{ fontWeight: 700 }}>Final price</span>
          <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--deep)' }}>
            {isFree ? (
              <>
                <span style={{ textDecoration: 'line-through', color: 'var(--sub)', fontSize: '.9rem', marginInlineEnd: '.5rem' }}>{originalPrice} EGP</span>
                0 EGP
              </>
            ) : (
              `${finalPrice} EGP`
            )}
          </span>
        </div>

        {error && (
          <p className="sans" style={{ fontSize: '.75rem', color: 'var(--danger)', marginTop: '.8rem' }}>
            {error}
          </p>
        )}

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: '1.2rem' }}
          disabled={pending}
          onClick={() => act(() => markBookingPaid(bookingId, serviceDone, designDone))}
        >
          Mark as Paid — Done
        </button>

        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          {!rescheduleOpen ? (
            <button className="sans" style={{ fontSize: '.78rem', color: 'var(--deep)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setRescheduleOpen(true)}>
              Can't make this slot? Propose a reschedule
            </button>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '.6rem', marginBottom: '.8rem' }}>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ flex: 1 }} />
                <input type="text" placeholder="e.g. 16:00" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ flex: 1 }} />
              </div>
              <button
                className="btn btn-ghost btn-block"
                disabled={pending || !newDate || !newTime}
                onClick={() => act(() => ownerReschedule(bookingId, newDate, newTime))}
              >
                Send new time to client
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="sans" style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 700, padding: '1rem' }}>
        ✓ Paid &amp; done — loyalty now at {nextPoints} pt{nextPoints === 1 ? '' : 's'}
        {isFree ? ' (reset after free session)' : ''}
      </div>
    );
  }

  return (
    <div className="sans" style={{ color: 'var(--sub)', fontSize: '.85rem', padding: '1rem' }}>
      Status: {status}
    </div>
  );
}
