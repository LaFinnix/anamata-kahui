"use server";

/**
 * Cultural review server action.
 *
 * Records an approve/reject decision in `cultural_review_cycles`
 * (append-only audit log) and updates `releases.cultural_review_status`.
 *
 * Authorization:
 *   - profiles.role must be in ('kaitiaki', 'super_admin')
 *   - RLS on cultural_review_cycles enforces this server-side
 *   - The append-only trigger blocks UPDATE / DELETE
 *
 * On APPROVAL with split_participants: auto-creates one endorsement per
 * registered participant (work-anchored, type='co_creator', from the
 * release's artist_id). Failure here does NOT undo the cultural-review
 * decision — the audit row is sacred. Endorsements are derived state.
 *
 * Returns a discriminated union (decision-result), not redirect.
 * UI components consume the result to show success / error inline.
 */

import { revalidatePath } from "next/cache";
import { createAdminClient, createServerSupabase } from "@/lib/supabase/clients";

export type CulturalDecision = "approved" | "rejected";

export interface CulturalReviewState {
  error?: string;
  success?: string;
  decision?: CulturalDecision;
  cycleId?: string;
  /** Number of endorsements auto-created on approval */
  endorsementsCreated?: number;
}

export async function recordCulturalReviewAction(
  _prev: CulturalReviewState | null,
  formData: FormData,
): Promise<CulturalReviewState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // Authorize
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role;
  if (role !== "kaitiaki" && role !== "super_admin") {
    return {
      error: `Cultural review requires kaitiaki or super_admin role. Your role is "${role ?? "none"}".`,
    };
  }

  // Parse + validate input
  const releaseId = String(formData.get("release_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "") as CulturalDecision;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const parentCycleIdRaw = String(formData.get("parent_cycle_id") ?? "").trim();
  const parentCycleId = parentCycleIdRaw || null;

  if (!releaseId) return { error: "Release id required." };
  if (decision !== "approved" && decision !== "rejected") {
    return { error: "Decision must be 'approved' or 'rejected'." };
  }

  // Verify release exists — also pull artist_id for endorsement creation
  const { data: release, error: relErr } = await supabase
    .from("releases")
    .select("id, title, artist_id")
    .eq("id", releaseId)
    .maybeSingle();
  if (relErr) return { error: `Release lookup failed: ${relErr.message}` };
  if (!release) return { error: "Release not found." };

  // Insert the cultural review cycle.
  // RLS enforces role check + kaitiaki_id = auth.uid().
  const { data: cycle, error: cycleErr } = await supabase
    .from("cultural_review_cycles")
    .insert({
      release_id: releaseId,
      kaitiaki_id: user.id,
      decision,
      notes,
      parent_cycle_id: parentCycleId,
    })
    .select("id")
    .single();

  if (cycleErr) {
    return {
      error: `Could not record decision: ${cycleErr.message}. Make sure your account has the kaitiaki role.`,
    };
  }

  // Update the release's cultural_review_status.
  // The append-only trigger on cultural_review_cycles prevents editing
  // that audit row, but releases.cultural_review_status is editable.
  const { error: updateErr } = await supabase
    .from("releases")
    .update({ cultural_review_status: decision })
    .eq("id", releaseId);

  if (updateErr) {
    return {
      error: `Decision recorded (cycle ${cycle.id}) but status update failed: ${updateErr.message}. The audit row exists; the status column may need a manual fix.`,
      decision,
      cycleId: cycle.id,
    };
  }

  // ----- Auto-endorse collaborators on approval -----
  // Per docs/COLLABORATION-MARKETPLACE-PLAN.md §Phase 2 task #2:
  // "When a work publishes with collaborators, the work's creator endorses
  // their collaborators in the contribution lineage. Helpers earn their
  // standing by being chosen by people who carry responsibility for the
  // outcome."
  //
  // We fetch the split_sheet → split_participants for this release and
  // create one endorsement per participant with profile_id NOT NULL
  // (external collaborators don't have a profile row to receive).
  //
  // Failure-tolerant: if the endorsement insert fails for any reason,
  // the cultural-review decision still stands. We log loudly so the issue
  // is visible but don't bubble it as an error to the kaitiaki.
  let endorsementsCreated = 0;
  if (decision === "approved") {
    try {
      const admin = createAdminClient();
      const { data: splitSheet } = await admin
        .from("split_sheets")
        .select("id")
        .eq("release_id", releaseId)
        .maybeSingle();

      if (splitSheet) {
        const { data: participants } = await admin
          .from("split_participants")
          .select("id, profile_id, role")
          .eq("split_sheet_id", splitSheet.id)
          .not("profile_id", "is", null);

        if (participants && participants.length > 0) {
          const rows = participants
            .filter((p) => p.profile_id !== release.artist_id) // don't self-endorse
            .map((p) => ({
              recipient_id: p.profile_id as string,
              endorser_id: release.artist_id,
              work_id: releaseId,
              work_type: "release" as const,
              endorsement_type: "co_creator" as const,
              notes: `Cultural review approved — co-creator on "${release.title}".`,
            }));

          if (rows.length > 0) {
            const { data: created, error: endErr } = await admin
              .from("endorsements")
              .insert(rows)
              .select("id");

            if (endErr) {
              console.error(
                `Auto-endorsement insert failed for release ${releaseId}: ${endErr.message}`,
              );
            } else {
              endorsementsCreated = created?.length ?? 0;

              // Bump each recipient's contribution_count (best-effort)
              for (const r of rows) {
                try {
                  const { data: cur } = await admin
                    .from("profiles")
                    .select("contribution_count")
                    .eq("id", r.recipient_id)
                    .single();
                  if (cur) {
                    await admin
                      .from("profiles")
                      .update({
                        contribution_count: (cur.contribution_count ?? 0) + 1,
                      })
                      .eq("id", r.recipient_id);
                  }
                } catch (e) {
                  console.error(
                    `contribution_count bump failed for ${r.recipient_id}:`,
                    e,
                  );
                }
              }

              // Notify each recipient
              for (const r of rows) {
                await admin.from("notifications").insert({
                  recipient_id: r.recipient_id,
                  kind: "endorsement_received",
                  payload: {
                    endorsement_type: "co_creator",
                    work_id: releaseId,
                    endorser_id: release.artist_id,
                    source: "cultural_review_approval",
                  },
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(
        `Auto-endorse on cultural-review approval failed for release ${releaseId}:`,
        e,
      );
    }
  }

  revalidatePath("/admin/kaitiaki");
  revalidatePath(`/admin/kaitiaki/${releaseId}`);
  revalidatePath(`/en/waiata/${releaseId}`);
  revalidatePath(`/mi/waiata/${releaseId}`);

  return {
    success:
      decision === "approved"
        ? endorsementsCreated > 0
          ? `Approved "${release.title}". ${endorsementsCreated} collaborator${endorsementsCreated === 1 ? "" : "s"} auto-endorsed.`
          : `Approved "${release.title}". The release can now move to scheduled or released.`
        : `Rejected "${release.title}". The release cannot be scheduled or released until approved.`,
    decision,
    cycleId: cycle.id,
    endorsementsCreated,
  };
}