// In-memory sliding-window limiter. Lives only for the lifetime of one
// serverless instance — on Vercel that means it resets on cold starts and
// isn't shared across instances, so it's a speed bump against a single
// hammering client, not a hard guarantee. Good enough for a solo-salon
// site with no budget for Redis/Upstash; upgrade to a shared store if
// traffic ever justifies it.
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    const retryAfterSeconds = Math.ceil((windowMs - (now - hits[0])) / 1000);
    return { ok: false, retryAfterSeconds };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Cheap cleanup so the map doesn't grow forever across many distinct keys.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t > windowMs)) buckets.delete(k);
    }
  }

  return { ok: true, retryAfterSeconds: 0 };
}
