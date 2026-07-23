/**
 * Shared slug-published cache helper.
 *
 * Used by check-read-status and check-news-status. Same caching
 * strategy: 10s TTL, stale-on-fail for 5 minutes, fail closed on
 * first request with no cache.
 *
 * Edge-runtime safe.
 */

interface CacheEntry {
  slugs: Set<string>;
  expires: number;
  staleSince: number | null;
}

const TTL_MS = 10_000;
const STALE_GRACE_MS = 300_000;

/**
 * Generic slug-published check.
 *
 * `viewName` is the PostgREST view to query (e.g. "reads_public" or
 * "news_public"). The view is expected to expose a `slug` column.
 */
export function createSlugChecker(viewName: string) {
  let cache: CacheEntry | null = null;

  async function isPublished(slug: string): Promise<boolean> {
    const now = Date.now();

    if (cache && cache.expires > now) {
      return cache.slugs.has(slug);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return cache?.slugs.has(slug) ?? false;
    }

    try {
      const resp = await fetch(
        `${url}/rest/v1/${viewName}?select=slug`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
        },
      );
      if (!resp.ok) {
        return handleRefreshFailure(slug, now, () => cache);
      }

      const data = (await resp.json()) as Array<{ slug: string }>;
      cache = {
        slugs: new Set(data.map((r) => r.slug)),
        expires: now + TTL_MS,
        staleSince: null,
      };
      return cache.slugs.has(slug);
    } catch {
      return handleRefreshFailure(slug, now, () => cache);
    }
  }

  return isPublished;
}

function handleRefreshFailure(
  slug: string,
  now: number,
  getCache: () => CacheEntry | null,
): boolean {
  const c = getCache();
  if (!c) return false;
  if (c.staleSince === null) {
    c.staleSince = now;
    c.expires = now + STALE_GRACE_MS;
    return c.slugs.has(slug);
  }
  if (now - c.staleSince >= STALE_GRACE_MS) return false;
  return c.slugs.has(slug);
}