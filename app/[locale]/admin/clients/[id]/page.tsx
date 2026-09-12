import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import ClientNotesEditor from '@/components/ClientNotesEditor';
import { getClientProfile, getClientBookings } from '@/lib/supabase/cached-queries';
import styles from './client-detail.module.css';

export default async function AdminClientDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  const client = await getClientProfile(id);
  if (!client) notFound();

  const bookings = await getClientBookings(id);
  const done = bookings.filter((b: any) => b.status === 'done');
  const upcoming = bookings.filter((b: any) => ['pending', 'confirmed', 'needs_reschedule'].includes(b.status));
  // What she actually collected, not what was quoted.
  const spent = done.reduce((sum: number, b: any) => sum + (b.amount_paid_egp ?? b.total_price_egp), 0);

  return (
    <AdminShell
      title={client.name ?? 'Client'}
      subtitle={client.email ?? ''}
      actions={
        <Link href={`/${locale}/admin/clients`} className="btn btn-ghost btn-sm">
          ← All clients
        </Link>
      }
    >
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Visits</span>
          <span className={styles.statValue}>{done.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Upcoming</span>
          <span className={styles.statValue}>{upcoming.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total spent</span>
          <span className={styles.statValue}>{spent.toLocaleString()}</span>
          <span className={styles.statMeta}>EGP</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Loyalty</span>
          <span className={styles.statValue}>{client.loyalty_points}</span>
          <span className={styles.statMeta}>points</span>
        </div>
      </div>

      <div className={styles.layout}>
        <section className={styles.card}>
          <p className="eyebrow">Private notes</p>
          <h2 className={styles.cardTitle}>Only you can see this</h2>
          <p className={styles.hint}>
            Allergies, preferred shapes, what worked last time — anything worth remembering. Never shown to the client.
          </p>
          <ClientNotesEditor clientId={client.id} initialNotes={client.admin_private_notes ?? ''} />
        </section>

        <section className={styles.card}>
          <p className="eyebrow">History</p>
          <h2 className={styles.cardTitle}>Appointments</h2>
          {bookings.length === 0 ? (
            <p className={styles.hint}>No bookings yet.</p>
          ) : (
            <ul className={styles.history}>
              {bookings.map((b: any) => (
                <li key={b.id}>
                  <Link href={`/${locale}/admin/bookings/${b.id}`} className={styles.historyRow}>
                    <span className={styles.hDate}>
                      {new Date(b.scheduled_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                    <span className={styles.hMain}>
                      <span className={styles.hService}>
                        {b.services?.name_en} — {b.service_variants?.name_en}
                        {(b.variant_quantity ?? 1) > 1 ? ` ×${b.variant_quantity}` : ''}
                      </span>
                      <span className={`badge badge-${b.status === 'done' ? 'done' : b.status === 'pending' ? 'pending' : 'confirmed'}`}>
                        {b.status}
                      </span>
                    </span>
                    <span className={styles.hPrice}>{b.amount_paid_egp ?? b.total_price_egp} EGP</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
