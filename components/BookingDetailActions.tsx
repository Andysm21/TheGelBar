'use client';

import { useState, useTransition } from 'react';
import {
  setBookingStatus,
  ownerCancelBooking,
  ownerReschedule,
  changeBookingVariant,
  markBookingPaid,
} from '@/lib/supabase/actions';
import RescheduleModal from './RescheduleModal';
import NailLoader from './NailLoader/NailLoader';
import styles from './BookingDetailActions.module.css';

interface Variant {
  id: string;
  name_en: string;
  kind: string;
  price_egp: number;
  duration_minutes: number;
}

export default function BookingDetailActions({
  bookingId,
  status,
  currentVariantId,
  currentVariantName,
  currentPrice,
  addonTotal,
  variants,
  durationMinutes,
  currentLabel,
}: {
  bookingId: string;
  status: string;
  currentVariantId: string;
  currentVariantName: string;
  currentPrice: number;
  addonTotal: number;
  variants: Variant[];
  durationMinutes: number;
  currentLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [declineMode, setDeclineMode] = useState(false);
  const [reason, setReason] = useState('');

  const [tierMode, setTierMode] = useState(false);
  const [newVariantId, setNewVariantId] = useState(currentVariantId);
  const [note, setNote] = useState('');

  const newVariant = variants.find((v) => v.id === newVariantId);
  const newTotal = (newVariant?.price_egp ?? 0) + addonTotal;

  function run(fn: () => Promise<void>, after?: () => void) {
    setError('');
    startTransition(async () => {
      try {
        await fn();
        after?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  return (
    <div className={styles.wrap}>
      {error && <p className={styles.error}>{error}</p>}

      {/* ---- primary status actions ---- */}
      {status === 'pending' && !declineMode && (
        <div className={styles.row}>
          <button className="btn btn-solid" disabled={pending} onClick={() => run(() => setBookingStatus(bookingId, 'confirmed'))}>
            {pending && <NailLoader size="mini" />}
            Confirm booking
          </button>
          <button className="btn btn-ghost" disabled={pending} onClick={() => setDeclineMode(true)}>
            Decline
          </button>
        </div>
      )}

      {declineMode && (
        <div className={styles.block}>
          <label>Reason (included in the email)</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Fully booked that day…" />
          <div className={styles.row}>
            <button
              className={`btn ${styles.danger}`}
              disabled={pending}
              onClick={() => run(() => setBookingStatus(bookingId, 'declined', reason), () => setDeclineMode(false))}
            >
              {pending ? 'Sending…' : 'Decline & email client'}
            </button>
            <button className="btn btn-ghost" onClick={() => setDeclineMode(false)}>
              Back
            </button>
          </div>
        </div>
      )}

      {status === 'confirmed' && (
        <div className={styles.row}>
          <button className="btn btn-solid" disabled={pending} onClick={() => run(() => markBookingPaid(bookingId, true))}>
            Mark done &amp; paid
          </button>
          <button className="btn btn-ghost" disabled={pending} onClick={() => setShowReschedule(true)}>
            Reschedule
          </button>
          <button className={`btn ${styles.danger}`} disabled={pending} onClick={() => run(() => ownerCancelBooking(bookingId))}>
            Cancel
          </button>
        </div>
      )}

      {status === 'pending' && !declineMode && (
        <button className={`btn btn-ghost ${styles.wide}`} disabled={pending} onClick={() => setShowReschedule(true)}>
          Propose a different time
        </button>
      )}

      {/* ---- design tier correction ---- */}
      {['pending', 'confirmed'].includes(status) && (
        <div className={styles.block}>
          {!tierMode ? (
            <button className={styles.linkBtn} onClick={() => setTierMode(true)}>
              Design isn't {currentVariantName.toLowerCase()}? Adjust it &amp; email the new price →
            </button>
          ) : (
            <>
              <p className="eyebrow" style={{ display: 'block', marginBottom: '.8rem' }}>
                Reclassify design
              </p>
              <div className={styles.variantPicker}>
                {variants.map((v) => (
                  <button
                    key={v.id}
                    className={`${styles.variantBtn} ${newVariantId === v.id ? styles.variantActive : ''}`}
                    onClick={() => setNewVariantId(v.id)}
                  >
                    <span>{v.name_en}</span>
                    <em>{v.price_egp} EGP</em>
                  </button>
                ))}
              </div>

              <label>Message to the client</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Your reference photos need more detailed hand-painting, so this is a complex design."
              />

              <div className={styles.priceCompare}>
                <span>
                  Was <s>{currentPrice} EGP</s>
                </span>
                <span className={styles.newPrice}>New total {newTotal} EGP</span>
              </div>

              <div className={styles.row}>
                <button
                  className="btn btn-solid"
                  disabled={pending || newVariantId === currentVariantId}
                  onClick={() => run(() => changeBookingVariant(bookingId, newVariantId, note), () => setTierMode(false))}
                >
                  {pending ? 'Sending…' : 'Update & email client'}
                </button>
                <button className="btn btn-ghost" onClick={() => setTierMode(false)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showReschedule && (
        <RescheduleModal
          bookingId={bookingId}
          durationMinutes={durationMinutes}
          currentLabel={currentLabel}
          title="Move this appointment"
          onClose={() => setShowReschedule(false)}
          onConfirm={(date, time) => ownerReschedule(bookingId, date, time)}
        />
      )}
    </div>
  );
}
