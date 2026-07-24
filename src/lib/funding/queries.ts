/**
 * Funding applications linked to a roster row (artist-level).
 *
 * Used by the admin roster page to show which funding has been awarded
 * to a specific artist on the roster.
 */

import { createServerSupabase } from "@/lib/supabase/clients";

export interface RosterFunding {
  id: string;
  funder_name: string;
  round: string | null;
  status: "planned" | "pending" | "awarded" | "declined";
  amount_requested_nzd: number | null;
  amount_awarded_nzd: number | null;
  submitted_date: string | null;
  decision_date: string | null;
  title: string | null;
}

export async function listFundingForRoster(
  rosterId: string,
): Promise<RosterFunding[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("funding_applications")
    .select(
      "id, funder_name, round, status, amount_requested_nzd, amount_awarded_nzd, submitted_date, decision_date, title",
    )
    .eq("artist_roster_id", rosterId)
    .order("decision_date", { ascending: false, nullsFirst: false })
    .order("submitted_date", { ascending: false, nullsFirst: false })
    .limit(20);
  if (error) {
    console.error("[/funding.listFundingForRoster]", error.message);
    return [];
  }
  return (data ?? []) as RosterFunding[];
}
