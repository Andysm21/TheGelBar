/**
 * Session expiry policy.
 *
 * Supabase refreshes its JWT indefinitely, so a signed-in browser stays
 * signed in forever unless something forces it out. Two limits do that:
 *
 *  - IDLE: no request from this browser for a while → signed out.
 *  - ABSOLUTE: signed in longer than this → signed out regardless of
 *    activity, so a permanently-open tab can't hold a session open.
 *
 * Enforced in middleware (authoritative, covers page loads and Server
 * Action posts) and mirrored in the browser by SessionTimeout, which
 * only exists so an idle tab reacts without waiting for a click.
 */

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours

/** Cookie holding the epoch-ms of this browser's last request. */
export const LAST_SEEN_COOKIE = 'gb_last_seen';

/** Query flag added to the login URL after a forced sign-out. */
export const TIMEOUT_PARAM = 'timeout';

export function isIdleExpired(lastSeenMs: number, now = Date.now()) {
  // No cookie yet (first request of a session) is not an expiry.
  if (!lastSeenMs) return false;
  return now - lastSeenMs > IDLE_TIMEOUT_MS;
}

export function isAbsoluteExpired(signedInAtMs: number, now = Date.now()) {
  if (!signedInAtMs) return false;
  return now - signedInAtMs > ABSOLUTE_TIMEOUT_MS;
}
