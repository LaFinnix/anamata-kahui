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
 * Returns a discriminated union (decision-result), not redirect.
 * UI components consume the result to show success / error inline.
 */

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/clients";

export type CulturalDecision = "approved" | "rejected";

export interface CulturalReviewState {
  error?: string;
  success?: string;
  decision?: CulturalDecision;
  cycleId?: string;
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

  // Verify release exists
  const { data: release, error: relErr } = await supabase
    .from("releases")
    .select("id, title")
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

  revalidatePath("/admin/kaitiaki");
  revalidatePath(`/admin/kaitiaki/${releaseId}`);
  revalidatePath(`/en/waiata/${releaseId}`);
  revalidatePath(`/mi/waiata/${releaseId}`);

  return {
    success:
      decision === "approved"
        ? `Approved "${release.title}". The release can now move to scheduled or released.`
        : `Rejected "${release.title}". The release cannot be scheduled or released until approved.`,
    decision,
    cycleId: cycle.id,
  };
}