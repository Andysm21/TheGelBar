'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Calendar, { DayAvailability } from '@/components/Calendar/Calendar';
import { fetchMonthAvailability, fetchBookingsForDate, addAvailabilitySlot, removeAvailabilitySlot, setDayBlocked } from '@/lib/supabase/actions';

const COMMON_TIMES = ['09:00', '10:00', '11:15', '12:30', '14:30', '15:45', '17:00', '18:15'];

function to12h(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

interface DayBooking {
  id: string;
  status: string;
  scheduled_start: string;
  profiles: { name: string | null } | null;
}

export default function AdminCalendarClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [daySlots, setDaySlots] = useState<{ start_time: string }[]>([]);
  const [dayBlockedFlag, setDayBlockedFlag] = useState(false);
  const [dayBookings, setDayBookings] = useState<DayBooking[]>([]);
  const [customTime, setCustomTime] = useState('');
  const [actionError, setActionError] = useState('');

  function loadMonth() {
    return fetchMonthAvailability(year, month).then(({ slots, blockedDates }) => {
      const blockedSet = new Set(blockedDates);
      const openCounts = new Map<string, number>();
      for (const row of slots) openCounts.set(row.date, (openCounts.get(row.date) ?? 0) + 1);
      const dates = new Set([...openCounts.keys(), ...blockedSet]);
      setAvailability([...dates].map((date) => ({ date, openCount: blockedSet.has(date) ? undefined : openCounts.get(date), blocked: blockedSet.has(date) })));
      return { slots, blockedDates };
    });
  }

  // Refreshes the currently selected day's own slot list/blocked flag —
  // separate from loadMonth() so a mutation on the selected day shows up
  // immediately instead of only after re-selecting the date (the
  // reported "added a slot but nothing changed" bug).
  function loadDay(date: string) {
    fetchMonthAvailability(year, month).then(({ slots, blockedDates }) => {
      setDaySlots(slots.filter((r) => r.date === date).map((r) => ({ start_time: r.start_time })));
      setDayBlockedFlag(blockedDates.includes(date));
    });
    fetchBookingsForDate(date).then(setDayBookings);
  }

  useEffect(() => {
    loadMonth();
  }, [year, month]);

  useEffect(() => {
    if (!selectedDate) return;
    loadDay(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, year, month]);

  const dayBlocked = dayBlockedFlag;
  const openSlots = daySlots.map((s) => s.start_time.slice(0, 5));
  const bookingsOnDay = dayBookings;
  const bookedTimes = new Set(bookingsOnDay.map((b) => new Date(b.scheduled_start).toTimeString().slice(0, 5)));

  function act(fn: () => Promise<void>) {
    setActionError('');
    startTransition(async () => {
      try {
        await fn();
        loadMonth();
        if (selectedDate) loadDay(selectedDate);
        router.refresh();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Something went wrong — try again.');
      }
    });
  }

  return (
    <>
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

      {selectedDate && (
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.9rem', flexWrap: 'wrap', gap: '.6rem' }}>
            <p className="sans" style={{ fontSize: '.8rem', fontWeight: 700 }}>
              {selectedDate}
            </p>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '.68rem', padding: '.5rem .9rem' }}
              disabled={pending}
              onClick={() => act(() => setDayBlocked(selectedDate, !dayBlocked))}
            >
              {pending ? 'Saving…' : dayBlocked ? 'Unblock day' : 'Block whole day'}
            </button>
          </div>

          {actionError && (
            <p className="sans" style={{ fontSize: '.75rem', color: 'var(--danger)', marginBottom: '.9rem' }}>
              {actionError}
            </p>
          )}

          {!dayBlocked && (
            <>
              <p className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.6rem' }}>
                Open slots
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
                {openSlots.length === 0 && (
                  <span className="sans" style={{ fontSize: '.75rem', color: 'var(--sub)' }}>
                    No slots added yet.
                  </span>
                )}
                {openSlots.map((time) => {
                  const isBooked = bookedTimes.has(time);
                  return (
                    <span
                      key={time}
                      className="sans"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '.4rem',
                        fontSize: '.75rem',
                        padding: '.4rem .5rem .4rem .8rem',
                        borderRadius: 20,
                        border: '1px solid var(--border)',
                        background: isBooked ? '#fff0f5' : '#fff',
                      }}
                    >
                      {to12h(time)}
                      {isBooked ? (
                        <span style={{ color: 'var(--sub)', fontSize: '.65rem' }}>booked</span>
                      ) : (
                        <button
                          onClick={() => act(() => removeAvailabilitySlot(selectedDate, time))}
                          aria-label={`Remove ${time}`}
                          style={{ background: 'none', border: 'none', color: 'var(--sub)', cursor: 'pointer', fontSize: '.85rem', lineHeight: 1, padding: 0 }}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>

              <p className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.6rem' }}>
                Add a slot
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.9rem' }}>
                {COMMON_TIMES.filter((t) => !openSlots.includes(t)).map((time) => (
                  <button
                    key={time}
                    disabled={pending}
                    onClick={() => act(() => addAvailabilitySlot(selectedDate, time))}
                    className="sans"
                    style={{ fontSize: '.72rem', padding: '.45rem .8rem', minHeight: 40, borderRadius: 20, border: '1px dashed var(--border)', background: '#fff', color: 'var(--deep)' }}
                  >
                    + {to12h(time)}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '.6rem' }}>
                <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} style={{ flex: 1 }} />
                <button
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '.7rem', padding: '.6rem 1.1rem' }}
                  disabled={pending || !customTime}
                  onClick={() => {
                    act(() => addAvailabilitySlot(selectedDate, customTime));
                    setCustomTime('');
                  }}
                >
                  Add
                </button>
              </div>
            </>
          )}

          {bookingsOnDay.length > 0 && (
            <>
              <p className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', margin: '1.2rem 0 .6rem' }}>
                Bookings this day
              </p>
              {bookingsOnDay.map((b) => (
                <a
                  key={b.id}
                  href={`admin/bookings/${b.id}`}
                  className="sans"
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '.6rem 0', borderBottom: '1px solid #f6eef1', fontSize: '.8rem' }}
                >
                  <span>
                    {new Date(b.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {b.profiles?.name}
                  </span>
                  <span className={`badge ${b.status === 'pending' ? 'badge-pending' : 'badge-confirmed'}`}>{b.status}</span>
                </a>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
