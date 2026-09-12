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
  expectedTotal,
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
  /** What the system says is owed — the starting point for the amount box. */
  expectedTotal: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [declineMode, setDeclineMode] = useState(false);
  const [reason, setReason] = useState('');

  const [payMode, setPayMode] = useState(false);
  const [wasCompleted, setWasCompleted] = useState(true);
  const [amountPaid, setAmountPaid] = useState(String(expectedTotal));
  const [paymentNote, setPaymentNote] = useState('');

  const [tierMode, setTierMode] = useState(false);
  const [newVariantId, setNewVariantId] = useState(currentVariantId);
  const [note, setNote] = useState('');

  const newVariant = variants.find((v) => v.id === newVariantId);
  const newTotal = (newVariant?.price_egp ?? 0) + addonTotal;

  // Only ask for a reason when the money actually differs from the quote.
  const paidNumber = Number(amountPaid);
  const differs = Number.isFinite(paidNumber) && paidNumber !== expectedTotal;
  const diffAmount = Math.abs(paidNumber - expectedTotal);
  const diffLabel = paidNumber < expectedTotal ? `${diffAmount} EGP less` : `${diffAmount} EGP more`;

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

      {status === 'confirmed' && !payMode && (
        <div className={styles.row}>
          <button className="btn btn-solid" disabled={pending} onClick={() => setPayMode(true)}>
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

      {payMode && (
        <div className={styles.block}>
          <p className="eyebrow" style={{ display: 'block', marginBottom: '.8rem' }}>
            Close this appointment
          </p>

          <label className={styles.check}>
            <input type="checkbox" checked={wasCompleted} onChange={(e) => setWasCompleted(e.target.checked)} />
            The service was carried out
          </label>

          <label>Amount collected</label>
          <div className={styles.amountRow}>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className={styles.amountInput}
            />
            <span className={styles.amountSuffix}>EGP</span>
          </div>

          <p className={styles.expected}>
            System price: <strong>{expectedTotal} EGP</strong>
            {differs && <span className={styles.diff}> · {diffLabel}</span>}
          </p>

          {differs && (
            <>
              <label>Reason for the difference</label>
              <textarea
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Gave a 100 EGP discount — she waited while I finished the previous client."
              />
            </>
          )}

          <div className={styles.row}>
            <button
              className="btn btn-solid"
              disabled={pending || (differs && !paymentNote.trim())}
              onClick={() =>
                run(
                  () => markBookingPaid(bookingId, { wasCompleted, amountPaid: Number(amountPaid), paymentNote }),
                  () => setPayMode(false)
                )
              }
            >
              {pending && <NailLoader size="mini" />}
              {pending ? 'Saving…' : 'Save & close'}
            </button>
            <button className="btn btn-ghost" onClick={() => setPayMode(false)}>
              Back
            </button>
          </div>
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
