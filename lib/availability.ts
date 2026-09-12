/**
 * Turns the owner's free ranges ("7 Jul, 1pm–6pm") into concrete bookable
 * start times for a specific service duration, excluding anything that
 * would overlap a booking that's already taken.
 *
 * Example: a 1h service inside 13:00–18:00 with a 60-minute step yields
 * 13:00, 14:00, 15:00, 16:00, 17:00 — and once someone books 14:00–15:00,
 * that start disappears for everyone else.
 */

export interface TimeRange {
  /** "HH:MM" or "HH:MM:SS" */
  start_time: string;
  end_time: string;
}

export interface BusySpan {
  /** minutes from midnight */
  startMin: number;
  endMin: number;
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12h(time: string): string {
  const total = toMinutes(time);
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Total free minutes across a day's ranges (what the admin panel shows). */
export function totalRangeMinutes(ranges: TimeRange[]): number {
  return ranges.reduce((sum, r) => sum + (toMinutes(r.end_time) - toMinutes(r.start_time)), 0);
}

/**
 * Bookable start times for one day.
 *
 * @param ranges       the owner's free ranges for that day
 * @param busy         spans already taken by live bookings
 * @param durationMin  how long the chosen service needs
 * @param stepMin      granularity of generated starts (default 30)
 * @param minStartMin  earliest allowed start (used to hide past times today)
 */
export function computeOpenStarts(
  ranges: TimeRange[],
  busy: BusySpan[],
  durationMin: number,
  stepMin = 30,
  minStartMin = 0
): string[] {
  if (durationMin <= 0) return [];
  const step = Math.max(5, stepMin);
  const starts: string[] = [];

  for (const range of ranges) {
    const rangeStart = toMinutes(range.start_time);
    const rangeEnd = toMinutes(range.end_time);

    // Align the first candidate to the step grid relative to the range start.
    for (let start = rangeStart; start + durationMin <= rangeEnd; start += step) {
      if (start < minStartMin) continue;
      const end = start + durationMin;
      const overlaps = busy.some((b) => start < b.endMin && end > b.startMin);
      if (!overlaps) starts.push(toTimeString(start));
    }
  }

  return [...new Set(starts)].sort();
}

/** How many distinct start times a day offers — for the calendar badges. */
export function countOpenStarts(
  ranges: TimeRange[],
  busy: BusySpan[],
  durationMin: number,
  stepMin = 30,
  minStartMin = 0
): number {
  return computeOpenStarts(ranges, busy, durationMin, stepMin, minStartMin).length;
}
