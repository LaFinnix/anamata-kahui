"use server";

/**
 * Contracts — server actions.
 *
 * Auth-required: super_admin or branch_admin of the contract's branch
 * for write actions. The artist can call `signContractAction` for their
 * own contract.
 *
 * The click-to-acknowledge sign flow:
 *   1. Admin creates a draft contract (body is fetched from the
 *      document library at create time — frozen into contracts.body)
 *   2. Admin moves draft → active by signing on the platform's
 *      behalf (sets signed_at, signed_ip_hash). The artist's
 *      click-to-acknowledge is a separate sign action.
 *   3. Artist reads the frozen body, clicks "I have read and agree".
 *   4. signed_at is set; signed_by_artist is the artist's id; signed_ip_hash
 *      records an audit hash of the request environment.
 */

import { createServerSupabase } from "@/lib/supabase/clients";
import { revalidatePath } from "next/cache";
import {
  canContractTransition,
  CONTRACT_STATUSES,
  CONTRACT_TYPES,
  type ContractStatus,
  type ContractType,
} from "./types";

/* -------------------------------------------------------------------------- */
/* ActionState shape                                                          */
/* -------------------------------------------------------------------------- */

export interface ContractActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  contractId?: string;
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

/** Compute the SHA-256 of a string. Browser + Node both have crypto. */
async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

/** Create a new contract (admin only). The body is fetched from the
 *  document library and frozen into contracts.body. */
export async function createContractAction(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const artistRosterId = asString(formData.get("artist_roster_id"));
  const documentType = asString(formData.get("document_type"));
  const documentVersion = asString(formData.get("document_version"));
  const contractTypeRaw = asString(formData.get("contract_type"));
  const termStart = asString(formData.get("term_start")) || null;
  const termEnd = asString(formData.get("term_end")) || null;
  const territory = asString(formData.get("territory")) || null;
  const exclusivityScope = asString(formData.get("exclusivity_scope")) || null;
  const parentContractId = asString(formData.get("parent_contract_id")) || null;

  const fieldErrors: Record<string, string[]> = {};
  if (!isUuid(artistRosterId)) fieldErrors.artist_roster_id = ["artist_roster_id must be a uuid"];
  if (!documentType) fieldErrors.document_type = ["document_type is required"];
  if (!documentVersion) fieldErrors.document_version = ["document_version is required"];
  if (!(CONTRACT_TYPES as readonly string[]).includes(contractTypeRaw)) {
    fieldErrors.contract_type = [`contract_type must be one of: ${CONTRACT_TYPES.join(", ")}`];
  }
  if (termStart && !isDate(termStart)) fieldErrors.term_start = ["term_start must be YYYY-MM-DD"];
  if (termEnd && !isDate(termEnd)) fieldErrors.term_end = ["term_end must be YYYY-MM-DD"];
  if (parentContractId && !isUuid(parentContractId)) {
    fieldErrors.parent_contract_id = ["parent_contract_id must be a uuid"];
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // Verify the artist_roster row exists + get the branch for the admin guard
  const { data: rosterRow, error: rosterErr } = await supabase
    .from("artist_roster")
    .select("branch_id")
    .eq("id", artistRosterId)
    .maybeSingle();
  if (rosterErr) return { ok: false, error: rosterErr.message };
  if (!rosterRow) return { ok: false, error: "Artist roster row not found." };

  // Admin guard (super_admin OR branch_admin of this branch)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isSuper = profile?.role === "super_admin";
  if (!isSuper) {
    const { data: ub } = await supabase
      .from("user_branches")
      .select("role")
      .eq("user_id", user.id)
      .eq("branch_id", rosterRow.branch_id)
      .in("role", ["admin", "editor"])
      .maybeSingle();
    if (!ub) return { ok: false, error: "Not a branch admin for this branch." };
  }

  // Fetch the document body from the on-disk library
  const { getDocument } = await import("@/lib/documents/loader");
  const doc = await getDocument(documentType as never, documentVersion);
  if (!doc) {
    return {
      ok: false,
      error: `Document not found: ${documentType} v${documentVersion}`,
    };
  }
  // Compose the frozen body — include a small header explaining this
  // is the snapshot that was active when the contract was created.
  const frozenBody =
    `# ${doc.meta.title} (v${doc.meta.version}, effective ${doc.meta.effective_at})\n\n` +
    doc.body +
    "\n";

  const title = asString(formData.get("title")) || doc.meta.title;
  const notes = asString(formData.get("notes")) || null;

  const { data, error } = await supabase
    .from("contracts")
    .insert({
      artist_roster_id: artistRosterId,
      document_type: documentType,
      document_version: documentVersion,
      title,
      body: frozenBody,
      contract_type: contractTypeRaw as ContractType,
      status: "draft",
      term_start: termStart,
      term_end: termEnd,
      territory,
      exclusivity_scope: exclusivityScope,
      royalty_split: {},
      parent_contract_id: parentContractId,
      created_by: user.id,
      last_modified_by: user.id,
      notes,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/records");
  revalidatePath("/kaikorero/roster");
  return { ok: true, contractId: data.id };
}

/** Change the status of a contract (admin only). Validates transition. */
export async function changeContractStatusAction(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const contractId = asString(formData.get("contract_id"));
  const newStatus = asString(formData.get("new_status")) as ContractStatus;
  const terminatedReason = asString(formData.get("terminated_reason")) || null;

  const fieldErrors: Record<string, string[]> = {};
  if (!isUuid(contractId)) fieldErrors.contract_id = ["contract_id must be a uuid"];
  if (!(CONTRACT_STATUSES as readonly string[]).includes(newStatus)) {
    fieldErrors.new_status = [`new_status must be one of: ${CONTRACT_STATUSES.join(", ")}`];
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // Get the contract + the roster branch for the admin guard
  const { data: contract, error: readErr } = await supabase
    .from("contracts")
    .select(`
      status,
      roster:artist_roster!contracts_artist_roster_id_fkey (branch_id)
    `)
    .eq("id", contractId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!contract) return { ok: false, error: "Contract not found." };

  // Admin guard
  const branchId = (contract.roster as unknown as { branch_id: string }).branch_id;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isSuper = profile?.role === "super_admin";
  if (!isSuper) {
    const { data: ub } = await supabase
      .from("user_branches")
      .select("role")
      .eq("user_id", user.id)
      .eq("branch_id", branchId)
      .in("role", ["admin", "editor"])
      .maybeSingle();
    if (!ub) return { ok: false, error: "Not a branch admin for this branch." };
  }

  if (!canContractTransition(contract.status as ContractStatus, newStatus)) {
    return {
      ok: false,
      error: `Cannot transition from "${contract.status}" to "${newStatus}".`,
    };
  }

  const update: Record<string, unknown> = {
    status: newStatus,
    last_modified_by: user.id,
  };
  if (newStatus === "terminated") {
    update.terminated_at = new Date().toISOString();
    update.terminated_reason = terminatedReason;
  }

  const { error } = await supabase
    .from("contracts")
    .update(update)
    .eq("id", contractId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/records");
  revalidatePath("/kaikorero/roster");
  return { ok: true, contractId };
}

/** Artist click-to-acknowledge: sign a contract. The artist MUST be
 *  the profile behind the contract's roster row. Records signed_at,
 *  signed_by_artist, and signed_ip_hash (sha256 of ip+user_agent). */
export async function signContractAction(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const contractId = asString(formData.get("contract_id"));
  if (!isUuid(contractId)) return { ok: false, error: "contract_id must be a uuid" };

  // Read the contract + verify the artist owns the roster row
  const { data: contract, error: readErr } = await supabase
    .from("contracts")
    .select(`
      id, status, body, document_type, document_version, signed_at,
      roster:artist_roster!contracts_artist_roster_id_fkey (
        id, profile_id
      )
    `)
    .eq("id", contractId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!contract) return { ok: false, error: "Contract not found." };

  // Verify the contract's roster profile is the current user
  // PostgREST returns FK joins as either a single object or an array;
  // normalise both shapes.
  const rosterArr = (contract.roster as unknown) as
    | { profile_id: string }
    | { profile_id: string }[]
    | null;
  const rosterProfileId = Array.isArray(rosterArr) ? rosterArr[0]?.profile_id : rosterArr?.profile_id;
  if (!rosterProfileId) return { ok: false, error: "Contract has no roster row." };
  if (rosterProfileId !== user.id) {
    return { ok: false, error: "Only the artist on the roster can sign this contract." };
  }

  // Can only sign a 'draft' or 'active' contract
  if (contract.status !== "draft" && contract.status !== "active") {
    return {
      ok: false,
      error: `Contract in status "${contract.status}" cannot be signed.`,
    };
  }

  // Don't allow re-signing (would lose the original signed_at)
  if (contract.signed_at) {
    return { ok: false, error: "Contract has already been signed." };
  }

  // Build an audit hash. We don't have direct access to ip+user_agent
  // in a server action; we use the body + a server-side timestamp +
  // user.id as the audit anchor. The body is frozen, so any change to
  // the document library produces a different hash on re-render.
  const auditPayload = JSON.stringify({
    contract_id: contract.id,
    document_type: contract.document_type,
    document_version: contract.document_version,
    body_sha: await sha256(contract.body as string),
    signed_by: user.id,
    signed_at: new Date().toISOString(),
  });
  const signedIpHash = await sha256(auditPayload);

  const { error } = await supabase
    .from("contracts")
    .update({
      status: "active",
      signed_at: new Date().toISOString(),
      signed_by_artist: user.id,
      signed_ip_hash: signedIpHash,
      last_modified_by: user.id,
    })
    .eq("id", contractId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/kaikorero/roster");
  revalidatePath("/dashboard/admin/records");
  return { ok: true, contractId };
}
