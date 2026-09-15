/**
 * The studio's clock.
 *
 * Every wall-clock time in this app — availability ranges, the time a client
 * picks, what emails and the admin panel show — means Cairo time. The server
 * (Vercel, UTC) and the browser (wherever the viewer is) must never apply
 * their own timezone to it. Before this module existed, `new Date('…T14:00')`
 * on Vercel stored 14:00 UTC, which Cairo browsers then rendered as 17:00.
 *
 * Works identically in Node and the browser: it only uses Intl, which ships
 * the IANA zone data (including Egypt's daylight-saving switches).
 */

export const STUDIO_TZ = 'Africa/Cairo';

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: STUDIO_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function cairoFields(instant: Date) {
  const get = (type: string) => Number(partsFmt.formatToParts(instant).find((p) => p.type === type)?.value);
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour'), mi: get('minute'), s: get('second') };
}

/** Milliseconds Cairo is ahead of UTC at this instant (+2h winter, +3h summer). */
function cairoOffsetMs(instant: Date) {
  const f = cairoFields(instant);
  return Date.UTC(f.y, f.mo - 1, f.d, f.h, f.mi, f.s) - Math.floor(instant.getTime() / 1000) * 1000;
}

/** "2026-09-20" + "14:00" in Cairo → the real instant. */
export function cairoToInstant(date: string, time = '00:00'): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // First guess with the offset at that moment, then correct once in case the
  // guess landed on the other side of a daylight-saving switch.
  let instant = asUtc - cairoOffsetMs(new Date(asUtc));
  instant = asUtc - cairoOffsetMs(new Date(instant));
  return new Date(instant);
}

/** An instant → the Cairo calendar date, "YYYY-MM-DD". */
export function cairoDate(instant: Date | string): string {
  const f = cairoFields(new Date(instant));
  return `${f.y}-${String(f.mo).padStart(2, '0')}-${String(f.d).padStart(2, '0')}`;
}

/** An instant → minutes since Cairo midnight. */
export function cairoMinutes(instant: Date | string): number {
  const f = cairoFields(new Date(instant));
  return f.h * 60 + f.mi;
}

/** UTC ISO bounds of a whole Cairo day, for querying timestamptz columns. */
export function cairoDayBounds(date: string) {
  const start = cairoToInstant(date, '00:00');
  const [y, mo, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, mo - 1, d + 1));
  const nextDate = next.toISOString().slice(0, 10);
  return { startIso: start.toISOString(), endIso: cairoToInstant(nextDate, '00:00').toISOString() };
}

export function formatCairoTime(instant: Date | string) {
  return new Date(instant).toLocaleTimeString('en-GB', { timeZone: STUDIO_TZ, hour: '2-digit', minute: '2-digit' });
}

export function formatCairoDate(instant: Date | string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(instant).toLocaleDateString('en-GB', { timeZone: STUDIO_TZ, ...opts });
}
