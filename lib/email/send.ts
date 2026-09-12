import nodemailer from 'nodemailer';

/**
 * Email delivery.
 *
 * Primary path is Gmail SMTP, because the studio wants mail to come FROM
 * (and land in) thegelbar.eg@gmail.com — an API service like Resend can
 * only send from a domain you own and verify, never from a gmail.com
 * address, so SMTP is the only way to satisfy that.
 *
 * Requires a Google **App Password** (not the account password):
 *   GMAIL_USER=thegelbar.eg@gmail.com
 *   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
 *
 * Deliberately fail-soft: with no credentials configured this logs and
 * returns instead of throwing, so an email problem can never break a
 * booking.
 */

export interface SendArgs {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

type Transporter = ReturnType<typeof nodemailer.createTransport>;

let transporter: Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return transporter;
}

export function ownerAddress() {
  return process.env.GMAIL_USER || 'thegelbar.eg@gmail.com';
}

export async function sendEmail({ to, subject, html, replyTo }: SendArgs): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!to) {
    console.warn(`[email] no recipient for "${subject}"`);
    return { ok: false, skipped: true };
  }

  const tx = getTransporter();
  if (!tx) {
    console.warn(`[email] GMAIL_USER / GMAIL_APP_PASSWORD not set — skipped "${subject}" to ${to}`);
    return { ok: false, skipped: true };
  }

  const from = `The Gel Bar <${ownerAddress()}>`;

  try {
    await tx.sendMail({ from, to, subject, html, replyTo });
    return { ok: true };
  } catch (err) {
    console.error(`[email] send failed for "${subject}" → ${to}`, err);
    return { ok: false };
  }
}

/** Fire several emails without letting one failure block the others. */
export async function sendAll(messages: SendArgs[]) {
  await Promise.allSettled(messages.map(sendEmail));
}

export function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://thegelbareg.vercel.app')
  );
}
