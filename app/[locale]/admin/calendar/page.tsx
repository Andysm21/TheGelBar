'use client';

import { useState } from 'react';
import AdminShell from '@/components/AdminShell';
import Calendar, { DayAvailability } from '@/components/Calendar/Calendar';
import { MOCK_BOOKINGS } from '@/lib/mock-data';

// TODO: one Supabase query per month view against `availability_slots`
// (owner side) — never per-day, to avoid N+1 when rendering the grid.
const INITIAL_AVAILABILITY: DayAvailability[] = [
  { date: '2026-09-01', openCount: 6 },
  { date: '2026-09-02', openCount: 4 },
  { date: '2026-09-03', blocked: true },
  { date: '2026-09-04', openCount: 3 },
  { date: '2026-09-05', openCount: 5 },
];

export default function AdminCalendarPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(8);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availability, setAvailability] = useState(INITIAL_AVAILABILITY);

  function toggleBlocked(date: string) {
    setAvailability((prev) => {
      const existing = prev.find((a) => a.date === date);
      if (existing) {
        return prev.map((a) => (a.date === date ? { ...a, blocked: !a.blocked } : a));
      }
      return [...prev, { date, blocked: true }];
    });
  }

  const bookingsOnDay = selectedDate ? MOCK_BOOKINGS.filter((b) => b.scheduledStart.startsWith(selectedDate)) : [];

  return (
    <AdminShell>
      <h1 style={{ fontSize: '1.3rem', color: 'var(--deep)', marginBottom: '.3rem' }}>Calendar</h1>
      <p className="sans" style={{ fontSize: '.75rem', color: 'var(--sub)', marginBottom: '1.25rem' }}>
        Tap a day to block/unblock it, or view what's booked. Synced with Google Calendar — she sees it in Apple Calendar via a subscribed Google account.
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.9rem' }}>
            <p className="sans" style={{ fontSize: '.78rem', fontWeight: 700 }}>{selectedDate}</p>
            <button className="btn btn-ghost" style={{ fontSize: '.68rem', padding: '.5rem .9rem' }} onClick={() => toggleBlocked(selectedDate)}>
              {availability.find((a) => a.date === selectedDate)?.blocked ? 'Unblock day' : 'Block day'}
            </button>
          </div>

          {bookingsOnDay.length === 0 ? (
            <p className="sans" style={{ fontSize: '.76rem', color: 'var(--sub)' }}>No bookings this day.</p>
          ) : (
            bookingsOnDay.map((b) => (
              <a
                key={b.id}
                href={`admin/bookings/${b.id}`}
                className="sans"
                style={{ display: 'flex', justifyContent: 'space-between', padding: '.6rem 0', borderBottom: '1px solid #f6eef1', fontSize: '.8rem' }}
              >
                <span>{new Date(b.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {b.clientName}</span>
                <span className={`badge ${b.status === 'pending' ? 'badge-pending' : 'badge-confirmed'}`}>{b.status}</span>
              </a>
            ))
          )}
        </div>
      )}
    </AdminShell>
  );
}
