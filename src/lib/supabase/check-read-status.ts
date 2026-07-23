/**
 * Check whether a slug corresponds to a published read.
 *
 * Edge-runtime safe — uses fetch() + REST, no Supabase SDK.
 *
 * Caching strategy (two-part fix from Phase 2 audit):
 *
 *   1. Short TTL (10s) — drafts become public within 10s of publish.
 *   2. Stale-on-fail — if PostgREST is unreachable, serve the last-
 *      known-good list for up to 5 minutes. After that, fail closed.
 *
 * Implementation lives in lib/supabase/slug-cache.ts.
 */

import { createSlugChecker } from "@/lib/supabase/slug-cache";

const isReadSlugPublishedCached = createSlugChecker("reads_public");

export function isReadSlugPublished(slug: string): Promise<boolean> {
  return isReadSlugPublishedCached(slug);
}