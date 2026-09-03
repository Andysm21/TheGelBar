// Service/design data lives entirely in the `services` and
// `design_options` tables now (see supabase/schema.sql) — this file only
// holds pure loyalty math that has no DB row of its own.

/**
 * Loyalty rule (confirmed): 1 completed+paid session = 1 point. The 11th
 * session (i.e. the one taken while the client is sitting at exactly 10
 * points) is free and grants NO point. The point counter then resets —
 * the next session after the free one starts back at 1, not 11.
 */
export function isFreeLoyaltySession(currentPoints: number): boolean {
  return currentPoints === 10;
}

/** Points to store after a session is marked paid. */
export function nextLoyaltyPoints(currentPoints: number): number {
  return isFreeLoyaltySession(currentPoints) ? 0 : currentPoints + 1;
}
