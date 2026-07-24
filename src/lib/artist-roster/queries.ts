/**
 * Artist roster — read queries.
 *
 * All queries use the SERVER supabase client (RLS-enforced). An artist
 * can read their own rows; admins can read all rows; the public can
 * only read rows where on_roster_publicly AND opted_in_public are both
 * true AND status='active'.
 */

import { createServerSupabase } from "@/lib/supabase/clients";
import type {
  ArtistRosterEntry,
  RosterStatus,
} from "./types";

const SELECT_BASE = `
  id, profile_id, branch_id, status,
  on_roster_publicly, opted_in_public, role_summary,
  created_by, created_at, last_modified_by, last_modified_at,
  status_changed_by, status_changed_at, departed_at, departed_reason, internal_notes
`;

const SELECT_WITH_JOINS = `
  ${SELECT_BASE},
  profile:profiles!artist_roster_profile_id_fkey (id, full_name, iwi_affiliation_attested),
  branch:branches!artist_roster_branch_id_fkey (id, slug, name)
`;

/** List the roster for a single branch. Admin-only (RLS filters out
 *  non-public rows for non-admins). */
export async function listBranchRoster(
  branchId: string,
  options?: { status?: RosterStatus | "any" },
): Promise<ArtistRosterEntry[]> {
  const supabase = await createServerSupabase();
  let q = supabase
    .from("artist_roster")
    .select(SELECT_WITH_JOINS)
    .eq("branch_id", branchId)
    .order("status_changed_at", { ascending: false })
    .limit(100);
  if (options?.status && options.status !== "any") {
    q = q.eq("status", options.status);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[/artist-roster.listBranchRoster]", error.message);
    return [];
  }
  return (data ?? []) as unknown as ArtistRosterEntry[];
}

/** Get a single roster row by id (with joins for display). */
export async function getRosterEntry(
  id: string,
): Promise<ArtistRosterEntry | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("artist_roster")
    .select(SELECT_WITH_JOINS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[/artist-roster.getRosterEntry]", error.message);
    return null;
  }
  return (data ?? null) as ArtistRosterEntry | null;
}

/** Get the active roster row for a (profile, branch) pair. */
export async function getActiveRoster(
  profileId: string,
  branchId: string,
): Promise<ArtistRosterEntry | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("artist_roster")
    .select(SELECT_WITH_JOINS)
    .eq("profile_id", profileId)
    .eq("branch_id", branchId)
    .eq("status", "active")
    .maybeSingle();
  if (error) {
    console.error("[/artist-roster.getActiveRoster]", error.message);
    return null;
  }
  return (data ?? null) as ArtistRosterEntry | null;
}

/** Get all roster rows for a profile (across all branches). */
export async function getRosterForProfile(
  profileId: string,
): Promise<ArtistRosterEntry[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("artist_roster")
    .select(SELECT_WITH_JOINS)
    .eq("profile_id", profileId)
    .order("status_changed_at", { ascending: false });
  if (error) {
    console.error("[/artist-roster.getRosterForProfile]", error.message);
    return [];
  }
  return (data ?? []) as unknown as ArtistRosterEntry[];
}

/** Count of active roster members per branch — used for admin dashboard stats. */
export async function getRosterStatsByBranch(): Promise<
  Array<{ branch_id: string; branch_slug: string; active: number; prospect: number; paused: number; departed: number }>
> {
  const supabase = await createServerSupabase();
  // Pull all active status+branch_id rows + branch slug, group in JS
  // (small N; this isn't a hot path)
  const { data, error } = await supabase
    .from("artist_roster")
    .select("status, branch_id, branch:branches!artist_roster_branch_id_fkey (slug)")
    .limit(1000);
  if (error) {
    console.error("[/artist-roster.getRosterStatsByBranch]", error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as Array<{
    status: RosterStatus;
    branch_id: string;
    branch: { slug: string } | { slug: string }[] | null;
  }>;
  const acc = new Map<string, { branch_slug: string; active: number; prospect: number; paused: number; departed: number }>();
  for (const r of rows) {
    const slug = Array.isArray(r.branch) ? r.branch[0]?.slug ?? "unknown" : r.branch?.slug ?? "unknown";
    const existing = acc.get(r.branch_id) ?? { branch_slug: slug, active: 0, prospect: 0, paused: 0, departed: 0 };
    existing[r.status] += 1;
    acc.set(r.branch_id, existing);
  }
  return Array.from(acc.entries()).map(([branch_id, v]) => ({ branch_id, ...v }));
}
