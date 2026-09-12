import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { getAllBookingsForOwner } from '@/lib/supabase/cached-queries';
import styles from './bookings.module.css';

const GROUPS = [
  { key: 'pending', label: 'Awaiting your reply' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'needs_reschedule', label: 'Needs reschedule' },
  { key: 'done', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'declined', label: 'Declined' },
] as const;

export default async function AdminBookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const bookings = await getAllBookingsForOwner();

  const byStatus = new Map<string, any[]>();
  for (const b of bookings) {
    const list = byStatus.get(b.status) ?? [];
    list.push(b);
    byStatus.set(b.status, list);
  }

  const pendingCount = (byStatus.get('pending') ?? []).length;

  return (
    <AdminShell
      title="Bookings"
      subtitle={`${bookings.length} total · ${pendingCount} awaiting your reply`}
    >
      {bookings.length === 0 && (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No bookings yet</h2>
          <p className={styles.emptyText}>
            Once you set free hours in the calendar, client requests will land here.
          </p>
          <Link href={`/${locale}/admin/calendar`} className="btn btn-solid">
            Set my hours
          </Link>
        </div>
      )}

      {GROUPS.map((group) => {
        const list = byStatus.get(group.key) ?? [];
        if (list.length === 0) return null;
        return (
          <section key={group.key} className={styles.group}>
            <header className={styles.groupHead}>
              <p className="eyebrow">{group.label}</p>
              <span className={styles.count}>{list.length}</span>
            </header>

            <ul className={styles.list}>
              {list.map((b: any) => (
                <li key={b.id}>
                  <Link href={`/${locale}/admin/bookings/${b.id}`} className={styles.row}>
                    <span className={styles.when}>
                      <strong>
                        {new Date(b.scheduled_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </strong>
                      {new Date(b.scheduled_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <span className={styles.main}>
                      <span className={styles.name}>{b.profiles?.name ?? 'Client'}</span>
                      <span className={styles.meta}>
                        {b.services?.name_en} · {b.service_variants?.name_en}
                        {(b.variant_quantity ?? 1) > 1 ? ` ×${b.variant_quantity}` : ''}
                        {(b.booking_addons ?? []).length > 0 &&
                          ` · +${(b.booking_addons ?? []).length} add-on${b.booking_addons.length === 1 ? '' : 's'}`}
                      </span>
                    </span>

                    <span className={styles.tags}>
                      {(b.booking_images ?? []).length > 0 && (
                        <span className={styles.photoTag}>{b.booking_images.length} 📷</span>
                      )}
                      {b.tier_changed_at && <span className={styles.changedTag}>price updated</span>}
                    </span>

                    <span className={styles.price}>{b.total_price_egp} EGP</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </AdminShell>
  );
}
