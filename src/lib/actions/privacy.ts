"use server";

/**
 * Privacy controls — server actions for data subject rights.
 *
 * Implements the rights under NZ Privacy Act 2020 IPP 6 + 7:
 *   - Request a copy of your data
 *   - Request deletion
 *   - Withdraw consent
 *   - Manage cookie preferences
 *
 * Authenticated users only — actions take auth.uid() and operate on the
 * caller's own profile. Anon requests are rejected at the action boundary.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase, createAdminClient } from "@/lib/supabase/clients";

export interface PrivacyActionState {
  error?: string;
  success?: string;
  /** Echoed back for download links (only set on export) */
  exportJson?: string;
}

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: "Authentication required." as const };
  return { supabase, user, error: null };
}

export async function exportMyDataAction(
  _prev: PrivacyActionState,
): Promise<PrivacyActionState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  // Pull every table row keyed by user.id (or user_id for junction tables).
  // Done via admin client so RLS doesn't filter — exporting your own data
  // shouldn't be limited by what role you happen to have.
  const admin = createAdminClient();

  const [
    profileResult,
    userBranchesResult,
    scholarshipEngagementsResult,
    contactEnquiriesResult,
    consentLogResult,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    admin.from("user_branches").select("*").eq("user_id", user.id),
    admin.from("scholarship_engagements").select("*").eq("recipient_profile_id", user.id),
    admin.from("contact_enquiries").select("*").eq("name", user.email ?? "__none__"),
    admin.from("consent_log").select("*").eq("actor_id", user.id),
  ]);

  const exportPayload = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile: profileResult.data,
    user_branches: userBranchesResult.data ?? [],
    scholarship_engagements: scholarshipEngagementsResult.data ?? [],
    contact_enquiries: contactEnquiriesResult.data ?? [],
    consent_log_entries: consentLogResult.data ?? [],
  };

  return {
    success: `Export ready. ${
      (exportPayload.profile ? 1 : 0) +
      (exportPayload.user_branches?.length ?? 0) +
      (exportPayload.scholarship_engagements?.length ?? 0)
    } rows included.`,
    exportJson: JSON.stringify(exportPayload, null, 2),
  };
}

export async function requestDeletionAction(
  _prev: PrivacyActionState,
  formData: FormData,
): Promise<PrivacyActionState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== user.email) {
    return {
      error: `Type your email address (${user.email}) in the confirm field to request deletion.`,
    };
  }

  // Log the request first — append-only audit trail. Then mark the profile
  // so it doesn't show up in public directories. Hard delete is delayed
  // 30 days for soft-recovery (matches Privacy Act retention guidance).
  const admin = createAdminClient();

  await admin.from("data_governance_log").insert({
    category: "consent",
    title: `Data subject deletion request`,
    body: `User ${user.id} (${user.email}) requested deletion on ${new Date().toISOString()}. Will be processed within 30 days.`,
    effective_at: new Date().toISOString(),
    published: false,
  });

  await admin
    .from("profiles")
    .update({
      data_deletion_requested_at: new Date().toISOString(),
      opted_in_public_directory: false,
    })
    .eq("id", user.id);

  // Sign out so the session ends — the account will be reviewed by an admin.
  await supabase.auth.signOut();

  return {
    success:
      "Deletion request logged. Your profile is hidden from public directories and you have been signed out. We'll process the request within 30 days and email you when complete.",
  };
}

export async function togglePublicDirectoryAction(
  _prev: PrivacyActionState,
  formData: FormData,
): Promise<PrivacyActionState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  const admin = createAdminClient();
  const desired = formData.get("opted_in") === "true";
  await admin
    .from("profiles")
    .update({ opted_in_public_directory: desired })
    .eq("id", user.id);

  revalidatePath("/privacy-controls");
  revalidatePath("/artist");
  return {
    success: desired
      ? "You're now listed in the public directory."
      : "You've been removed from the public directory.",
  };
}
