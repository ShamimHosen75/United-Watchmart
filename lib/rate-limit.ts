/**
 * In-memory sliding-window rate limits. Each server instance counts separately and counts reset
 * on cold start; swap for Upstash Redis (or similar) if stricter limits are needed on Vercel.
 */

const MAX_KEYS = 5000;

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  /** Records an attempt and returns false when the key is over the limit. */
  return function take(key: string, now = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > MAX_KEYS) {
      for (const k of hits.keys()) {
        hits.delete(k);
        if (hits.size <= MAX_KEYS) break;
      }
    }
    return true;
  };
}

const HOUR = 60 * 60 * 1000;

/** Viewing requests: 5 per hour per IP. */
export const enquiryLimiter = createRateLimiter({ limit: 5, windowMs: HOUR });
/** Checkouts started (each holds stock): 20 per hour per IP. */
export const checkoutLimiter = createRateLimiter({ limit: 20, windowMs: HOUR });
/** Admin sign-in attempts: 5 per 15 minutes per IP. */
export const loginLimiter = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });

/** Best-effort client IP from proxy headers. */
export function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
