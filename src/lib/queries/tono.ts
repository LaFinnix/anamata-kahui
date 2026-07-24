/**
 * Tono queries — visibility-aware listings.
 *
 * The tono RLS policy (migration 0027) does coarse gating; the application
 * layer must filter further for `iwi_specific` tono (only users with the
 * iwi in their attested set should see them) and the inbox filter (only
 * tono matching the user's knowledge areas + iwi affiliations).
 *
 * Why application-side: Postgres RLS can't easily express "the row's
 * scope_iwi overlaps with the calling user's profile.iwi_affiliation_attested"
 * because the policy USING clause evaluates per-row but the profile lookup
 * is a per-statement lookup. The unnest() trick in the RLS handles SOME of
 * this, but for complex visibility logic the application layer is clearer.
 */

import { createServerSupabase } from "@/lib/supabase/clients";
import type { TonoRow, TonoStatus } from "@/lib/tono/types";
import type { KnowledgeDomain } from "@/lib/kaikorero/types";

/**
 * Load the current user's attested iwi list. Used by the visibility filter.
 */
async function getMyAttestedIwi(supabase: Awaited<ReturnType<typeof createServerSupabase>>): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("iwi_affiliation_attested")
    .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .maybeSingle();

  if (error || !data) return [];
  return (data.iwi_affiliation_attested as string[] | null) ?? [];
}

/**
 * Apply the per-user iwi_specific visibility filter to a tono list.
 * Returns the subset of tonos the current user is allowed to see.
 */
async function filterByIwiVisibility<
  T extends Pick<TonoRow, "id" | "visibility" | "scope_iwi">,
>(supabase: Awaited<ReturnType<typeof createServerSupabase>>, tonos: T[]): Promise<T[]> {
  const myIwi = await getMyAttestedIwi(supabase);
  const myIwiSet = new Set(myIwi.map((i) => i.toLowerCase()));

  return tonos.filter((t) => {
    if (t.visibility === "open") return true;
    if (t.visibility === "invited") return false; // inbox shows open/iwi_specific; invited is by-token
    if (t.visibility === "iwi_specific") {
      if (!t.scope_iwi) return false;
      return myIwiSet.has(t.scope_iwi.toLowerCase());
    }
    return false;
  });
}

/* -------------------------------------------------------------------------- */
/* My tonos — dashboard board view                                             */
/* -------------------------------------------------------------------------- */

export async function listMyTonos(userId: string): Promise<TonoRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("tono")
    .select("*")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("listMyTonos:", error.message);
    return [];
  }
  return (data ?? []) as TonoRow[];
}

/* -------------------------------------------------------------------------- */
/* Open tonos I can help on — inbox view                                      */
/* -------------------------------------------------------------------------- */

/**
 * List open tono (status='open') that the current user is allowed to see AND
 * could plausibly help on. Filters:
 *   - visibility open or iwi_specific (with attested match)
 *   - excludes tonos the user created themselves
 *   - excludes tono where the user already has a pending proposal (UI
 *     would show "your proposal is pending" anyway, but filtering here
 *     keeps the inbox cleaner)
 *   - optional knowledge_domain filter (v1.1: server-side via URL search param)
 *
 * Returns tonos joined with creator profile so the UI can show who asked.
 */
export async function listOpenTonosICanHelp(opts?: {
  knowledgeDomain?: KnowledgeDomain | null;
}): Promise<
  { tono: TonoRow; creator: { id: string; full_name: string | null; iwi_affiliation_attested: string[] | null } | null; has_proposed: boolean }[]
> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  type TonoWithCreator = TonoRow & {
    creator: { id: string; full_name: string | null; iwi_affiliation_attested: string[] | null } | null;
  };

  // Fetch a candidate set: open tono (RLS will block iwi_specific ones the
  // user shouldn't see, so this is safe — we just won't see them).
  let query = supabase
    .from("tono")
    .select(`
      *,
      creator:creator_id ( id, full_name, iwi_affiliation_attested )
    `)
    .eq("status", "open")
    .neq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (opts?.knowledgeDomain) {
    query = query.eq("knowledge_domain", opts.knowledgeDomain);
  }

  const { data: tonos, error } = await query;
  if (error || !tonos) {
    console.error("listOpenTonosICanHelp:", error?.message);
    return [];
  }

  // Apply the iwi_specific filter the RLS doesn't fully enforce
  const typedTonos = tonos as unknown as TonoWithCreator[];
  const filtered = await filterByIwiVisibility(supabase, typedTonos);

  // Find which of these the user has already proposed on (to mark them)
  const tonoIds = filtered.map((t) => t.id);
  let proposedIds = new Set<string>();
  if (tonoIds.length > 0) {
    const { data: existing } = await supabase
      .from("tono_proposals")
      .select("tono_id")
      .eq("proposer_id", user.id)
      .in("tono_id", tonoIds);
    proposedIds = new Set((existing ?? []).map((r) => r.tono_id));
  }

  return filtered.map((t) => ({
    tono: t,
    creator: t.creator ?? null,
    has_proposed: proposedIds.has(t.id),
  }));
}

/* -------------------------------------------------------------------------- */
/* Proposals for a tono (creator view + proposer view)                         */
/* -------------------------------------------------------------------------- */

export async function listProposalsForTono(tonoId: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("tono_proposals")
    .select(`
      *,
      proposer:proposer_id ( id, full_name, role, iwi_affiliation_attested, contribution_count )
    `)
    .eq("tono_id", tonoId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listProposalsForTono:", error.message);
    return [];
  }
  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* One tono with the caller's role for the view                                */
/* -------------------------------------------------------------------------- */

export async function getTonoForViewer(
  tonoId: string,
): Promise<{ tono: TonoRow | null; isCreator: boolean }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { tono: null, isCreator: false };

  const { data, error } = await supabase
    .from("tono")
    .select("*")
    .eq("id", tonoId)
    .maybeSingle();
  if (error || !data) return { tono: null, isCreator: false };

  return { tono: data as TonoRow, isCreator: data.creator_id === user.id };
}

/* -------------------------------------------------------------------------- */
/* Count helpers for the board / inbox                                        */
/* -------------------------------------------------------------------------- */

export async function countTonosByStatus(
  userId: string,
): Promise<Record<TonoStatus, number>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("tono")
    .select("status")
    .eq("creator_id", userId);
  if (error || !data) {
    return {
      open: 0,
      in_conversation: 0,
      fulfilled: 0,
      closed: 0,
      withdrawn: 0,
    };
  }
  const counts: Record<TonoStatus, number> = {
    open: 0,
    in_conversation: 0,
    fulfilled: 0,
    closed: 0,
    withdrawn: 0,
  };
  for (const row of data) {
    const s = row.status as TonoStatus;
    if (s in counts) counts[s]++;
  }
  return counts;
}
