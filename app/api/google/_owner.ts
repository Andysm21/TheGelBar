import { createClient } from '@/lib/supabase/server';

/** The signed-in owner's Supabase client, or null for anyone else. */
export async function ownerSession() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    return profile?.role === 'owner' ? supabase : null;
  } catch {
    return null;
  }
}
