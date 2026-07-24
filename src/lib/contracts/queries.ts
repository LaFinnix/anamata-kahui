/**
 * Contracts — read queries.
 *
 * All queries use the SERVER supabase client (RLS-enforced). An artist
 * can read their own contracts; admins can read all contracts for
 * their branch. Public cannot read.
 */

import { createServerSupabase } from "@/lib/supabase/clients";
import type {
  ContractRow,
  ContractStatus,
  ContractWithRoster,
} from "./types";

const SELECT_BASE = `
  id, artist_roster_id, document_type, document_version, title, body,
  contract_type, status, term_start, term_end, territory, exclusivity_scope,
  royalty_split, parent_contract_id, created_by, created_at,
  last_modified_by, last_modified_at, signed_at, signed_by_artist,
  signed_ip_hash, terminated_at, terminated_reason, notes
`;

const SELECT_WITH_ROSTER = `
  ${SELECT_BASE},
  roster:artist_roster!contracts_artist_roster_id_fkey (
    id, profile_id, branch_id, status,
    branch:branches!artist_roster_branch_id_fkey (id, slug, name),
    profile:profiles!artist_roster_profile_id_fkey (id, full_name)
  )
`;

/** List contracts for a single roster row. Used by the artist view
 *  ("my contracts on this branch"). */
export async function listContractsForRoster(
  rosterId: string,
  options?: { status?: ContractStatus | "any" },
): Promise<ContractRow[]> {
  const supabase = await createServerSupabase();
  let q = supabase
    .from("contracts")
    .select(SELECT_BASE)
    .eq("artist_roster_id", rosterId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (options?.status && options.status !== "any") {
    q = q.eq("status", options.status);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[/contracts.listContractsForRoster]", error.message);
    return [];
  }
  return (data ?? []) as ContractRow[];
}

/** List contracts for a branch (admin view). */
export async function listContractsForBranch(
  branchId: string,
  options?: { status?: ContractStatus | "any" },
): Promise<ContractWithRoster[]> {
  const supabase = await createServerSupabase();
  // Step 1: get roster ids for this branch
  const { data: rosterIds, error: rosterErr } = await supabase
    .from("artist_roster")
    .select("id")
    .eq("branch_id", branchId);
  if (rosterErr) {
    console.error("[/contracts.listContractsForBranch roster]", rosterErr.message);
    return [];
  }
  const ids = (rosterIds ?? []).map((r) => r.id);
  if (ids.length === 0) return [];

  let q = supabase
    .from("contracts")
    .select(SELECT_WITH_ROSTER)
    .in("artist_roster_id", ids)
    .order("created_at", { ascending: false })
    .limit(100);
  if (options?.status && options.status !== "any") {
    q = q.eq("status", options.status);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[/contracts.listContractsForBranch]", error.message);
    return [];
  }
  return (data ?? []) as unknown as ContractWithRoster[];
}

/** Get a single contract by id. */
export async function getContract(id: string): Promise<ContractWithRoster | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("contracts")
    .select(SELECT_WITH_ROSTER)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[/contracts.getContract]", error.message);
    return null;
  }
  return (data ?? null) as ContractWithRoster | null;
}

/** Get the renewal chain for a contract (parent + all children). */
export async function getContractChain(
  rootId: string,
): Promise<ContractRow[]> {
  const supabase = await createServerSupabase();
  // Walk up to find the root (in case we got a child)
  const { data: start } = await supabase
    .from("contracts")
    .select("id, parent_contract_id")
    .eq("id", rootId)
    .maybeSingle();
  if (!start) return [];
  let rootIdActual = start.id;
  // Walk up: max 5 hops (more than enough for normal renewals)
  for (let i = 0; i < 5; i++) {
    const { data: cur } = await supabase
      .from("contracts")
      .select("id, parent_contract_id")
      .eq("id", rootIdActual)
      .maybeSingle();
    if (!cur || !cur.parent_contract_id) break;
    rootIdActual = cur.parent_contract_id;
  }
  // Now collect all descendants via recursive CTE
  const { data, error } = await supabase.rpc("contracts_chain" as never, { p_root: rootIdActual } as never);
  // The RPC may not exist; fall back to BFS
  if (error || !data) {
    return await bfsContractChain(supabase, rootIdActual);
  }
  return (data as ContractRow[]) ?? [];
}

async function bfsContractChain(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  rootId: string,
): Promise<ContractRow[]> {
  const result: ContractRow[] = [];
  const seen = new Set<string>();
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const { data: row } = await supabase
      .from("contracts")
      .select(SELECT_BASE)
      .eq("id", id)
      .maybeSingle();
    if (row) {
      result.push(row as ContractRow);
      const { data: children } = await supabase
        .from("contracts")
        .select("id")
        .eq("parent_contract_id", id);
      for (const c of children ?? []) {
        queue.push(c.id);
      }
    }
  }
  // Sort by created_at
  result.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  return result;
}

/** Count active contracts per branch — for admin dashboard. */
export async function getContractStatsByBranch(): Promise<
  Array<{
    branch_id: string;
    branch_slug: string;
    draft: number;
    active: number;
    expired: number;
    terminated: number;
    renewed: number;
  }>
> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("contracts")
    .select(`
      status,
      roster:artist_roster!contracts_artist_roster_id_fkey (
        branch_id,
        branch:branches!artist_roster_branch_id_fkey (slug)
      )
    `)
    .limit(1000);
  if (error) {
    console.error("[/contracts.getContractStatsByBranch]", error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as Array<{
    status: ContractStatus;
    roster: {
      branch_id: string;
      branch: { slug: string } | { slug: string }[] | null;
    };
  }>;
  const acc = new Map<string, { branch_slug: string; draft: number; active: number; expired: number; terminated: number; renewed: number }>();
  for (const r of rows) {
    const slug = Array.isArray(r.roster.branch) ? r.roster.branch[0]?.slug ?? "unknown" : r.roster.branch?.slug ?? "unknown";
    const existing = acc.get(r.roster.branch_id) ?? { branch_slug: slug, draft: 0, active: 0, expired: 0, terminated: 0, renewed: 0 };
    existing[r.status] += 1;
    acc.set(r.roster.branch_id, existing);
  }
  return Array.from(acc.entries()).map(([branch_id, v]) => ({ branch_id, ...v }));
}
