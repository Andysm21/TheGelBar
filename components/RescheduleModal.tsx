'use client';

import { useEffect, useState, useTransition } from 'react';
import SlotPicker from './SlotPicker';
import NailLoader from './NailLoader/NailLoader';
import { formatTime12h } from '@/lib/availability';
import styles from './RescheduleModal.module.css';

/**
 * Shared reschedule dialog. Both the client's "reschedule" and the
 * owner's "move this booking" use it, so both sides always see the
 * identical calendar and the identical open time slots.
 */
export default function RescheduleModal({
  bookingId,
  durationMinutes,
  currentLabel,
  onClose,
  onConfirm,
  title = 'Pick a new time',
}: {
  bookingId: string;
  durationMinutes: number;
  currentLabel: string;
  onClose: () => void;
  onConfirm: (date: string, time: string) => Promise<void>;
  title?: string;
}) {
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function confirm() {
    if (!date || !time) {
      setError('Pick a date and a time first.');
      return;
    }
    setError('');
    startTransition(async () => {
      try {
        await onConfirm(date, time);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not reschedule — try again.');
      }
    });
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div>
            <p className="eyebrow">Reschedule</p>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.current}>Currently: {currentLabel}</p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.body}>
          <SlotPicker
            durationMinutes={durationMinutes}
            selectedDate={date}
            selectedTime={time}
            onSelect={(d, tm) => {
              setDate(d);
              setTime(tm);
            }}
            excludeBookingId={bookingId}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.footer}>
          <span className={styles.picked}>
            {date && time ? `${date} · ${formatTime12h(time)}` : 'No new time picked yet'}
          </span>
          <div className={styles.footerBtns}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-solid btn-sm" disabled={!date || !time || pending} onClick={confirm}>
              {pending && <NailLoader size="mini" />}
              {pending ? 'Saving…' : 'Confirm new time'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
