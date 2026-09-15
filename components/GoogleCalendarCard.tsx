'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { disconnectGoogleCalendar, resyncGoogleCalendar } from '@/lib/supabase/actions';
import styles from './GoogleCalendarCard.module.css';

interface Status {
  configured: boolean;
  serviceRole: boolean;
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
}

const RESULT_MESSAGES: Record<string, { tone: 'ok' | 'bad'; text: string }> = {
  connected: { tone: 'ok', text: 'Connected. New and changed bookings will appear in your calendar.' },
  denied: { tone: 'bad', text: 'Google access was not granted.' },
  expired: { tone: 'bad', text: 'That sign-in took too long. Please try again.' },
  failed: { tone: 'bad', text: 'Could not connect to Google. Please try again.' },
  'no-refresh-token': {
    tone: 'bad',
    text: 'Google did not grant ongoing access. Remove The Gel Bar at myaccount.google.com/permissions, then connect again.',
  },
  'not-configured': { tone: 'bad', text: 'Google Calendar is not set up on the server yet.' },
};

export default function GoogleCalendarCard({ status }: { status: Status }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  // Show the outcome of the Google round trip once, then tidy the URL.
  useEffect(() => {
    const result = params.get('google');
    if (!result) return;
    setMessage(RESULT_MESSAGES[result] ?? null);
    router.replace(window.location.pathname, { scroll: false });
    if (result === 'connected') {
      startTransition(async () => {
        try {
          const { synced } = await resyncGoogleCalendar();
          if (synced > 0) setMessage({ tone: 'ok', text: `Connected, and ${synced} upcoming booking(s) added to your calendar.` });
        } catch {
          /* the connection itself worked; syncing retries on the next booking change */
        }
      });
    }
  }, [params, router]);

  const ready = status.configured && status.serviceRole;

  return (
    <section className={styles.card}>
      <div className={styles.icon} aria-hidden="true">
        <span>{new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo', day: 'numeric' })}</span>
      </div>

      <div className={styles.body}>
        <p className="eyebrow">Calendar sync</p>
        <h2 className={styles.title}>Google Calendar</h2>

        {!ready && (
          <p className={styles.text}>
            Not available yet. The server still needs:{' '}
            {[!status.configured && 'Google client keys', !status.serviceRole && 'the Supabase service key']
              .filter(Boolean)
              .join(' and ')}
            .
          </p>
        )}

        {ready && !status.connected && (
          <p className={styles.text}>
            Connect once and every booking lands in your calendar automatically — pending ones marked tentative. Add the same
            Google account to your iPhone to see them in Apple Calendar.
          </p>
        )}

        {ready && status.connected && (
          <p className={styles.text}>
            Connected{status.email ? <> as <strong>{status.email}</strong></> : null}. Bookings are added, moved and removed
            automatically.
          </p>
        )}

        {message && <p className={message.tone === 'ok' ? styles.ok : styles.bad}>{message.text}</p>}
      </div>

      {ready && (
        <div className={styles.actions}>
          {status.connected ? (
            <>
              <button
                className="btn btn-sm btn-ghost"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      const { synced } = await resyncGoogleCalendar();
                      setMessage({ tone: 'ok', text: `${synced} upcoming booking(s) synced.` });
                    } catch (e) {
                      setMessage({ tone: 'bad', text: e instanceof Error ? e.message : 'Sync failed.' });
                    }
                  })
                }
              >
                {pending ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                className="btn btn-sm btn-ghost"
                disabled={pending}
                onClick={() => {
                  if (!confirm('Disconnect Google Calendar? Existing events stay; new bookings stop syncing.')) return;
                  startTransition(async () => {
                    await disconnectGoogleCalendar();
                    setMessage(null);
                    router.refresh();
                  });
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            // A real navigation, not fetch: the OAuth flow is a chain of redirects.
            <a href="/api/google/connect" className="btn btn-sm btn-solid">
              Connect Google Calendar
            </a>
          )}
        </div>
      )}
    </section>
  );
}
