import AdminShell from '@/components/AdminShell';
import AdminCalendarClient from '@/components/AdminCalendarClient';

export default function AdminCalendarPage() {
  return (
    <AdminShell>
      <h1 style={{ fontSize: '1.3rem', color: 'var(--deep)', marginBottom: '.3rem' }}>Calendar</h1>
      <p className="sans" style={{ fontSize: '.75rem', color: 'var(--sub)', marginBottom: '1.25rem' }}>
        Tap a day to manage its open slots. Synced with Google Calendar — she sees it in Apple Calendar via a subscribed Google account.
      </p>
      <AdminCalendarClient />
    </AdminShell>
  );
}
