/**
 * Legal policies — read queries.
 *
 * All queries use the SERVER supabase client (RLS-enforced). An artist
 * can read their own acks; admins can read all for their branch.
 * Public can read current policy versions (the doc library) via the
 * legal_policies_public_read policy.
 */

import { createServerSupabase } from "@/lib/supabase/clients";
import type {
  LegalPolicyAckRow,
  LegalPolicyAckWithPolicy,
  LegalPolicyRow,
  PolicyType,
} from "./types";

/** List all policy docs of a given type, newest first. */
export async function listPoliciesByType(
  policyType: PolicyType,
): Promise<LegalPolicyRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("legal_policies")
    .select("*")
    .eq("policy_type", policyType)
    .order("effective_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("[/legal-policies.listPoliciesByType]", error.message);
    return [];
  }
  return (data ?? []) as LegalPolicyRow[];
}

/** Get the current (is_current=true) version of a policy type. */
export async function getCurrentPolicy(
  policyType: PolicyType,
): Promise<LegalPolicyRow | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("legal_policies")
    .select("*")
    .eq("policy_type", policyType)
    .eq("is_current", true)
    .maybeSingle();
  if (error) {
    console.error("[/legal-policies.getCurrentPolicy]", error.message);
    return null;
  }
  return (data ?? null) as LegalPolicyRow | null;
}

/** Get a policy by id. */
export async function getPolicy(id: string): Promise<LegalPolicyRow | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("legal_policies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[/legal-policies.getPolicy]", error.message);
    return null;
  }
  return (data ?? null) as LegalPolicyRow | null;
}

/** List all current policies (admin can see all, public sees all current). */
export async function listAllCurrentPolicies(): Promise<LegalPolicyRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("legal_policies")
    .select("*")
    .eq("is_current", true)
    .order("policy_type", { ascending: true })
    .limit(50);
  if (error) {
    console.error("[/legal-policies.listAllCurrentPolicies]", error.message);
    return [];
  }
  return (data ?? []) as LegalPolicyRow[];
}

/** List acknowledgements for a specific roster row. */
export async function listAcksForRoster(
  rosterId: string,
): Promise<LegalPolicyAckWithPolicy[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("legal_policy_acknowledgements")
    .select(`
      id, policy_id, artist_roster_id, acknowledged_at, ip_hash,
      withdrawn_at, withdrawn_reason, notes,
      policy:legal_policies!legal_policy_ack_policy_id_fkey (
        id, policy_type, version, title, body, effective_at, is_current,
        required_for_all, created_by, created_at
      )
    `)
    .eq("artist_roster_id", rosterId)
    .order("acknowledged_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[/legal-policies.listAcksForRoster]", error.message);
    return [];
  }
  return (data ?? []) as unknown as LegalPolicyAckWithPolicy[];
}

/** Get the current (active, not withdrawn) ack of a policy by an artist. */
export async function getCurrentAck(
  artistRosterId: string,
  policyId: string,
): Promise<LegalPolicyAckRow | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("legal_policy_acknowledgements")
    .select("*")
    .eq("artist_roster_id", artistRosterId)
    .eq("policy_id", policyId)
    .is("withdrawn_at", null)
    .order("acknowledged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[/legal-policies.getCurrentAck]", error.message);
    return null;
  }
  return (data ?? null) as LegalPolicyAckRow | null;
}

/** Count acks by policy (for admin dashboard). */
export async function getAckStatsByPolicy(): Promise<
  Array<{ policy_id: string; policy_title: string; total: number; active: number; withdrawn: number }>
> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("legal_policy_acknowledgements")
    .select(`
      policy_id,
      withdrawn_at,
      policy:legal_policies!legal_policy_ack_policy_id_fkey (title)
    `)
    .limit(5000);
  if (error) {
    console.error("[/legal-policies.getAckStatsByPolicy]", error.message);
    return [];
  }
  const rows = (data ?? []) as unknown as Array<{
    policy_id: string;
    withdrawn_at: string | null;
    policy: { title: string } | { title: string }[] | null;
  }>;
  const acc = new Map<string, { title: string; total: number; active: number; withdrawn: number }>();
  for (const r of rows) {
    const title = Array.isArray(r.policy) ? r.policy[0]?.title ?? "Unknown" : r.policy?.title ?? "Unknown";
    const existing = acc.get(r.policy_id) ?? { title, total: 0, active: 0, withdrawn: 0 };
    existing.total += 1;
    if (r.withdrawn_at) existing.withdrawn += 1;
    else existing.active += 1;
    acc.set(r.policy_id, existing);
  }
  return Array.from(acc.entries()).map(([policy_id, v]) => ({
    policy_id,
    policy_title: v.title,
    total: v.total,
    active: v.active,
    withdrawn: v.withdrawn,
  }));
}
