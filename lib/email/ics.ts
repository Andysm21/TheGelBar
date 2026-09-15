/**
 * Minimal iCalendar (RFC 5545) event, attached to confirmation, reschedule
 * and reminder emails so a client can add the appointment to Apple or
 * Google Calendar with one tap — no calendar login needed on their side.
 */

export interface IcsEvent {
  uid: string; // stable per booking, so a reschedule updates instead of duplicating
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  /** Bump on every change; calendars keep the highest sequence. */
  sequence?: number;
  method?: 'REQUEST' | 'CANCEL';
}

export const STUDIO_LOCATION = '7 Ahmed Oraby, Madinet Al Eelam, Agouza, Giza Governorate';

function stamp(d: Date) {
  // 20260915T143000Z
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** RFC 5545 text escaping. */
function esc(s: string) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Content lines are limited to 75 *octets*, not characters — an em dash or
 * any Arabic text is several bytes each. Fold by byte length, and never
 * split inside a character.
 */
function fold(line: string) {
  const encoder = new TextEncoder();
  const LIMIT = 74; // continuation lines also carry a leading space
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > LIMIT) {
      out.push(current);
      current = ' ';
      bytes = 1;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n');
}

export function buildIcs(e: IcsEvent) {
  const method = e.method ?? 'REQUEST';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Gel Bar//Bookings//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${e.uid}@thegelbar`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SEQUENCE:${e.sequence ?? 0}`,
    `SUMMARY:${esc(e.summary)}`,
    e.description ? `DESCRIPTION:${esc(e.description)}` : '',
    `LOCATION:${esc(e.location ?? STUDIO_LOCATION)}`,
    `STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    // phone alert 2h before; the email reminder the day before covers the rest
    method === 'CANCEL' ? '' : 'BEGIN:VALARM',
    method === 'CANCEL' ? '' : 'TRIGGER:-PT2H',
    method === 'CANCEL' ? '' : 'ACTION:DISPLAY',
    method === 'CANCEL' ? '' : `DESCRIPTION:${esc(e.summary)}`,
    method === 'CANCEL' ? '' : 'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.map(fold).join('\r\n') + '\r\n';
}
