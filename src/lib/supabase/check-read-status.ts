/**
 * Check whether a slug corresponds to a published read.
 *
 * Edge-runtime safe — uses fetch() + REST, no Supabase SDK.
 * Cached in-memory for 60s to avoid hammering PostgREST.
 */

interface CacheEntry {
  slugs: Set<string>;
  expires: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000;

export async function isReadSlugPublished(slug: string): Promise<boolean> {
  const now = Date.now();

  // Refresh cache if expired
  if (!cache || cache.expires < now) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      // Without env vars we can't check — fail open (treat as published)
      // rather than locking out legitimate URLs.
      return true;
    }

    try {
      const resp = await fetch(
        `${url}/rest/v1/reads_public?select=slug`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
          // Edge runtime cache hint
          next: { revalidate: 60 },
        },
      );
      if (!resp.ok) {
        // Don't block requests on PostgREST errors
        return true;
      }
      const data = (await resp.json()) as Array<{ slug: string }>;
      cache = {
        slugs: new Set(data.map((r) => r.slug)),
        expires: now + CACHE_TTL_MS,
      };
    } catch {
      return true;
    }
  }

  return cache.slugs.has(slug);
}
