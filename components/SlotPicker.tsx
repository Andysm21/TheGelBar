'use client';

import { useEffect, useState } from 'react';
import Calendar, { DayAvailability } from '@/components/Calendar/Calendar';
import NailLoader from '@/components/NailLoader/NailLoader';
import { fetchMonthAvailability, fetchOpenStarts } from '@/lib/supabase/actions';
import { computeOpenStarts, formatTime12h } from '@/lib/availability';
import styles from './SlotPicker.module.css';

/**
 * The one calendar + time-slot picker used everywhere a time gets chosen:
 * the booking wizard, the client reschedule flow, and the owner's
 * reschedule flow. All three therefore see identical availability,
 * computed from the owner's free ranges minus real bookings.
 */
export default function SlotPicker({
  durationMinutes,
  slotStepMinutes = 30,
  selectedDate,
  selectedTime,
  onSelect,
  excludeBookingId,
}: {
  durationMinutes: number;
  slotStepMinutes?: number;
  selectedDate: string | null;
  selectedTime: string | null;
  onSelect: (date: string | null, time: string | null) => void;
  excludeBookingId?: string;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  // Month grid: compute a per-day open count with the same engine the
  // server uses, so the badges match what the day actually offers.
  useEffect(() => {
    let cancelled = false;
    fetchMonthAvailability(year, month).then(({ ranges, blockedDates, bookings }) => {
      if (cancelled) return;

      const rangesByDate = new Map<string, { start_time: string; end_time: string }[]>();
      for (const r of ranges as any[]) {
        const list = rangesByDate.get(r.date) ?? [];
        list.push({ start_time: r.start_time, end_time: r.end_time });
        rangesByDate.set(r.date, list);
      }

      const busyByDate = new Map<string, { startMin: number; endMin: number }[]>();
      for (const b of bookings as any[]) {
        if (excludeBookingId && b.id === excludeBookingId) continue;
        const s = new Date(b.scheduled_start);
        const e = new Date(b.scheduled_end);
        const key = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
        const list = busyByDate.get(key) ?? [];
        list.push({ startMin: s.getHours() * 60 + s.getMinutes(), endMin: e.getHours() * 60 + e.getMinutes() });
        busyByDate.set(key, list);
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      const blocked = new Set(blockedDates as string[]);

      const days: DayAvailability[] = [];
      for (const [date, list] of rangesByDate) {
        if (blocked.has(date)) continue;
        if (date < todayStr) continue;
        const open = computeOpenStarts(
          list,
          busyByDate.get(date) ?? [],
          durationMinutes,
          slotStepMinutes,
          date === todayStr ? nowMin : 0
        );
        days.push({ date, openCount: open.length, full: open.length === 0 });
      }
      for (const date of blocked) days.push({ date, blocked: true });
      setAvailability(days);
    });
    return () => {
      cancelled = true;
    };
  }, [year, month, durationMinutes, slotStepMinutes, excludeBookingId]);

  // Authoritative per-day times come from the server.
  useEffect(() => {
    if (!selectedDate) {
      setTimes([]);
      return;
    }
    let cancelled = false;
    setLoadingTimes(true);
    fetchOpenStarts(selectedDate, durationMinutes, excludeBookingId).then((rows) => {
      if (cancelled) return;
      setTimes(rows);
      setLoadingTimes(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, durationMinutes, excludeBookingId]);

  return (
    <div>
      <Calendar
        year={year}
        month={month}
        selectedDate={selectedDate}
        onSelectDate={(d) => onSelect(d, null)}
        onMonthChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
        availability={availability}
      />

      {selectedDate && (
        <div className={styles.slotSection}>
          <p className={`eyebrow ${styles.slotLabel}`}>Available start times</p>
          {loadingTimes ? (
            <NailLoader size="inline" />
          ) : times.length === 0 ? (
            <p className={styles.empty}>
              Nothing open that fits this service on this day. Try another date.
            </p>
          ) : (
            <div className={styles.slots}>
              {times.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => onSelect(selectedDate, time)}
                  className={`${styles.slot} ${selectedTime === time ? styles.slotActive : ''}`}
                >
                  {formatTime12h(time)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
