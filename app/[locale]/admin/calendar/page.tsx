'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import Calendar, { DayAvailability } from '@/components/Calendar/Calendar';
import { MOCK_BOOKINGS } from '@/lib/mock-data';

// TODO: one Supabase query per month view against `availability_slots`
// (owner side) — never per-day, to avoid N+1.
const INITIAL_SLOTS: Record<string, string[]> = {
  '2026-09-01': ['10:00 AM', '11:15 AM', '2:30 PM', '3:45 PM', '5:00 PM', '6:15 PM'],
  '2026-09-02': ['10:00 AM', '11:15 AM', '2:30 PM', '3:45 PM'],
  '2026-09-04': ['10:00 AM', '11:15 AM', '2:30 PM'],
  '2026-09-05': ['10:00 AM', '11:15 AM', '2:30 PM', '3:45 PM', '5:00 PM'],
};

const COMMON_TIMES = ['9:00 AM', '10:00 AM', '11:15 AM', '12:30 PM', '2:30 PM', '3:45 PM', '5:00 PM', '6:15 PM'];

export default function AdminCalendarPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(8);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockedDays, setBlockedDays] = useState<Set<string>>(new Set(['2026-09-03']));
  const [slotsByDate, setSlotsByDate] = useState<Record<string, string[]>>(INITIAL_SLOTS);
  const [customTime, setCustomTime] = useState('');

  const availability: DayAvailability[] = Object.keys({ ...slotsByDate, ...Object.fromEntries([...blockedDays].map((d) => [d, []])) }).map((date) => ({
    date,
    blocked: blockedDays.has(date),
    openCount: blockedDays.has(date) ? undefined : (slotsByDate[date] || []).length,
    full: !blockedDays.has(date) && (slotsByDate[date] || []).length === 0,
  }));

  function toggleBlocked(date: string) {
    setBlockedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function addSlot(date: string, time: string) {
    if (!time) return;
    setSlotsByDate((prev) => {
      const existing = prev[date] || [];
      if (existing.includes(time)) return prev;
      return { ...prev, [date]: [...existing, time] };
    });
  }

  function removeSlot(date: string, time: string) {
    setSlotsByDate((prev) => ({ ...prev, [date]: (prev[date] || []).filter((t) => t !== time) }));
  }

  const daySlots = selectedDate ? slotsByDate[selectedDate] || [] : [];
  const dayBlocked = selectedDate ? blockedDays.has(selectedDate) : false;
  const bookingsOnDay = selectedDate ? MOCK_BOOKINGS.filter((b) => b.scheduledStart.startsWith(selectedDate)) : [];
  const bookedTimes = new Set(bookingsOnDay.map((b) => new Date(b.scheduledStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })));

  return (
    <AdminShell>
      <h1 style={{ fontSize: '1.3rem', color: 'var(--deep)', marginBottom: '.3rem' }}>Calendar</h1>
      <p className="sans" style={{ fontSize: '.75rem', color: 'var(--sub)', marginBottom: '1.25rem' }}>
        Tap a day to manage its open slots. Synced with Google Calendar — she sees it in Apple Calendar via a subscribed Google account.
      </p>

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
            <p className="sans" style={{ fontSize: '.8rem', fontWeight: 700 }}>{selectedDate}</p>
            <button className="btn btn-ghost" style={{ fontSize: '.68rem', padding: '.5rem .9rem' }} onClick={() => toggleBlocked(selectedDate)}>
              {dayBlocked ? 'Unblock day' : 'Block whole day'}
            </button>
          </div>

          {!dayBlocked && (
            <>
              <p className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.6rem' }}>
                Open slots
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
                {daySlots.length === 0 && (
                  <span className="sans" style={{ fontSize: '.75rem', color: 'var(--sub)' }}>
                    No slots added yet.
                  </span>
                )}
                {daySlots.map((time) => {
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
                      {time}
                      {isBooked ? (
                        <span style={{ color: 'var(--sub)', fontSize: '.65rem' }}>booked</span>
                      ) : (
                        <button
                          onClick={() => removeSlot(selectedDate, time)}
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
                {COMMON_TIMES.filter((t) => !daySlots.includes(t)).map((time) => (
                  <button
                    key={time}
                    onClick={() => addSlot(selectedDate, time)}
                    className="sans"
                    style={{ fontSize: '.72rem', padding: '.45rem .8rem', minHeight: 40, borderRadius: 20, border: '1px dashed var(--border)', background: '#fff', color: 'var(--deep)' }}
                  >
                    + {time}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '.6rem' }}>
                <input
                  type="text"
                  placeholder="Custom time, e.g. 7:30 PM"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '.7rem', padding: '.6rem 1.1rem' }}
                  onClick={() => {
                    addSlot(selectedDate, customTime.trim());
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
                    {new Date(b.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {b.clientName}
                  </span>
                  <span className={`badge ${b.status === 'pending' ? 'badge-pending' : 'badge-confirmed'}`}>{b.status}</span>
                </a>
              ))}
            </>
          )}
        </div>
      )}
    </AdminShell>
  );
}
