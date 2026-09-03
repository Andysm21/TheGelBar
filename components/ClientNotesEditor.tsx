'use client';

import { useState, useTransition } from 'react';
import { updateClientNotes } from '@/lib/supabase/actions';

export default function ClientNotesEditor({ clientId, initialNotes }: { clientId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setSaved(false);
    startTransition(async () => {
      await updateClientNotes(clientId, notes);
      setSaved(true);
    });
  }

  return (
    <div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', minHeight: 80, marginBottom: '.6rem' }} />
      <button className="btn btn-ghost btn-sm" disabled={pending} onClick={save}>
        {pending ? 'Saving…' : saved ? 'Saved ✓' : 'Save notes'}
      </button>
    </div>
  );
}
