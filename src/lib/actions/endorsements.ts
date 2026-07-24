"use server";

/**
 * Endorsements — server actions for the credibility layer.
 *
 * Implements docs/COLLABORATION-MARKETPLACE-PLAN.md §3.2:
 *   - giveEndorsementAction — create an endorsement; recipient != endorser
 *   - revokeEndorsementAction — set status='revoked' + reason (only
 *     endorser or super_admin; trigger enforces field-level mutability)
 *
 * Two actions only. The cultural-review extension (auto-endorse on
 * release approval) lives in src/lib/actions/cultural-review.ts.
 *
 * Auth: actions require auth.uid(); RLS enforces row-level access.
 *
 * Pattern follows src/lib/actions/cultural-review.ts: discriminated
 * union returned, not redirect; errors surfaced inline.
 *
 * NOTE: "use server" files can only export async functions. Types and
 * constants live in src/lib/endorsements/types.ts.
 */

import { revalidatePath } from "next/cache";

import { createAdminClient, createServerSupabase } from "@/lib/supabase/clients";
import {
  ENDORSEMENT_TYPES,
  ENDORSEMENT_WORK_TYPES,
  type EndorsementType,
  type EndorsementWorkType,
  type EndorsementState,
  type KnowledgeDomain,
} from "@/lib/endorsements/types";

/* -------------------------------------------------------------------------- */
/* Helpers (private)                                                           */
/* -------------------------------------------------------------------------- */

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: "Authentication required." as const };
  return { supabase, user, error: null };
}

/** Insert a notification row. Uses admin client to bypass notification RLS. */
async function notify(
  payload: { recipient_id: string; kind: string; payload: Record<string, unknown> },
): Promise<void> {
  const admin = createAdminClient();
  // Best-effort: a notification failure shouldn't block the main action.
  await admin.from("notifications").insert({
    recipient_id: payload.recipient_id,
    kind: payload.kind,
    payload: payload.payload,
  });
}

/* -------------------------------------------------------------------------- */
/* Main action — give an endorsement                                          */
/* -------------------------------------------------------------------------- */

/** Action state union for give + revoke. */
export interface EndorseState {
  error?: string;
  success?: string;
}

export async function giveEndorsementAction(
  _prev: EndorsementState | null,
  formData: FormData,
): Promise<EndorsementState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  // ----- Parse + validate inputs -----
  const recipientId = String(formData.get("recipient_id") ?? "").trim();
  const workId = String(formData.get("work_id") ?? "").trim() || null;
  const workType = String(formData.get("work_type") ?? "release") as EndorsementWorkType;
  const workRef = String(formData.get("work_ref") ?? "").trim() || null;
  const endorsementType = String(formData.get("endorsement_type") ?? "") as EndorsementType;
  const knowledgeDomainRaw = String(formData.get("knowledge_domain") ?? "").trim() || null;
  const knowledgeDomain = knowledgeDomainRaw
    ? ((knowledgeDomainRaw as KnowledgeDomain) ?? null)
    : null;
  const scopeIwi = String(formData.get("scope_iwi") ?? "").trim() || null;
  const scopeRegion = String(formData.get("scope_region") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!recipientId) return { error: "Recipient is required." };
  if (recipientId === user.id) {
    return { error: "You cannot endorse yourself." };
  }
  if (!ENDORSEMENT_TYPES.includes(endorsementType as EndorsementType)) {
    return { error: "Invalid endorsement type." };
  }
  if (!ENDORSEMENT_WORK_TYPES.includes(workType as EndorsementWorkType)) {
    return { error: "Invalid work type." };
  }
  if (notes.length === 0 || notes.length > 2000) {
    return { error: "Notes are required (1–2000 characters)." };
  }
  if (workType === "profile" && workId) {
    return { error: "Profile-anchored endorsements must not have a work_id." };
  }
  if (workType !== "profile" && !workId && !workRef) {
    return { error: "Non-profile endorsements must reference a work." };
  }

  // ----- Verify recipient exists -----
  // Use admin client to read profile for validation (RLS would block anon reads,
  // but the authed user CAN read profile existence via standard RLS).
  const { data: recipient, error: rErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", recipientId)
    .maybeSingle();
  if (rErr) return { error: `Recipient lookup failed: ${rErr.message}` };
  if (!recipient) return { error: "Recipient profile not found." };

  // ----- Insert endorsement -----
  // RLS enforces endorser_id = auth.uid() (self-only insert).
  const { data: endorsement, error: insertErr } = await supabase
    .from("endorsements")
    .insert({
      recipient_id: recipientId,
      endorser_id: user.id,
      work_id: workId,
      work_type: workType,
      work_ref: workRef,
      endorsement_type: endorsementType,
      knowledge_domain: knowledgeDomain,
      scope_iwi: scopeIwi,
      scope_region: scopeRegion,
      notes,
    })
    .select("id, created_at")
    .single();

  if (insertErr) {
    return { error: `Could not record endorsement: ${insertErr.message}` };
  }

  // ----- Increment recipient's contribution_count (best-effort) -----
  // Failure here doesn't undo the endorsement — the lineage is the source of
  // truth, contribution_count is a derived UI hint. Uses admin client to
  // bypass profile-write RLS. Read-then-write is safe because this is a
  // monotonic counter driven by append-only lineage events.
  try {
    const admin = createAdminClient();
    const { data: cur } = await admin
      .from("profiles")
      .select("contribution_count")
      .eq("id", recipientId)
      .single();
    if (cur) {
      const { error: bumpErr } = await admin
        .from("profiles")
        .update({ contribution_count: (cur.contribution_count ?? 0) + 1 })
        .eq("id", recipientId);
      if (bumpErr) {
        console.error(
          `Could not increment contribution_count for ${recipientId}: ${bumpErr.message}`,
        );
      }
    }
  } catch (e) {
    console.error(`Could not increment contribution_count for ${recipientId}:`, e);
  }

  // ----- Notify recipient -----
  await notify({
    recipient_id: recipientId,
    kind: "endorsement_received",
    payload: {
      endorsement_id: endorsement.id,
      endorser_id: user.id,
      work_id: workId,
      endorsement_type: endorsementType,
      knowledge_domain: knowledgeDomain,
      scope_iwi: scopeIwi,
    },
  });

  // ----- Revalidate -----
  revalidatePath(`/[locale]/artist/${recipientId}`, "page");
  revalidatePath("/kaikorero/profile");
  revalidatePath("/endorsements");

  return {
    success: "Endorsement recorded.",
    endorsementId: endorsement.id,
  };
}

/* -------------------------------------------------------------------------- */
/* Revoke an endorsement                                                       */
/* -------------------------------------------------------------------------- */

export async function revokeEndorsementAction(
  _prev: EndorsementState | null,
  formData: FormData,
): Promise<EndorsementState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  const endorsementId = String(formData.get("endorsement_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!endorsementId) return { error: "Endorsement id required." };
  if (reason.length === 0 || reason.length > 2000) {
    return { error: "Revocation reason is required (1–2000 characters)." };
  }

  // ----- Fetch the endorsement (so we can authorize + know the recipient) -----
  const { data: endorsement, error: fetchErr } = await supabase
    .from("endorsements")
    .select("id, recipient_id, endorser_id, status")
    .eq("id", endorsementId)
    .maybeSingle();

  if (fetchErr) return { error: `Endorsement lookup failed: ${fetchErr.message}` };
  if (!endorsement) return { error: "Endorsement not found." };
  if (endorsement.status === "revoked") {
    return { error: "Endorsement is already revoked." };
  }

  // ----- Update to revoked (RLS allows endorser or super_admin only) -----
  // The trigger `endorsements_no_mutation` enforces that ONLY status,
  // revoked_reason, revoked_at may change — we comply.
  const { error: updateErr } = await supabase
    .from("endorsements")
    .update({
      status: "revoked",
      revoked_reason: reason,
      revoked_at: new Date().toISOString(),
    })
    .eq("id", endorsementId);

  if (updateErr) {
    return { error: `Could not revoke endorsement: ${updateErr.message}` };
  }

  // ----- Notify recipient -----
  await notify({
    recipient_id: endorsement.recipient_id,
    kind: "endorsement_revoked",
    payload: {
      endorsement_id: endorsementId,
      endorser_id: endorsement.endorser_id,
      reason,
    },
  });

  revalidatePath(`/[locale]/artist/${endorsement.recipient_id}`, "page");
  revalidatePath("/endorsements");
  revalidatePath("/kaikorero/profile");

  return {
    success: "Endorsement revoked. The recipient's profile now shows it with your reason.",
  };
}
