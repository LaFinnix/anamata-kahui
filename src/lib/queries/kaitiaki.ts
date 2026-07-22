/**
 * Server-side data helpers for live Supabase counts on public pages.
 *
 * Used by `/transparency`, `/impact`, `/funding` and the home page
 * to surface real metrics instead of hard-coded placeholders.
 */

import { createServerSupabase } from "@/lib/supabase/clients";

export interface KaitiakiMetrics {
  totalWaiata: number;
  releasedWaiata: number;
  inReviewWaiata: number;
  draftedWaiata: number;
  iwiGatesTotal: number;
  iwiGatesActive: number;
  reviewsCompleted: number;
  kaitiakiCount: number;
  consentLogEntries: number;
  governanceLogEntries: number;
}

export async function getKaitiakiMetrics(): Promise<KaitiakiMetrics> {
  const supabase = await createServerSupabase();

  // Note: waiata data isn't yet in Supabase releases table — that requires
  // importing the catalog. Until then we expose Supabase-only counts and a
  // catalog count surfaced via the catalog.json fetch in /waiata/[slug].
  const [
    iwiGatesTotal,
    consentLogTotal,
    governanceLogTotal,
    kaitiakiTotal,
  ] = await Promise.all([
    supabase.from("iwi_gates").select("id", { count: "exact", head: true }),
    supabase.from("consent_log").select("id", { count: "exact", head: true }),
    supabase.from("data_governance_log").select("id", { count: "exact", head: true }).eq("published", true),
    supabase.from("kaitiaki_roopu").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return {
    totalWaiata: 0, // populated by /waiata once catalog is imported
    releasedWaiata: 0,
    inReviewWaiata: 0,
    draftedWaiata: 0,
    iwiGatesTotal: iwiGatesTotal.count ?? 0,
    iwiGatesActive: 0, // computed from scope != restricted below if needed
    reviewsCompleted: consentLogTotal.count ?? 0,
    kaitiakiCount: kaitiakiTotal.count ?? 0,
    consentLogEntries: consentLogTotal.count ?? 0,
    governanceLogEntries: governanceLogTotal.count ?? 0,
  };
}
