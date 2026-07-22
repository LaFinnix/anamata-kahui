"use server";

/**
 * Local Contexts label actions.
 *
 * Apply and remove TK/BC/notice labels to releases and research documents.
 * Records append-only audit entries; updates the asset's provenance trail.
 */

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/clients";

export interface LabelActionState {
  error?: string;
  success?: string;
}

export async function applyLabelAction(
  _prev: LabelActionState | null,
  formData: FormData,
): Promise<LabelActionState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const labelSlug = String(formData.get("label_slug") ?? "");
  const releaseId = String(formData.get("release_id") ?? "") || null;
  const researchDocumentId = String(formData.get("research_document_id") ?? "") || null;
  const evidenceUrl = String(formData.get("evidence_url") ?? "").trim() || null;
  const scope = String(formData.get("scope") ?? "").trim() || null;

  if (!labelSlug) return { error: "Label slug required." };
  if (!releaseId && !researchDocumentId) {
    return { error: "Either release_id or research_document_id is required." };
  }

  // Look up the label UUID from the catalogue
  const { data: label, error: labelError } = await supabase
    .from("lc_labels")
    .select("id")
    .eq("slug", labelSlug)
    .single();
  if (labelError || !label) return { error: `Unknown label: ${labelSlug}` };

  // Insert (the unique partial index on (release_id, label_id) where status='active'
  // prevents duplicates). If a conflict happens, surface a friendly message.
  const { error: insertError } = await supabase
    .from("lc_label_links")
    .insert({
      release_id: releaseId,
      research_document_id: researchDocumentId,
      label_id: label.id,
      applied_by: user.id,
      evidence_url: evidenceUrl,
      scope,
      status: "active",
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "That label is already applied to this asset." };
    }
    return { error: insertError.message };
  }

  if (releaseId) {
    revalidatePath(`/releases/${releaseId}`);
    revalidatePath(`/waiata/[slug]`);
  }
  if (researchDocumentId) {
    revalidatePath(`/research/papers/${researchDocumentId}`);
  }

  return { success: "Label applied. Audit entry recorded." };
}

export async function removeLabelAction(
  _prev: LabelActionState | null,
  formData: FormData,
): Promise<LabelActionState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const linkId = String(formData.get("link_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!linkId) return { error: "Link id required." };

  // Update the link to status='removed' (soft delete; preserves audit trail)
  const { data: updated, error: updateError } = await supabase
    .from("lc_label_links")
    .update({ status: "removed" })
    .eq("id", linkId)
    .select("release_id, research_document_id")
    .single();
  if (updateError) return { error: updateError.message };

  // Record the audit entry
  const admin = (await import("@/lib/supabase/clients")).createAdminClient();
  await admin.from("lc_label_audit").insert({
    link_id: linkId,
    action: "removed",
    actor_id: user.id,
    reason,
  });

  if (updated?.release_id) {
    revalidatePath(`/releases/${updated.release_id}`);
  }
  if (updated?.research_document_id) {
    revalidatePath(`/research/papers/${updated.research_document_id}`);
  }

  return { success: "Label removed. Audit entry recorded." };
}
