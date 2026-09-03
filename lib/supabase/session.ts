import { createClient } from './server';

/** Current signed-in user + their profile row, or null if not signed in. */
export async function getSessionProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, role, loyalty_points, admin_private_notes')
    .eq('id', user.id)
    .single();

  return profile ? { user, profile } : null;
}
