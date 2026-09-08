/**
 * Branded transactional email templates.
 *
 * Plain string templates on purpose — email clients (Gmail, Outlook,
 * Apple Mail) only reliably support table layouts and inline styles, so
 * no CSS classes, no flex/grid, no external stylesheets.
 */

const GOLD = '#c9a24b';
const DEEP = '#2e2015';
const BG = '#f7f1e8';
const SUB = '#83725e';
const BORDER = '#e3d5bd';

export interface BookingEmailData {
  clientName: string;
  serviceName: string;
  variantName: string;
  addons: { name: string; quantity: number; price: number }[];
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
  totalPrice: number;
  notes?: string;
  bookingRef: string;
  siteUrl: string;
}

function shell(title: string, preheader: string, body: string, cta?: { label: string; url: string }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER};">

      <tr><td style="background:${DEEP};padding:28px 32px;text-align:center;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:1px;color:#ffffff;">The Gel Bar</div>
        <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#bdae94;padding-top:8px;">Nails by Mariam</div>
      </td></tr>

      <tr><td style="padding:36px 32px 8px;">
        <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:${GOLD};padding-bottom:12px;">${escape(preheader)}</div>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:normal;color:${DEEP};line-height:1.2;">${escape(title)}</h1>
      </td></tr>

      <tr><td style="padding:16px 32px 0;">${body}</td></tr>

      ${
        cta
          ? `<tr><td style="padding:28px 32px 8px;" align="center">
               <a href="${cta.url}" style="display:inline-block;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#ffffff;background:${DEEP};padding:15px 34px;text-decoration:none;">${escape(cta.label)}</a>
             </td></tr>`
          : ''
      }

      <tr><td style="padding:32px;">
        <div style="border-top:1px solid ${BORDER};padding-top:20px;font-family:Arial,sans-serif;font-size:11px;line-height:1.8;color:${SUB};text-align:center;">
          7 Ahmed Oraby, Madinet Al Eelam, Agouza, Giza<br>
          By appointment only &middot; <a href="https://www.instagram.com/thegelbar.eg" style="color:${GOLD};text-decoration:none;">@thegelbar.eg</a>
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function escape(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function paragraph(text: string) {
  return `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.75;color:${DEEP};">${text}</p>`;
}

function detailsTable(d: BookingEmailData) {
  const row = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${BORDER};font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${SUB};">${escape(label)}</td>
      <td align="right" style="padding:11px 0;border-bottom:1px solid ${BORDER};font-family:${strong ? 'Georgia,serif' : 'Arial,sans-serif'};font-size:${strong ? '17px' : '13px'};color:${DEEP};">${escape(value)}</td>
    </tr>`;

  const addonRows = d.addons
    .map((a) => row(a.quantity > 1 ? `${a.name} ×${a.quantity}` : a.name, `${a.price * a.quantity} EGP`))
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
    ${row('Service', `${d.serviceName} — ${d.variantName}`)}
    ${addonRows}
    ${row('Date', d.dateLabel)}
    ${row('Time', d.timeLabel)}
    ${row('Duration', d.durationLabel)}
    ${row('Total', `${d.totalPrice} EGP`, true)}
    ${row('Reference', `#${d.bookingRef}`)}
  </table>`;
}

/* ------------------------------------------------------------------ */
/* Client-facing                                                       */
/* ------------------------------------------------------------------ */

export function clientBookingRequested(d: BookingEmailData) {
  return {
    subject: `We got your booking request — ${d.dateLabel}`,
    html: shell(
      'Request received',
      'Pending confirmation',
      paragraph(`Hi ${escape(d.clientName)}, thanks for booking with The Gel Bar. Here's what you asked for:`) +
        detailsTable(d) +
        paragraph(
          `This slot is <strong>held while Mariam confirms it</strong> — you'll get another email the moment it's approved.`
        ),
      { label: 'View my bookings', url: `${d.siteUrl}/en/bookings` }
    ),
  };
}

export function clientBookingConfirmed(d: BookingEmailData) {
  return {
    subject: `Confirmed — ${d.dateLabel} at ${d.timeLabel}`,
    html: shell(
      "You're confirmed",
      'Appointment confirmed',
      paragraph(`Hi ${escape(d.clientName)}, your appointment is locked in. See you then.`) +
        detailsTable(d) +
        paragraph(
          `Need to change it? You can reschedule or cancel yourself up to <strong>24 hours before</strong> your slot.`
        ),
      { label: 'Manage my booking', url: `${d.siteUrl}/en/bookings` }
    ),
  };
}

export function clientBookingDeclined(d: BookingEmailData, reason?: string) {
  return {
    subject: `About your ${d.dateLabel} booking`,
    html: shell(
      "That slot didn't work out",
      'Booking not confirmed',
      paragraph(`Hi ${escape(d.clientName)}, unfortunately Mariam can't take the ${escape(d.dateLabel)} slot.`) +
        (reason ? paragraph(`<em>${escape(reason)}</em>`) : '') +
        detailsTable(d) +
        paragraph(`Nothing was charged. Pick another time whenever you're ready — the calendar is up to date.`),
      { label: 'Choose another time', url: `${d.siteUrl}/en/book` }
    ),
  };
}

export function clientBookingRescheduled(d: BookingEmailData, by: 'owner' | 'client') {
  return {
    subject: `Your appointment moved to ${d.dateLabel}`,
    html: shell(
      'New time set',
      'Appointment rescheduled',
      paragraph(
        by === 'owner'
          ? `Hi ${escape(d.clientName)}, Mariam moved your appointment. Here are the new details:`
          : `Hi ${escape(d.clientName)}, your appointment has been moved. Here are the new details:`
      ) + detailsTable(d),
      { label: 'View my bookings', url: `${d.siteUrl}/en/bookings` }
    ),
  };
}

export function clientBookingCancelled(d: BookingEmailData) {
  return {
    subject: `Cancelled — ${d.dateLabel}`,
    html: shell(
      'Appointment cancelled',
      'Booking cancelled',
      paragraph(`Hi ${escape(d.clientName)}, your ${escape(d.dateLabel)} appointment has been cancelled.`) +
        detailsTable(d) +
        paragraph(`Book again any time — it only takes a minute.`),
      { label: 'Book again', url: `${d.siteUrl}/en/book` }
    ),
  };
}

export function clientTierChanged(
  d: BookingEmailData,
  change: { fromVariant: string; toVariant: string; oldPrice: number; newPrice: number; note: string }
) {
  return {
    subject: `A quick update on your ${d.dateLabel} booking`,
    html: shell(
      'Design updated',
      'Price adjustment',
      paragraph(
        `Hi ${escape(d.clientName)}, after looking at your reference photos Mariam reclassified the design from <strong>${escape(
          change.fromVariant
        )}</strong> to <strong>${escape(change.toVariant)}</strong>.`
      ) +
        (change.note ? paragraph(`<em>${escape(change.note)}</em>`) : '') +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid ${BORDER};font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${SUB};">Was</td>
            <td align="right" style="padding:14px 0;border-bottom:1px solid ${BORDER};font-family:Arial,sans-serif;font-size:14px;color:${SUB};text-decoration:line-through;">${change.oldPrice} EGP</td>
          </tr>
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid ${BORDER};font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${SUB};">New total</td>
            <td align="right" style="padding:14px 0;border-bottom:1px solid ${BORDER};font-family:Georgia,serif;font-size:19px;color:${DEEP};">${change.newPrice} EGP</td>
          </tr>
        </table>` +
        detailsTable(d) +
        paragraph(`Your time slot hasn't changed. If this doesn't work for you, just cancel from your bookings page.`),
      { label: 'View my bookings', url: `${d.siteUrl}/en/bookings` }
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Owner-facing (Mariam)                                               */
/* ------------------------------------------------------------------ */

export function ownerNewBooking(d: BookingEmailData & { clientEmail: string; inspoCount: number }) {
  return {
    subject: `New request — ${d.clientName}, ${d.dateLabel}`,
    html: shell(
      'New booking request',
      'Action needed',
      paragraph(`<strong>${escape(d.clientName)}</strong> (${escape(d.clientEmail)}) requested an appointment.`) +
        detailsTable(d) +
        (d.inspoCount > 0
          ? paragraph(`${d.inspoCount} inspiration photo${d.inspoCount === 1 ? '' : 's'} attached to the booking.`)
          : '') +
        (d.notes ? paragraph(`<strong>Client notes:</strong><br>${escape(d.notes)}`) : ''),
      { label: 'Review in admin', url: `${d.siteUrl}/en/admin/bookings` }
    ),
  };
}

export function ownerBookingCancelled(d: BookingEmailData & { clientEmail: string }) {
  return {
    subject: `Cancelled — ${d.clientName}, ${d.dateLabel}`,
    html: shell(
      'A client cancelled',
      'Slot freed up',
      paragraph(`<strong>${escape(d.clientName)}</strong> (${escape(d.clientEmail)}) cancelled their appointment.`) +
        detailsTable(d) +
        paragraph(`That time is open again on the calendar.`),
      { label: 'Open calendar', url: `${d.siteUrl}/en/admin/calendar` }
    ),
  };
}

export function ownerBookingRescheduled(d: BookingEmailData & { clientEmail: string }) {
  return {
    subject: `Rescheduled — ${d.clientName}, now ${d.dateLabel}`,
    html: shell(
      'A client rescheduled',
      'New time booked',
      paragraph(`<strong>${escape(d.clientName)}</strong> (${escape(d.clientEmail)}) moved their appointment.`) +
        detailsTable(d),
      { label: 'Open calendar', url: `${d.siteUrl}/en/admin/calendar` }
    ),
  };
}
