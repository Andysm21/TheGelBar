import { createClient } from './server';

/**
 * Current signed-in user + their profile row, or null if not signed in.
 * Wrapped in try/catch on purpose: a malformed/stale auth cookie (seen
 * on mobile Safari, which chunks/truncates large cookies differently
 * than desktop browsers) can make the Supabase client throw instead of
 * just returning no user — treating that as "not signed in" and
 * redirecting to login is far better than a 500 page.
 */
export async function getSessionProfile() {
  try {
    const supabase = await createClient();
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
  } catch {
    return null;
  }
}
