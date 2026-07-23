/**
 * Simple in-process rate limiter.
 *
 * Per-process Map keyed by an identifier (typically IP address).
 * Each entry tracks the timestamps of the last N attempts in a sliding
 * window. When the window fills, requests are blocked until older
 * timestamps fall out of the window.
 *
 * Caveats:
 *   - In serverless deployments (Vercel) each instance has its own Map,
 *     so the limit is "per warm instance" not "per IP". This is a
 *     defence-in-depth — Supabase's built-in auth rate limiting is
 *     the primary line of defence.
 *   - For a true global rate limit, swap the Map for Vercel KV /
 *     Upstash Redis via @upstash/ratelimit.
 *
 * Use cases:
 *   - Brute-force protection on /login
 *   - Email enumeration on /reset-password
 *   - Spam on /contact
 */

interface Entry {
  timestamps: number[];
}

const store = new Map<string, Entry>();

/**
 * Check whether a request from the given identifier is allowed.
 * Returns { allowed: true, remaining: N } on pass, { allowed: false, retryAfter: ms }
 * on rate-limit.
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): { allowed: true; remaining: number } | { allowed: false; retryAfter: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Drop timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfter = Math.max(0, oldestInWindow + windowMs - now);
    return { allowed: false, retryAfter };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: limit - entry.timestamps.length };
}

/**
 * Extract a client identifier from a request. Falls back to a generic
 * "unknown" key if neither IP nor forwarded IP is present.
 */
export function clientIpFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

/**
 * Convenience: read IP from a form's hidden field set by middleware.
 * Falls back to "form" if the IP wasn't propagated.
 */
export function formClientIp(formData: FormData): string {
  return String(formData.get("_client_ip") ?? "form");
}
