'use client';

import { useState, useTransition } from 'react';
import { cancelBooking, requestReschedule } from '@/lib/supabase/actions';
import RescheduleModal from './RescheduleModal';
import styles from './BookingActions.module.css';

export default function BookingActions({
  bookingId,
  durationMinutes,
  currentLabel,
}: {
  bookingId: string;
  durationMinutes: number;
  currentLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [showReschedule, setShowReschedule] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState('');

  function handleCancel() {
    setError('');
    startTransition(async () => {
      try {
        await cancelBooking(bookingId);
        setConfirmCancel(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  return (
    <div className={styles.wrap}>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.buttons}>
        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setShowReschedule(true)}>
          Reschedule
        </button>
        {confirmCancel ? (
          <>
            <button className={`btn btn-sm ${styles.danger}`} disabled={pending} onClick={handleCancel}>
              {pending ? 'Cancelling…' : 'Yes, cancel'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmCancel(false)}>
              Keep it
            </button>
          </>
        ) : (
          <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setConfirmCancel(true)}>
            Cancel booking
          </button>
        )}
      </div>

      {showReschedule && (
        <RescheduleModal
          bookingId={bookingId}
          durationMinutes={durationMinutes}
          currentLabel={currentLabel}
          onClose={() => setShowReschedule(false)}
          onConfirm={(date, time) => requestReschedule(bookingId, date, time)}
        />
      )}
    </div>
  );
}
