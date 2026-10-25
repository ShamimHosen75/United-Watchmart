/**
 * Sliding-window rate limit: 5 enquiries per hour per IP.
 * In memory, so each server instance counts separately and counts reset on cold start.
 * Swap for Upstash Redis (or similar) if stricter limits are needed on Vercel.
 */

const WINDOW_MS = 60 * 60 * 1000;
export const ENQUIRY_LIMIT = 5;
const MAX_KEYS = 5000;

const hits = new Map<string, number[]>();

/** Records an attempt and returns false when the key is over the limit. */
export function takeToken(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= ENQUIRY_LIMIT) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);

  // Keep memory bounded: drop the oldest keys.
  if (hits.size > MAX_KEYS) {
    for (const k of hits.keys()) {
      hits.delete(k);
      if (hits.size <= MAX_KEYS) break;
    }
  }
  return true;
}
