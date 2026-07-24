/**
 * Demos — read queries.
 *
 * All queries use the SERVER supabase client (RLS-enforced). An artist
 * can read their own demos; admins can read all for their branch.
 */

import { createServerSupabase } from "@/lib/supabase/clients";
import type { DemoRow, DemoStatus, DemoWithRoster } from "./types";

const SELECT_BASE = `
  id, artist_roster_id, title, description,
  file_path, file_mime, file_size_bytes, file_duration_seconds,
  status, reviewed_by, reviewed_at, review_notes, release_id,
  created_by, created_at, last_modified_by, last_modified_at
`;

const SELECT_WITH_ROSTER = `
  ${SELECT_BASE},
  roster:artist_roster!demos_artist_roster_id_fkey (
    id, profile_id, branch_id, status,
    branch:branches!artist_roster_branch_id_fkey (id, slug, name),
    profile:profiles!artist_roster_profile_id_fkey (id, full_name)
  )
`;

/** List demos for a single roster row (artist's own view). */
export async function listDemosForRoster(
  rosterId: string,
  options?: { status?: DemoStatus | "any" },
): Promise<DemoRow[]> {
  const supabase = await createServerSupabase();
  let q = supabase
    .from("demos")
    .select(SELECT_BASE)
    .eq("artist_roster_id", rosterId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (options?.status && options.status !== "any") {
    q = q.eq("status", options.status);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[/demos.listDemosForRoster]", error.message);
    return [];
  }
  return (data ?? []) as DemoRow[];
}

/** List demos for a branch (admin view). */
export async function listDemosForBranch(
  branchId: string,
  options?: { status?: DemoStatus | "any" },
): Promise<DemoWithRoster[]> {
  const supabase = await createServerSupabase();
  const { data: rosterIds, error: rosterErr } = await supabase
    .from("artist_roster")
    .select("id")
    .eq("branch_id", branchId);
  if (rosterErr) {
    console.error("[/demos.listDemosForBranch roster]", rosterErr.message);
    return [];
  }
  const ids = (rosterIds ?? []).map((r) => r.id);
  if (ids.length === 0) return [];

  let q = supabase
    .from("demos")
    .select(SELECT_WITH_ROSTER)
    .in("artist_roster_id", ids)
    .order("created_at", { ascending: false })
    .limit(200);
  if (options?.status && options.status !== "any") {
    q = q.eq("status", options.status);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[/demos.listDemosForBranch]", error.message);
    return [];
  }
  return (data ?? []) as unknown as DemoWithRoster[];
}

/** Get a single demo by id. */
export async function getDemo(id: string): Promise<DemoWithRoster | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("demos")
    .select(SELECT_WITH_ROSTER)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[/demos.getDemo]", error.message);
    return null;
  }
  return (data ?? null) as DemoWithRoster | null;
}

/** Count demos per branch by status — for the admin pipeline view. */
export async function getDemoStatsByBranch(): Promise<
  Array<{
    branch_id: string;
    branch_slug: string;
    draft: number;
    pending_review: number;
    approved: number;
    rejected: number;
    promoted: number;
  }>
> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("demos")
    .select(`
      status,
      roster:artist_roster!demos_artist_roster_id_fkey (
        branch_id,
        branch:branches!artist_roster_branch_id_fkey (slug)
      )
    `)
    .limit(1000);
  if (error) {
    console.error("[/demos.getDemoStatsByBranch]", error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as Array<{
    status: DemoStatus;
    roster: {
      branch_id: string;
      branch: { slug: string } | { slug: string }[] | null;
    };
  }>;
  const acc = new Map<string, { branch_slug: string; draft: number; pending_review: number; approved: number; rejected: number; promoted: number }>();
  for (const r of rows) {
    const slug = Array.isArray(r.roster.branch) ? r.roster.branch[0]?.slug ?? "unknown" : r.roster.branch?.slug ?? "unknown";
    const existing = acc.get(r.roster.branch_id) ?? {
      branch_slug: slug,
      draft: 0,
      pending_review: 0,
      approved: 0,
      rejected: 0,
      promoted: 0,
    };
    existing[r.status] += 1;
    acc.set(r.roster.branch_id, existing);
  }
  return Array.from(acc.entries()).map(([branch_id, v]) => ({ branch_id, ...v }));
}
