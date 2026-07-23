/**
 * Check whether a slug corresponds to a published read.
 *
 * Edge-runtime safe — uses fetch() + REST, no Supabase SDK.
 *
 * Caching strategy (two-part fix from Phase 2 audit):
 *
 *   1. **Short TTL (10s)** — drafts become public within 10s of publish,
 *      not 60s. Cost: one PostgREST query every 10s per edge worker.
 *      Trivial because reads_public is small (<200 rows) and indexed on slug.
 *
 *   2. **Stale-on-fail** — if the PostgREST refresh fails (network down,
 *      5xx, rate limit), reuse the last-known-good list. We do NOT fail-open
 *      because that would leak drafts during outages. We do NOT fail-closed
 *      immediately because that would lock out published reads.
 *      Instead: serve the cached list for up to STALE_GRACE_MS (5 minutes)
 *      after the first failure, then drop to fail-closed if PostgREST is
 *      still unreachable.
 *
 *   3. **No-cache-first-request** — first request has no cached list. If
 *      PostgREST fails, fail-closed (return false). Better to 404 a
 *      published read for 10s during an outage than to leak all drafts.
 */

interface CacheEntry {
  slugs: Set<string>;
  expires: number;
  staleSince: number | null;
}

let cache: CacheEntry | null = null;

const TTL_MS = 10_000;          // Refresh after this many seconds
const STALE_GRACE_MS = 300_000; // After 5 min of failed refreshes, fail closed

export async function isReadSlugPublished(slug: string): Promise<boolean> {
  const now = Date.now();

  // Cache present and fresh — answer from memory
  if (cache && cache.expires > now) {
    return cache.slugs.has(slug);
  }

  // Need to refresh. Try PostgREST.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No env vars: can't verify — fail closed (404 drafts), but only if no cache.
  // If we have a cache, serve it (better than locking out everything).
  if (!url || !key) {
    return cache?.slugs.has(slug) ?? false;
  }

  try {
    const resp = await fetch(
      `${url}/rest/v1/reads_public?select=slug`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );

    if (!resp.ok) {
      return handleRefreshFailure(slug, now);
    }

    const data = (await resp.json()) as Array<{ slug: string }>;
    cache = {
      slugs: new Set(data.map((r) => r.slug)),
      expires: now + TTL_MS,
      staleSince: null, // refresh succeeded — reset stale timer
    };
    return cache.slugs.has(slug);
  } catch {
    return handleRefreshFailure(slug, now);
  }
}

/**
 * Decide what to do when a refresh attempt fails.
 *
 * - No prior cache: fail closed (return false). Safer than leaking drafts.
 * - Stale within grace period: serve the cached list (last-known-good).
 * - Stale beyond grace period: fail closed.
 */
function handleRefreshFailure(slug: string, now: number): boolean {
  if (!cache) {
    // No cache at all — first-ever request, or cache evicted by the
    // runtime. Fail closed.
    return false;
  }

  // First failure: start the stale timer if not already running.
  if (cache.staleSince === null) {
    cache.staleSince = now;
    cache.expires = now + STALE_GRACE_MS;
    return cache.slugs.has(slug);
  }

  // Subsequent failures: check if we're still in the grace period.
  const staleAge = now - cache.staleSince;
  if (staleAge >= STALE_GRACE_MS) {
    // Past grace period — fail closed.
    return false;
  }

  // Still in grace period — serve the cached list.
  // Don't bump expires; the next call will re-check.
  return cache.slugs.has(slug);
}