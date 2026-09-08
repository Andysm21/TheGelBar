/**
 * Resend delivery. Deliberately fail-soft: if RESEND_API_KEY isn't set
 * (local dev, or before the domain is verified) this logs and returns
 * instead of throwing — an email problem must never break a booking.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface SendArgs {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendArgs): Promise<{ ok: boolean; skipped?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'The Gel Bar <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}" to ${to}`);
    return { ok: false, skipped: true };
  }
  if (!to) {
    console.warn(`[email] no recipient for "${subject}"`);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });

    if (!res.ok) {
      console.error(`[email] Resend rejected "${subject}" (${res.status}): ${await res.text()}`);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[email] send failed for "${subject}"`, err);
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
