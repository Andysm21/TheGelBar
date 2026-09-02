'use client';

import { useState } from 'react';

export interface DayAvailability {
  /** YYYY-MM-DD */
  date: string;
  /** open slot count for that day, or undefined if fully unknown/unfetched */
  openCount?: number;
  full?: boolean;
  blocked?: boolean;
}

interface CalendarProps {
  year: number;
  month: number; // 0-11
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
  availability: DayAvailability[];
  /** owner mode allows clicking blocked/empty days too, to toggle them */
  ownerMode?: boolean;
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function Calendar({ year, month, selectedDate, onSelectDate, onMonthChange, availability, ownerMode }: CalendarProps) {
  const availByDate = Object.fromEntries(availability.map((a) => [a.date, a]));
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { day: number; date: string; muted: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const day = daysInPrevMonth - startWeekday + i + 1;
    cells.push({ day, date: '', muted: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: toDateStr(year, month, d), muted: false });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - startWeekday - daysInMonth + 1, date: '', muted: true });
  }

  function prevMonth() {
    onMonthChange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
  }
  function nextMonth() {
    onMonthChange(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
  }

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.9rem' }}>
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: 'var(--deep)' }}
        >
          ‹
        </button>
        <div className="sans" style={{ fontWeight: 700, fontSize: '.9rem' }}>
          {MONTH_NAMES[month]} {year}
        </div>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: 'var(--deep)' }}
        >
          ›
        </button>
      </div>

      <div className="sans" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, fontSize: '.72rem', textAlign: 'center' }}>
        {DOW.map((d, i) => (
          <div key={i} style={{ color: 'var(--sub)', fontWeight: 700, padding: '.3rem 0' }}>
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (cell.muted) {
            return (
              <div key={i} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e3d3da' }}>
                {cell.day > 0 ? cell.day : ''}
              </div>
            );
          }
          const info = availByDate[cell.date];
          const isSelected = selectedDate === cell.date;
          const isFull = info?.full;
          const isBlocked = info?.blocked;
          const clickable = ownerMode || (!isFull && !isBlocked);

          let bg = '#fff';
          let color = 'var(--text)';
          let cursor = clickable ? 'pointer' : 'not-allowed';
          if (isSelected) {
            bg = 'var(--pink)';
            color = '#fff';
          } else if (isBlocked) {
            bg = '#f3f3f3';
            color = '#ccc';
          } else if (isFull) {
            bg = '#f3f3f3';
            color = '#ccc';
          } else if (info?.openCount !== undefined) {
            bg = '#fff0f5';
          }

          return (
            <button
              key={i}
              disabled={!clickable}
              onClick={() => clickable && onSelectDate(cell.date)}
              style={{
                aspectRatio: '1',
                minHeight: 44, // touch target
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                border: 'none',
                background: bg,
                color,
                cursor,
                fontWeight: isSelected ? 700 : 400,
              }}
            >
              <span>{cell.day}</span>
              {info?.openCount !== undefined && !isSelected && (
                <span style={{ fontSize: '.55rem', opacity: 0.7 }}>{isBlocked ? 'blocked' : isFull ? 'full' : `${info.openCount} open`}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
