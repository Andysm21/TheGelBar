'use client';

import { useEffect, useState, useTransition } from 'react';
import Calendar, { DayAvailability } from '@/components/Calendar/Calendar';
import {
  fetchMonthAvailability,
  fetchBookingsForDate,
  addAvailabilityRange,
  removeAvailabilityRange,
  setDayBlocked,
  bulkAddRanges,
} from '@/lib/supabase/actions';
import { formatTime12h, toMinutes, totalRangeMinutes } from '@/lib/availability';
import styles from './AdminCalendarClient.module.css';

interface Range {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
}

const PRESETS = [
  { label: 'Morning', start: '10:00', end: '14:00' },
  { label: 'Afternoon', start: '13:00', end: '18:00' },
  { label: 'Evening', start: '16:00', end: '21:00' },
  { label: 'Full day', start: '10:00', end: '20:00' },
];

function hoursLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m free`;
  if (h) return `${h}h free`;
  return `${m}m free`;
}

export default function AdminCalendarClient() {
  const [pending, startTransition] = useTransition();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [allRanges, setAllRanges] = useState<Range[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [dayBookings, setDayBookings] = useState<any[]>([]);

  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('18:00');
  const [error, setError] = useState('');
  const [applyWeekly, setApplyWeekly] = useState(false);

  function loadMonth() {
    return fetchMonthAvailability(year, month).then(({ ranges, blockedDates, bookings }) => {
      setAllRanges(ranges as Range[]);
      setBlockedDates(blockedDates as string[]);

      const byDate = new Map<string, Range[]>();
      for (const r of ranges as Range[]) {
        const list = byDate.get(r.date) ?? [];
        list.push(r);
        byDate.set(r.date, list);
      }
      const bookedCount = new Map<string, number>();
      for (const b of bookings as any[]) {
        const d = new Date(b.scheduled_start);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        bookedCount.set(key, (bookedCount.get(key) ?? 0) + 1);
      }

      const blocked = new Set(blockedDates as string[]);
      const days: DayAvailability[] = [];
      for (const [date, list] of byDate) {
        if (blocked.has(date)) continue;
        days.push({ date, openCount: Math.round(totalRangeMinutes(list) / 60) });
      }
      for (const date of blocked) days.push({ date, blocked: true });
      for (const [date, count] of bookedCount) {
        if (!byDate.has(date) && !blocked.has(date)) days.push({ date, openCount: count, full: true });
      }
      setAvailability(days);
    });
  }

  function loadDay(date: string) {
    fetchBookingsForDate(date).then(setDayBookings);
  }

  useEffect(() => {
    loadMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  useEffect(() => {
    if (selectedDate) loadDay(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const dayRanges = allRanges.filter((r) => r.date === selectedDate).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const dayBlocked = selectedDate ? blockedDates.includes(selectedDate) : false;
  const dayFreeMinutes = totalRangeMinutes(dayRanges);

  function act(fn: () => Promise<void>) {
    setError('');
    startTransition(async () => {
      try {
        await fn();
        await loadMonth();
        if (selectedDate) loadDay(selectedDate);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong — try again.');
      }
    });
  }

  /** Same weekday, rest of the visible month. */
  function sameWeekdayDates(from: string) {
    const base = new Date(`${from}T00:00:00`);
    const out: string[] = [];
    const d = new Date(base);
    while (d.getMonth() === month) {
      out.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      );
      d.setDate(d.getDate() + 7);
    }
    return out;
  }

  function addRange() {
    if (!selectedDate) return;
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      setError('End time must be after the start time.');
      return;
    }
    const dates = applyWeekly ? sameWeekdayDates(selectedDate) : [selectedDate];
    act(() => (dates.length > 1 ? bulkAddRanges(dates, startTime, endTime) : addAvailabilityRange(selectedDate, startTime, endTime)));
  }

  return (
    <div className={styles.layout}>
      <div>
        <Calendar
          year={year}
          month={month}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onMonthChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
          availability={availability}
          ownerMode
        />
        <p className={styles.legend}>
          <span className={styles.legendOpen} /> hours free &nbsp;&nbsp;
          <span className={styles.legendBlocked} /> blocked day
        </p>
      </div>

      <aside className={styles.panel}>
        {!selectedDate ? (
          <div className={styles.placeholder}>
            <p className="eyebrow">Availability</p>
            <h3 className={styles.placeholderTitle}>Pick a day</h3>
            <p className={styles.placeholderText}>
              Set the hours you're free — for example 1:00 PM to 6:00 PM. Clients then see every start time that fits
              their service inside that window.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.panelHead}>
              <div>
                <p className="eyebrow">Selected day</p>
                <h3 className={styles.panelDate}>
                  {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                {!dayBlocked && dayRanges.length > 0 && (
                  <p className={styles.freeTotal}>{hoursLabel(dayFreeMinutes)}</p>
                )}
              </div>
              <button
                className={`btn btn-sm ${dayBlocked ? '' : styles.blockBtn}`}
                disabled={pending}
                onClick={() => act(() => setDayBlocked(selectedDate, !dayBlocked))}
              >
                {pending ? 'Saving…' : dayBlocked ? 'Unblock' : 'Block day'}
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            {dayBlocked ? (
              <p className={styles.blockedNote}>
                This whole day is blocked — no one can book it, whatever hours are set.
              </p>
            ) : (
              <>
                <p className={`eyebrow ${styles.groupLabel}`}>Free hours</p>
                {dayRanges.length === 0 ? (
                  <p className={styles.empty}>No hours set yet — add a window below.</p>
                ) : (
                  <ul className={styles.rangeList}>
                    {dayRanges.map((r) => (
                      <li key={r.id} className={styles.rangeRow}>
                        <span className={styles.rangeTime}>
                          {formatTime12h(r.start_time)} – {formatTime12h(r.end_time)}
                        </span>
                        <span className={styles.rangeLen}>
                          {hoursLabel(toMinutes(r.end_time) - toMinutes(r.start_time))}
                        </span>
                        <button
                          className={styles.removeBtn}
                          disabled={pending}
                          onClick={() => act(() => removeAvailabilityRange(r.id))}
                          aria-label="Remove this window"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <p className={`eyebrow ${styles.groupLabel}`}>Add a window</p>
                <div className={styles.presets}>
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      className={styles.preset}
                      onClick={() => {
                        setStartTime(p.start);
                        setEndTime(p.end);
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className={styles.timeRow}>
                  <label className={styles.timeField}>
                    From
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </label>
                  <label className={styles.timeField}>
                    To
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </label>
                </div>

                <label className={styles.repeat}>
                  <input type="checkbox" checked={applyWeekly} onChange={(e) => setApplyWeekly(e.target.checked)} />
                  Repeat every week this month
                </label>

                <button className="btn btn-solid btn-block" disabled={pending} onClick={addRange}>
                  {pending ? 'Saving…' : 'Add these hours'}
                </button>
              </>
            )}

            <p className={`eyebrow ${styles.groupLabel}`}>Booked this day</p>
            {dayBookings.length === 0 ? (
              <p className={styles.empty}>Nothing booked.</p>
            ) : (
              <ul className={styles.bookingList}>
                {dayBookings.map((b: any) => (
                  <li key={b.id}>
                    <a href={`admin/bookings/${b.id}`} className={styles.bookingRow}>
                      <span className={styles.bookingTime}>
                        {new Date(b.scheduled_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {new Date(b.scheduled_end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={styles.bookingName}>{b.profiles?.name ?? 'Client'}</span>
                      <span className={`badge badge-${b.status === 'pending' ? 'pending' : 'confirmed'}`}>{b.status}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
