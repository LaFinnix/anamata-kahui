"use server";

/**
 * Tono (help-request) board — server actions.
 *
 * Implements docs/COLLABORATION-MARKETPLACE-PLAN.md §3.3, §3.4 and
 * Phase 3 of PHASES.md. Six flows:
 *
 *   1. createTonoAction         — post a new help request
 *   2. proposeOnTonoAction      — respond to a tono with a proposal + koha
 *   3. respondToProposalAction  — creator accepts or declines a proposal
 *   4. fulfillTonoAction        — creator marks fulfilled (auto-creates
 *                                 a co_creator endorsement for the proposer
 *                                 and bumps their contribution_count)
 *   5. withdrawTonoAction       — creator withdraws the request
 *   6. closeTonoAction          — creator closes without fulfilling
 *
 * Visibility rules (per migration 0027 RLS + §4.9 defence model):
 *   - visibility='open' → visible to everyone (when status is open or resolved)
 *   - visibility='iwi_specific' → only users with scope_iwi in their attested set
 *   - visibility='invited' → only invitees
 *   - status='in_conversation' → only the two parties + super_admin (not public)
 *
 * Auth: each action checks auth.uid(); RLS enforces row-level access.
 * Pattern follows cultural-review.ts: discriminated union returned, not redirect.
 *
 * NOTE: "use server" files can only export async functions. Constants and
 * types live in src/lib/tono/types.ts.
 */

import { revalidatePath } from "next/cache";

import {
  createAdminClient,
  createServerSupabase,
} from "@/lib/supabase/clients";
import {
  TONO_HELP_TYPES,
  TONO_VISIBILITIES,
  type TonoHelpType,
  type TonoVisibility,
} from "@/lib/tono/types";
import type { TonoState } from "@/lib/tono/types";

/* -------------------------------------------------------------------------- */
/* Helpers (private)                                                           */
/* -------------------------------------------------------------------------- */

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: "Authentication required." as const };
  return { supabase, user, error: null };
}

async function notify(
  payload: { recipient_id: string; kind: string; payload: Record<string, unknown> },
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    recipient_id: payload.recipient_id,
    kind: payload.kind,
    payload: payload.payload,
  });
}

/* -------------------------------------------------------------------------- */
/* 1. createTonoAction                                                        */
/* -------------------------------------------------------------------------- */

export async function createTonoAction(
  _prev: TonoState | null,
  formData: FormData,
): Promise<TonoState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  // ----- Parse + validate -----
  const helpType = String(formData.get("help_type") ?? "") as TonoHelpType;
  const knowledgeDomainRaw = String(formData.get("knowledge_domain") ?? "").trim() || null;
  const scopeIwi = String(formData.get("scope_iwi") ?? "").trim() || null;
  const scopeRegion = String(formData.get("scope_region") ?? "").trim() || null;
  const requestBody = String(formData.get("request_body") ?? "").trim();
  const offeredKoha = String(formData.get("offered_koha") ?? "").trim() || null;
  const kohaIsMonetary = formData.get("koha_is_monetary") === "on" || formData.get("koha_is_monetary") === "true";
  const visibility = String(formData.get("visibility") ?? "open") as TonoVisibility;
  const workId = String(formData.get("work_id") ?? "").trim() || null;
  const expiresAtRaw = String(formData.get("expires_at") ?? "").trim() || null;

  if (!TONO_HELP_TYPES.includes(helpType)) {
    return { error: "Invalid help type." };
  }
  if (!TONO_VISIBILITIES.includes(visibility)) {
    return { error: "Invalid visibility." };
  }
  if (requestBody.length === 0 || requestBody.length > 4000) {
    return { error: "Request body is required (1–4000 characters)." };
  }
  if (visibility === "iwi_specific" && !scopeIwi) {
    return { error: "iwi_specific visibility requires a scope_iwi." };
  }
  if (offeredKoha && offeredKoha.length > 2000) {
    return { error: "Koha description must be 2000 characters or fewer." };
  }

  // Parse expires_at to ISO timestamp if set
  let expiresAtIso: string | null = null;
  if (expiresAtRaw) {
    const d = new Date(expiresAtRaw);
    if (Number.isNaN(d.getTime())) {
      return { error: "Invalid expires_at date." };
    }
    expiresAtIso = d.toISOString();
  }

  // ----- Insert tono -----
  const { data: tono, error: insertErr } = await supabase
    .from("tono")
    .insert({
      creator_id: user.id,
      work_id: workId,
      help_type: helpType,
      knowledge_domain: knowledgeDomainRaw,
      scope_iwi: scopeIwi,
      scope_region: scopeRegion,
      request_body: requestBody,
      offered_koha: offeredKoha,
      koha_is_monetary: kohaIsMonetary,
      visibility,
      expires_at: expiresAtIso,
    })
    .select("id")
    .single();

  if (insertErr) {
    return { error: `Could not post tono: ${insertErr.message}` };
  }

  revalidatePath("/tono");
  revalidatePath("/tono/inbox");
  revalidatePath(`/[locale]/artist/${user.id}`, "page");

  return {
    success:
      visibility === "iwi_specific"
        ? "Tono posted. Visible to kaikōrero with attested affiliation to this iwi."
        : visibility === "invited"
          ? "Tono posted. Add invitees to direct it."
          : "Tono posted and visible to the kāhui.",
    tonoId: tono.id,
  };
}

/* -------------------------------------------------------------------------- */
/* 2. proposeOnTonoAction                                                     */
/* -------------------------------------------------------------------------- */

export async function proposeOnTonoAction(
  _prev: TonoState | null,
  formData: FormData,
): Promise<TonoState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  const tonoId = String(formData.get("tono_id") ?? "").trim();
  const proposalBody = String(formData.get("proposal_body") ?? "").trim();
  const proposedKoha = String(formData.get("proposed_koha") ?? "").trim() || null;
  const estimatedHoursRaw = String(formData.get("estimated_hours") ?? "").trim() || null;
  const availableFromRaw = String(formData.get("available_from") ?? "").trim() || null;

  if (!tonoId) return { error: "Tono id required." };
  if (proposalBody.length === 0 || proposalBody.length > 4000) {
    return { error: "Proposal body is required (1–4000 characters)." };
  }
  if (proposedKoha && proposedKoha.length > 2000) {
    return { error: "Koha description must be 2000 characters or fewer." };
  }

  let estimatedHours: number | null = null;
  if (estimatedHoursRaw) {
    const n = Number(estimatedHoursRaw);
    if (Number.isNaN(n) || n < 0 || n > 9999.99) {
      return { error: "Estimated hours must be a number between 0 and 9999.99." };
    }
    estimatedHours = n;
  }

  // ----- Verify tono exists + is open + user is not the creator -----
  const { data: tono, error: tErr } = await supabase
    .from("tono")
    .select("id, status, creator_id, help_type")
    .eq("id", tonoId)
    .maybeSingle();
  if (tErr) return { error: `Tono lookup failed: ${tErr.message}` };
  if (!tono) return { error: "Tono not found or not visible to you." };
  if (tono.creator_id === user.id) {
    return { error: "You cannot propose on your own tono." };
  }
  if (tono.status !== "open") {
    return { error: "Tono is no longer accepting proposals." };
  }

  // ----- Insert proposal (UNIQUE (tono_id, proposer_id) constraint enforced by DB) -----
  const { data: proposal, error: insertErr } = await supabase
    .from("tono_proposals")
    .insert({
      tono_id: tonoId,
      proposer_id: user.id,
      proposal_body: proposalBody,
      proposed_koha: proposedKoha,
      estimated_hours: estimatedHours,
      available_from: availableFromRaw || null,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return { error: "You've already proposed on this tono. Withdraw your existing proposal first if you'd like to revise it." };
    }
    return { error: `Could not submit proposal: ${insertErr.message}` };
  }

  // ----- Notify tono creator -----
  await notify({
    recipient_id: tono.creator_id,
    kind: "tono_proposal_received",
    payload: {
      tono_id: tonoId,
      proposal_id: proposal.id,
      proposer_id: user.id,
    },
  });

  revalidatePath(`/tono/${tonoId}`);
  revalidatePath("/tono");
  revalidatePath(`/tono/${tonoId}/inbox`);

  return {
    success: "Proposal submitted. The tono creator will see it and can accept or decline.",
    tonoId,
    proposalId: proposal.id,
  };
}

/* -------------------------------------------------------------------------- */
/* 3. respondToProposalAction                                                 */
/* -------------------------------------------------------------------------- */

export async function respondToProposalAction(
  _prev: TonoState | null,
  formData: FormData,
): Promise<TonoState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  const proposalId = String(formData.get("proposal_id") ?? "").trim();
  const decisionRaw = String(formData.get("decision") ?? "").trim();
  const declineReason = String(formData.get("decline_reason") ?? "").trim() || null;

  if (!proposalId) return { error: "Proposal id required." };
  if (decisionRaw !== "accepted" && decisionRaw !== "declined") {
    return { error: "Decision must be 'accepted' or 'declined'." };
  }
  if (decisionRaw === "declined" && (declineReason?.length ?? 0) > 2000) {
    return { error: "Decline reason must be 2000 characters or fewer." };
  }

  // ----- Fetch proposal + tono (so we can authorize) -----
  const { data: proposal, error: pErr } = await supabase
    .from("tono_proposals")
    .select(`
      id, tono_id, proposer_id, status,
      tono:tono_id ( id, creator_id, status, help_type )
    `)
    .eq("id", proposalId)
    .maybeSingle();

  if (pErr) return { error: `Proposal lookup failed: ${pErr.message}` };
  if (!proposal) return { error: "Proposal not found." };

  // Normalize the tono join (Supabase returns object or array)
  const tonoRaw = proposal.tono as unknown;
  const tono = Array.isArray(tonoRaw) ? tonoRaw[0] : tonoRaw;
  if (!tono) return { error: "Proposal's tono is missing." };
  if ((tono as { creator_id: string }).creator_id !== user.id) {
    return { error: "Only the tono creator can respond to proposals." };
  }
  if ((tono as { status: string }).status !== "open") {
    return { error: "Tono is no longer accepting responses." };
  }
  if (proposal.status !== "pending") {
    return { error: `Proposal is already ${proposal.status}.` };
  }

  // ----- Update proposal -----
  const updatePayload: Record<string, unknown> = {
    status: decisionRaw,
    decided_at: new Date().toISOString(),
  };
  if (decisionRaw === "declined") {
    updatePayload.decline_reason = declineReason;
  }
  const { error: uErr } = await supabase
    .from("tono_proposals")
    .update(updatePayload)
    .eq("id", proposalId);
  if (uErr) return { error: `Could not update proposal: ${uErr.message}` };

  // ----- On accept: flip tono to in_conversation + decline other pending proposals -----
  if (decisionRaw === "accepted") {
    const { error: tUpdateErr } = await supabase
      .from("tono")
      .update({ status: "in_conversation" })
      .eq("id", proposal.tono_id);
    if (tUpdateErr) {
      return {
        error: `Proposal accepted but tono status update failed: ${tUpdateErr.message}. Please try again or contact an admin.`,
      };
    }

    // Decline all other pending proposals on this tono
    await supabase
      .from("tono_proposals")
      .update({
        status: "declined",
        decided_at: new Date().toISOString(),
        decline_reason: "Another proposal was accepted.",
      })
      .eq("tono_id", proposal.tono_id)
      .eq("status", "pending")
      .neq("id", proposalId);

    // Notify proposer
    await notify({
      recipient_id: proposal.proposer_id,
      kind: "tono_proposal_accepted",
      payload: {
        tono_id: proposal.tono_id,
        proposal_id: proposal.id,
      },
    });
  } else {
    // Notify proposer of decline
    await notify({
      recipient_id: proposal.proposer_id,
      kind: "tono_proposal_declined",
      payload: {
        tono_id: proposal.tono_id,
        proposal_id: proposal.id,
        reason: declineReason,
      },
    });
  }

  revalidatePath(`/tono/${proposal.tono_id}`);
  revalidatePath("/tono");
  revalidatePath("/tono/inbox");

  return {
    success:
      decisionRaw === "accepted"
        ? "Proposal accepted. Tono is now in conversation. Mark it fulfilled when the work lands."
        : "Proposal declined. The proposer has been notified.",
    proposalId,
  };
}

/* -------------------------------------------------------------------------- */
/* 4. fulfillTonoAction                                                       */
/* -------------------------------------------------------------------------- */

export async function fulfillTonoAction(
  _prev: TonoState | null,
  formData: FormData,
): Promise<TonoState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  const tonoId = String(formData.get("tono_id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!tonoId) return { error: "Tono id required." };

  // ----- Fetch tono + the accepted proposal -----
  const { data: tono, error: tErr } = await supabase
    .from("tono")
    .select("id, creator_id, status, work_id")
    .eq("id", tonoId)
    .maybeSingle();
  if (tErr) return { error: `Tono lookup failed: ${tErr.message}` };
  if (!tono) return { error: "Tono not found." };
  if (tono.creator_id !== user.id) {
    return { error: "Only the tono creator can mark it fulfilled." };
  }
  if (tono.status === "fulfilled") {
    return { error: "Tono is already marked fulfilled." };
  }
  if (tono.status === "closed" || tono.status === "withdrawn") {
    return { error: `Tono is ${tono.status} — cannot be fulfilled.` };
  }

  // ----- Find the accepted proposal -----
  const { data: acceptedProposal } = await supabase
    .from("tono_proposals")
    .select("id, proposer_id")
    .eq("tono_id", tonoId)
    .eq("status", "accepted")
    .maybeSingle();

  const proposerId = acceptedProposal?.proposer_id ?? null;

  // ----- Update tono to fulfilled -----
  const { error: updateErr } = await supabase
    .from("tono")
    .update({
      status: "fulfilled",
      fulfilled_by: proposerId,
      fulfilled_at: new Date().toISOString(),
      closed_at: new Date().toISOString(),
    })
    .eq("id", tonoId);
  if (updateErr) {
    return { error: `Could not mark fulfilled: ${updateErr.message}` };
  }

  // ----- Auto-create co_creator endorsement if linked to a work -----
  // Failure-tolerant per the runbook. The tono fulfillment is sacred;
  // the endorsement is derived state.
  let endorsementsCreated = 0;
  if (proposerId && tono.work_id) {
    try {
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("endorsements")
        .select("id")
        .eq("endorser_id", user.id)
        .eq("recipient_id", proposerId)
        .eq("work_id", tono.work_id)
        .eq("endorsement_type", "co_creator")
        .maybeSingle();

      if (!existing) {
        const { data: insEnd, error: endErr } = await admin
          .from("endorsements")
          .insert({
            recipient_id: proposerId,
            endorser_id: user.id,
            work_id: tono.work_id,
            work_type: "release",
            endorsement_type: "co_creator",
            notes: note
              ? `Tono fulfilled — ${note}`
              : "Tono fulfilled. Co-created this release.",
          })
          .select("id")
          .single();

        if (!endErr && insEnd) {
          endorsementsCreated = 1;
          // Bump contribution_count
          const { data: cur } = await admin
            .from("profiles")
            .select("contribution_count")
            .eq("id", proposerId)
            .single();
          if (cur) {
            await admin
              .from("profiles")
              .update({ contribution_count: (cur.contribution_count ?? 0) + 1 })
              .eq("id", proposerId);
          }
        }
      }
    } catch (e) {
      console.error(`Tono-fulfillment auto-endorse failed for tono ${tonoId}:`, e);
    }
  }

  // ----- Notify proposer -----
  if (proposerId) {
    await notify({
      recipient_id: proposerId,
      kind: "tono_fulfilled",
      payload: {
        tono_id: tonoId,
        endorsement_created: endorsementsCreated > 0,
      },
    });
  }

  revalidatePath(`/tono/${tonoId}`);
  revalidatePath("/tono");
  revalidatePath(`/[locale]/artist/${proposerId ?? user.id}`, "page");
  revalidatePath(`/[locale]/waiata`, "page");

  return {
    success:
      endorsementsCreated > 0
        ? "Tono fulfilled. Your collaborator has been endorsed on this work and notified."
        : proposerId
          ? "Tono fulfilled. The proposer has been notified."
          : "Tono fulfilled.",
    tonoId,
    endorsementsCreated,
  };
}

/* -------------------------------------------------------------------------- */
/* 5. withdrawTonoAction                                                      */
/* -------------------------------------------------------------------------- */

export async function withdrawTonoAction(
  _prev: TonoState | null,
  formData: FormData,
): Promise<TonoState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  const tonoId = String(formData.get("tono_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!tonoId) return { error: "Tono id required." };

  const { data: tono, error: tErr } = await supabase
    .from("tono")
    .select("id, creator_id, status")
    .eq("id", tonoId)
    .maybeSingle();
  if (tErr) return { error: `Tono lookup failed: ${tErr.message}` };
  if (!tono) return { error: "Tono not found." };
  if (tono.creator_id !== user.id) {
    return { error: "Only the tono creator can withdraw." };
  }
  if (tono.status === "withdrawn") {
    return { error: "Tono is already withdrawn." };
  }
  if (tono.status === "fulfilled") {
    return { error: "Cannot withdraw a fulfilled tono." };
  }

  const { error: updateErr } = await supabase
    .from("tono")
    .update({
      status: "withdrawn",
      closed_at: new Date().toISOString(),
    })
    .eq("id", tonoId);
  if (updateErr) {
    return { error: `Could not withdraw tono: ${updateErr.message}` };
  }

  // Decline any open proposals with the reason appended
  const declineReason = reason ? `Tono withdrawn: ${reason}` : "Tono withdrawn by creator.";
  await supabase
    .from("tono_proposals")
    .update({
      status: "declined",
      decided_at: new Date().toISOString(),
      decline_reason: declineReason,
    })
    .eq("tono_id", tonoId)
    .eq("status", "pending");

  revalidatePath(`/tono/${tonoId}`);
  revalidatePath("/tono");
  revalidatePath("/tono/inbox");

  return {
    success: "Tono withdrawn. Open proposals have been declined with the reason recorded.",
    tonoId,
  };
}

/* -------------------------------------------------------------------------- */
/* 6. closeTonoAction (closed without fulfilling — "no longer needed")         */
/* -------------------------------------------------------------------------- */

export async function closeTonoAction(
  _prev: TonoState | null,
  formData: FormData,
): Promise<TonoState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  const tonoId = String(formData.get("tono_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!tonoId) return { error: "Tono id required." };

  const { data: tono, error: tErr } = await supabase
    .from("tono")
    .select("id, creator_id, status")
    .eq("id", tonoId)
    .maybeSingle();
  if (tErr) return { error: `Tono lookup failed: ${tErr.message}` };
  if (!tono) return { error: "Tono not found." };
  if (tono.creator_id !== user.id) {
    return { error: "Only the tono creator can close." };
  }
  if (tono.status === "fulfilled" || tono.status === "withdrawn") {
    return { error: `Tono is ${tono.status} — cannot be closed.` };
  }

  const { error: updateErr } = await supabase
    .from("tono")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .eq("id", tonoId);
  if (updateErr) {
    return { error: `Could not close tono: ${updateErr.message}` };
  }

  const declineReason = reason ? `Tono closed: ${reason}` : "Tono closed by creator.";
  await supabase
    .from("tono_proposals")
    .update({
      status: "declined",
      decided_at: new Date().toISOString(),
      decline_reason: declineReason,
    })
    .eq("tono_id", tonoId)
    .eq("status", "pending");

  revalidatePath(`/tono/${tonoId}`);
  revalidatePath("/tono");

  return {
    success: "Tono closed. Open proposals have been declined.",
    tonoId,
  };
}
