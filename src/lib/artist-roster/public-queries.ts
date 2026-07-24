/**
 * Public roster — read queries.
 *
 * Used by the public `/[locale]/roster` page. Returns only artists
 * who are:
 *   - active (status = 'active')
 *   - opted in to public display (on_roster_publicly = true AND opted_in_public = true)
 *
 * The RLS policy `artist_roster_public_read` enforces this at the
 * database layer. We also apply the filter explicitly in the query
 * (belt + suspenders) so the query is readable in isolation.
 */

import { createAdminClient } from "@/lib/supabase/clients";

export interface PublicRosterEntry {
  id: string;
  branch_id: string;
  role_summary: string | null;
  /** When the artist joined this branch's roster (active). */
  joined_at: string;
  profile: {
    id: string;
    full_name: string | null;
    iwi_affiliation_attested: string[] | null;
  };
  branch: {
    id: string;
    slug: "records" | "research" | "arts" | "dev";
    name: string;
  };
}

const SELECT = `
  id, branch_id, role_summary, status_changed_at,
  profile:profiles!artist_roster_profile_id_fkey (id, full_name, iwi_affiliation_attested),
  branch:branches!artist_roster_branch_id_fkey (id, slug, name)
`;

/** List the public roster, optionally filtered by branch slug. */
export async function listPublicRoster(
  options?: { branchSlug?: "records" | "research" | "arts" | "dev" },
): Promise<PublicRosterEntry[]> {
  const admin = createAdminClient();
  let q = admin
    .from("artist_roster")
    .select(SELECT)
    .eq("status", "active")
    .eq("on_roster_publicly", true)
    .eq("opted_in_public", true)
    .order("status_changed_at", { ascending: false })
    .limit(100);
  if (options?.branchSlug) {
    q = q.eq("branch.slug", options.branchSlug);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[/roster.listPublicRoster]", error.message);
    return [];
  }
  return (data ?? []).map((r) => {
    // PostgREST returns FK joins as either object or array; normalise.
    const profile = Array.isArray(r.profile) ? r.profile[0] : r.profile;
    const branch = Array.isArray(r.branch) ? r.branch[0] : r.branch;
    return {
      id: r.id,
      branch_id: r.branch_id,
      role_summary: r.role_summary,
      joined_at: r.status_changed_at,
      profile: {
        id: profile?.id ?? "",
        full_name: profile?.full_name ?? null,
        iwi_affiliation_attested: profile?.iwi_affiliation_attested ?? null,
      },
      branch: {
        id: branch?.id ?? "",
        slug: (branch?.slug ?? "records") as PublicRosterEntry["branch"]["slug"],
        name: branch?.name ?? "",
      },
    } satisfies PublicRosterEntry;
  });
}

/** Get the count of public roster members, optionally per branch. */
export async function countPublicRoster(): Promise<{
  total: number;
  byBranch: Array<{ branch_slug: string; count: number }>;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("artist_roster")
    .select("branch:branches!artist_roster_branch_id_fkey (slug)")
    .eq("status", "active")
    .eq("on_roster_publicly", true)
    .eq("opted_in_public", true)
    .limit(500);
  if (error) {
    console.error("[/roster.countPublicRoster]", error.message);
    return { total: 0, byBranch: [] };
  }
  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    const branch = Array.isArray(r.branch) ? r.branch[0] : r.branch;
    const slug = branch?.slug ?? "unknown";
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return {
    total: (data ?? []).length,
    byBranch: Array.from(counts.entries()).map(([branch_slug, count]) => ({
      branch_slug,
      count,
    })),
  };
}
