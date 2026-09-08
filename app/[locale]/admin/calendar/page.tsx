import AdminShell from '@/components/AdminShell';
import AdminCalendarClient from '@/components/AdminCalendarClient';

export default async function AdminCalendarPage() {
  return (
    <AdminShell
      title="Calendar"
      subtitle="Set the hours you're free — clients only see start times that fit inside them."
    >
      <AdminCalendarClient />
    </AdminShell>
  );
}
