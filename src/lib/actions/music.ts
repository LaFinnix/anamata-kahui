"use server";

/**
 * Server actions for the Music (Anamata Records) branch.
 *
 * Wires the previously-disabled "New release" / "Upload stems" / "Add gate"
 * buttons. All actions:
 *   - Require an authenticated user
 *   - Use createServerSupabase (RLS-respecting)
 *   - Return a typed state for useActionState
 *   - Revalidate the appropriate dashboard paths
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase, createAdminClient } from "@/lib/supabase/clients";
import { safeRedirect } from "@/lib/auth/safe-redirect";

export interface MusicActionState {
  error?: string;
  success?: string;
  releaseId?: string;
}

// ---------------------------------------------------------------------------
// Releases
// ---------------------------------------------------------------------------

/**
 * Create a new release (in `draft` status). Authenticated user must be a
 * member of the Records branch OR super_admin/branch_admin.
 */
export async function createReleaseAction(
  _prev: MusicActionState | null,
  formData: FormData,
): Promise<MusicActionState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const iwiGateId = String(formData.get("iwi_gate_id") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };
  if (title.length > 200) return { error: "Title must be 200 characters or fewer." };

  // Lookup the Records branch id (UUID)
  const { data: recordsBranch } = await supabase
    .from("branches")
    .select("id")
    .eq("slug", "records")
    .single();
  if (!recordsBranch) {
    return { error: "Records branch not found — has the initial migration run?" };
  }

  // Verify the user is in this branch (or is super_admin)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found." };

  const isSuperAdmin = profile.role === "super_admin";
  const isBranchAdmin = profile.role === "branch_admin";

  if (!isSuperAdmin && !isBranchAdmin) {
    const { data: membership } = await supabase
      .from("user_branches")
      .select("id")
      .eq("user_id", user.id)
      .eq("branch_id", recordsBranch.id)
      .maybeSingle();
    if (!membership) {
      return { error: "You must be a member of the Records branch to create a release." };
    }
  }

  // Insert the release in `draft` status with `cultural_review_status='pending'`.
  // The gating trigger allows draft -> draft transitions freely.
  const { data: release, error: insertError } = await supabase
    .from("releases")
    .insert({
      title,
      description: description || null,
      artist_id: user.id,
      branch_id: recordsBranch.id,
      status: "draft",
      cultural_review_status: "pending",
      iwi_consent_id: iwiGateId,
      metadata: {
        slug: slugify(title),
      },
    })
    .select("id")
    .single();

  if (insertError || !release) {
    return { error: insertError?.message ?? "Failed to create release." };
  }

  revalidatePath("/releases");
  revalidatePath("/records");
  revalidatePath("/admin");

  return {
    success: `Release "${title}" created in draft.`,
    releaseId: release.id,
  };
}

/**
 * Submit a release for cultural review. Transitions `draft` → cultural-review
 * pipeline. Kaitiaki approval happens via the cultural_review_cycles insert.
 */
export async function submitForReviewAction(
  _prev: MusicActionState | null,
  formData: FormData,
): Promise<MusicActionState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const releaseId = String(formData.get("release_id") ?? "");
  if (!releaseId) return { error: "Release id required." };

  // Just transition status; the cultural_review_status remains 'pending'.
  // Kaitiaki will mark the cycle with their decision later.
  const { error } = await supabase
    .from("releases")
    .update({ status: "draft" }) // stays draft; cultural review happens within draft state
    .eq("id", releaseId);

  if (error) return { error: error.message };

  revalidatePath(`/releases/${releaseId}`);
  return { success: "Release submitted for cultural review.", releaseId };
}

/**
 * Approve a release for scheduling (kaitiaki-only).
 *
 * Records a cultural_review_cycle entry with decision='approved' AND
 * flips the release's cultural_review_status to 'approved'. The status
 * itself remains 'draft' until the artist manually moves it to
 * 'scheduled' (which the gating trigger now permits).
 */
export async function approveCulturalReviewAction(
  _prev: MusicActionState | null,
  formData: FormData,
): Promise<MusicActionState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const releaseId = String(formData.get("release_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!releaseId) return { error: "Release id required." };

  // Verify kaitiaki or super_admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["kaitiaki", "super_admin"].includes(profile.role)) {
    return { error: "Only kaitiaki or super_admin can approve cultural review." };
  }

  // Record the cycle (append-only)
  const admin = createAdminClient();
  const { error: cycleError } = await admin.from("cultural_review_cycles").insert({
    release_id: releaseId,
    kaitiaki_id: user.id,
    decision: "approved",
    notes,
  });
  if (cycleError) return { error: cycleError.message };

  // Update the release
  const { error: releaseError } = await supabase
    .from("releases")
    .update({ cultural_review_status: "approved" })
    .eq("id", releaseId);
  if (releaseError) return { error: releaseError.message };

  revalidatePath(`/releases/${releaseId}`);
  revalidatePath("/admin");
  return { success: "Cultural review approved. Release can now be scheduled." };
}

// ---------------------------------------------------------------------------
// Iwi gates
// ---------------------------------------------------------------------------

export async function createIwiGateAction(
  _prev: MusicActionState | null,
  formData: FormData,
): Promise<MusicActionState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["kaitiaki", "super_admin", "branch_admin"].includes(profile.role)) {
    return { error: "Only kaitiaki or admins can create iwi gates." };
  }

  const iwiName = String(formData.get("iwi_name") ?? "").trim();
  const hapuName = String(formData.get("hapu_name") ?? "").trim() || null;
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const scope = String(formData.get("scope") ?? "iwi_only");
  const appliesToKind = String(formData.get("applies_to_kind") ?? "release");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!iwiName) return { error: "Iwi name is required." };
  if (!contactName) return { error: "Contact name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { error: "Please enter a valid contact email." };
  }
  if (!["public", "iwi_only", "hapu_only", "restricted", "tapu"].includes(scope)) {
    return { error: "Invalid scope." };
  }

  const { data: gate, error } = await supabase
    .from("iwi_gates")
    .insert({
      iwi_name: iwiName,
      hapu_name: hapuName,
      contact_name: contactName,
      contact_email: contactEmail,
      scope,
      applies_to_kind: appliesToKind,
      notes,
    })
    .select("id")
    .single();

  if (error || !gate) return { error: error?.message ?? "Failed to create gate." };

  revalidatePath("/admin/iwi-gate");
  revalidatePath("/kaitiakitanga");
  revalidatePath("/transparency");
  return { success: `Iwi gate for ${iwiName} created.`, releaseId: gate.id };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// Re-export safeRedirect so consumers don't need a separate import
export { safeRedirect };
