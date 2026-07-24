"use server";

/**
 * Legal policies — server actions.
 *
 * Auth rules:
 *   - acknowledgePolicyAction: artist (must own the roster row)
 *   - withdrawAckAction: artist (same)
 *   - createPolicyAction: super_admin only
 *   - publishPolicyAction: super_admin only (flips is_current atomically)
 *   - archivePolicyAction: super_admin only
 */

import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/lib/supabase/clients";
import { isAckActive, POLICY_TYPES, type PolicyType } from "./types";

/* -------------------------------------------------------------------------- */
/* ActionState shape                                                          */
/* -------------------------------------------------------------------------- */

export interface PolicyActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  policyId?: string;
  ackId?: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, error: "Not signed in." } as const;
  }
  return { supabase, user, error: null } as const;
}

function asString(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function isDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createServerSupabase>>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "super_admin";
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

/** Artist click-to-acknowledge a policy. Records an immutable ack row. */
export async function acknowledgePolicyAction(
  _prev: PolicyActionState,
  formData: FormData,
): Promise<PolicyActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const policyId = asString(formData.get("policy_id"));
  const artistRosterId = asString(formData.get("artist_roster_id"));
  const notes = asString(formData.get("notes")) || null;

  const fieldErrors: Record<string, string[]> = {};
  if (!isUuid(policyId)) fieldErrors.policy_id = ["policy_id must be a uuid"];
  if (!isUuid(artistRosterId)) fieldErrors.artist_roster_id = ["artist_roster_id must be a uuid"];
  if (notes && notes.length > 2000) {
    fieldErrors.notes = ["notes must be 2000 characters or fewer"];
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // Verify the roster row belongs to the current user
  const { data: roster, error: rosterErr } = await supabase
    .from("artist_roster")
    .select("profile_id")
    .eq("id", artistRosterId)
    .maybeSingle();
  if (rosterErr) return { ok: false, error: rosterErr.message };
  if (!roster) return { ok: false, error: "Roster row not found." };
  if (roster.profile_id !== user.id) {
    return { ok: false, error: "Only the artist on the roster can acknowledge this policy." };
  }

  // Verify the policy exists and is current
  const { data: policy, error: policyErr } = await supabase
    .from("legal_policies")
    .select("id, version, body, is_current, withdrawn_at")
    .eq("id", policyId)
    .maybeSingle();
  if (policyErr) return { ok: false, error: policyErr.message };
  if (!policy) return { ok: false, error: "Policy not found." };
  if (!policy.is_current) {
    return { ok: false, error: "This policy version is not the current one. Please acknowledge the latest version." };
  }

  // Check if there's already an active (non-withdrawn) ack
  const { data: existing } = await supabase
    .from("legal_policy_acknowledgements")
    .select("id")
    .eq("policy_id", policyId)
    .eq("artist_roster_id", artistRosterId)
    .is("withdrawn_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "You have already acknowledged this policy." };
  }

  // Build audit hash
  const auditPayload = JSON.stringify({
    policy_id: policyId,
    policy_version: policy.version,
    body_sha: await sha256(policy.body as string),
    artist_roster_id: artistRosterId,
    signed_by: user.id,
    signed_at: new Date().toISOString(),
  });
  const ipHash = await sha256(auditPayload);

  const { data, error } = await supabase
    .from("legal_policy_acknowledgements")
    .insert({
      policy_id: policyId,
      artist_roster_id: artistRosterId,
      ip_hash: ipHash,
      notes,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/kaikorero/roster");
  revalidatePath("/admin/policies");
  return { ok: true, ackId: data.id, policyId };
}

/** Artist withdraws an acknowledgement (CARE right of withdrawal). */
export async function withdrawAckAction(
  _prev: PolicyActionState,
  formData: FormData,
): Promise<PolicyActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const ackId = asString(formData.get("ack_id"));
  const reason = asString(formData.get("withdrawn_reason")) || null;

  const fieldErrors: Record<string, string[]> = {};
  if (!isUuid(ackId)) fieldErrors.ack_id = ["ack_id must be a uuid"];
  if (reason && reason.length > 1000) {
    fieldErrors.withdrawn_reason = ["withdrawn_reason must be 1000 characters or fewer"];
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // Verify the ack belongs to the current user
  const { data: ack, error: ackErr } = await supabase
    .from("legal_policy_acknowledgements")
    .select(`
      id, withdrawn_at,
      roster:artist_roster!legal_policy_ack_artist_roster_id_fkey (profile_id)
    `)
    .eq("id", ackId)
    .maybeSingle();
  if (ackErr) return { ok: false, error: ackErr.message };
  if (!ack) return { ok: false, error: "Acknowledgement not found." };

  const rosterArr = (ack.roster as unknown) as
    | { profile_id: string }
    | { profile_id: string }[]
    | null;
  const profileId = Array.isArray(rosterArr) ? rosterArr[0]?.profile_id : rosterArr?.profile_id;
  if (profileId !== user.id) {
    return { ok: false, error: "You can only withdraw your own acknowledgements." };
  }
  if (!isAckActive(ack)) {
    return { ok: false, error: "Acknowledgement is already withdrawn." };
  }

  const { error } = await supabase
    .from("legal_policy_acknowledgements")
    .update({
      withdrawn_at: new Date().toISOString(),
      withdrawn_reason: reason,
    })
    .eq("id", ackId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/kaikorero/roster");
  revalidatePath("/admin/policies");
  return { ok: true, ackId };
}

/** Admin: create a new policy (draft, not yet current). */
export async function createPolicyAction(
  _prev: PolicyActionState,
  formData: FormData,
): Promise<PolicyActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) return { ok: false, error: "Only super_admins can create policies." };

  const policyType = asString(formData.get("policy_type")) as PolicyType;
  const version = asString(formData.get("version"));
  const title = asString(formData.get("title"));
  const effectiveAt = asString(formData.get("effective_at"));
  const requiredForAll = formData.get("required_for_all") === "on";

  const fieldErrors: Record<string, string[]> = {};
  if (!(POLICY_TYPES as readonly string[]).includes(policyType)) {
    fieldErrors.policy_type = [`policy_type must be one of: ${POLICY_TYPES.join(", ")}`];
  }
  if (!version) fieldErrors.version = ["version is required"];
  if (!title) fieldErrors.title = ["title is required"];
  if (!isDate(effectiveAt)) fieldErrors.effective_at = ["effective_at must be YYYY-MM-DD"];
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // Fetch body from the document library
  const { getDocument } = await import("@/lib/documents/loader");
  const doc = await getDocument(policyType as never, version);
  if (!doc) {
    return { ok: false, error: `Document not found in library: ${policyType} v${version}` };
  }
  const frozenBody = `# ${doc.meta.title} (v${doc.meta.version}, effective ${doc.meta.effective_at})\n\n${doc.body}\n`;

  const { data, error } = await supabase
    .from("legal_policies")
    .insert({
      policy_type: policyType,
      version,
      title,
      body: frozenBody,
      effective_at: effectiveAt,
      is_current: false,
      required_for_all: requiredForAll,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `A policy of type "${policyType}" at version "${version}" already exists.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/policies");
  return { ok: true, policyId: data.id };
}

/** Admin: publish a policy (set is_current=true; flips the previous current to false). */
export async function publishPolicyAction(
  _prev: PolicyActionState,
  formData: FormData,
): Promise<PolicyActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) return { ok: false, error: "Only super_admins can publish policies." };

  const policyId = asString(formData.get("policy_id"));
  if (!isUuid(policyId)) return { ok: false, error: "policy_id must be a uuid" };

  const { error } = await supabase.rpc("legal_policies_set_current" as never, {
    p_policy_id: policyId,
  } as never);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/policies");
  revalidatePath("/kaikorero/roster");
  return { ok: true, policyId };
}
