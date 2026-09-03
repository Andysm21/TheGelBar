import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// A cookie-free client for data that's the same for everyone (service
// catalog, design options, the loyalty on/off flag) and safe to cache
// across requests with unstable_cache. Building the usual SSR client
// pulls in cookies() via next/headers, and unstable_cache forbids
// calling dynamic APIs like cookies() inside its cached function — this
// sidesteps that entirely instead of fighting it.
export function createPublicClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
