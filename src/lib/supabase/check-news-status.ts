/**
 * Check whether a slug corresponds to a published news entry.
 *
 * Same caching strategy as check-read-status.ts — 10s TTL, stale-on-fail.
 */

import { createSlugChecker } from "@/lib/supabase/slug-cache";

const isNewsSlugPublishedCached = createSlugChecker("news_public");

export function isNewsSlugPublished(slug: string): Promise<boolean> {
  return isNewsSlugPublishedCached(slug);
}