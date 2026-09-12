import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { getAllClients } from '@/lib/supabase/cached-queries';
import styles from './clients.module.css';

export default async function AdminClientsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const clients = await getAllClients();

  return (
    <AdminShell title="Clients" subtitle={`${clients.length} ${clients.length === 1 ? 'client' : 'clients'}`}>
      {clients.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No clients yet</h2>
          <p className={styles.emptyText}>Anyone who books an appointment shows up here.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {clients.map((c: any) => (
            <li key={c.id}>
              <Link href={`/${locale}/admin/clients/${c.id}`} className={styles.row}>
                <span className={styles.avatar} aria-hidden="true">
                  {(c.name ?? c.email ?? '?').charAt(0).toUpperCase()}
                </span>
                <span className={styles.main}>
                  <span className={styles.name}>{c.name ?? 'Client'}</span>
                  <span className={styles.email}>{c.email}</span>
                </span>
                <span className={styles.side}>
                  {c.admin_private_notes ? <span className={styles.noteTag}>has notes</span> : null}
                  <span className={styles.points}>{c.loyalty_points} pts</span>
                </span>
                <span className={styles.chev} aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
