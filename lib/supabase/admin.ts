import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses row-level security entirely.
 *
 * Only for work that has no signed-in user behind it, or that must read
 * data the current user is not allowed to see:
 *   - the daily reminder job (runs from Vercel Cron, no session at all)
 *   - Google Calendar sync triggered by a *client's* reschedule/cancel,
 *     which needs the owner's stored Google token
 *
 * Server-only. The key must never reach the browser: it is read from a
 * non-NEXT_PUBLIC env var, so Next will not inline it into client bundles,
 * and the guard below fails loudly if this is ever imported client-side.
 *
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is not configured, so every
 * caller can degrade quietly instead of crashing a request.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient() must never run in the browser');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
