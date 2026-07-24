"use server";

/**
 * Demos — server actions.
 *
 * Auth rules:
 *   - uploadDemoAction: artist (must own the roster row)
 *   - submitForReviewAction: artist (own demo)
 *   - approveDemoAction: kaitiaki / branch_admin
 *   - rejectDemoAction: kaitiaki / branch_admin
 *   - promoteDemoAction: branch_admin (creates a release — currently stubbed
 *     since release creation is a future phase; just flips status to promoted)
 *
 * The actual file storage (uploading the audio/image to Supabase
 * Storage) happens on the client BEFORE these actions are called.
 * The action receives the storage path + metadata; this keeps the
 * server action fast and stateless.
 */

import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/lib/supabase/clients";
import { canDemoTransition, DEMO_STATUSES, type DemoStatus } from "./types";

/* -------------------------------------------------------------------------- */
/* ActionState shape                                                          */
/* -------------------------------------------------------------------------- */

export interface DemoActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  demoId?: string;
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

async function isKaitiakiOrAdmin(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
  branchId: string,
): Promise<{ allowed: boolean; error?: string }> {
  // Super admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (profile?.role === "super_admin") return { allowed: true };

  // Branch admin
  const { data: ub } = await supabase
    .from("user_branches")
    .select("role")
    .eq("user_id", userId)
    .eq("branch_id", branchId)
    .in("role", ["admin", "editor"])
    .maybeSingle();
  if (ub) return { allowed: true };

  // Kaitiaki role (can review, but not promote)
  if (profile?.role === "kaitiaki") return { allowed: true };

  return { allowed: false, error: "Not authorised to review demos." };
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

/** Upload a demo. The file has already been uploaded to Supabase Storage
 *  on the client side; this just records the metadata. */
export async function uploadDemoAction(
  _prev: DemoActionState,
  formData: FormData,
): Promise<DemoActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const artistRosterId = asString(formData.get("artist_roster_id"));
  const title = asString(formData.get("title"));
  const description = asString(formData.get("description")) || null;
  const filePath = asString(formData.get("file_path"));
  const fileMime = asString(formData.get("file_mime"));
  const fileSize = parseInt(asString(formData.get("file_size_bytes")) || "0", 10);
  const fileDuration = asString(formData.get("file_duration_seconds"));
  const fileDurationSec = fileDuration ? parseInt(fileDuration, 10) : null;

  const fieldErrors: Record<string, string[]> = {};
  if (!isUuid(artistRosterId)) fieldErrors.artist_roster_id = ["artist_roster_id must be a uuid"];
  if (!title) fieldErrors.title = ["title is required"];
  if (title.length > 200) fieldErrors.title = ["title must be 200 characters or fewer"];
  if (!filePath) fieldErrors.file_path = ["file_path is required"];
  if (!fileMime) fieldErrors.file_mime = ["file_mime is required"];
  if (isNaN(fileSize) || fileSize < 0) fieldErrors.file_size_bytes = ["file_size_bytes must be >= 0"];
  if (fileDurationSec !== null && (isNaN(fileDurationSec) || fileDurationSec < 0)) {
    fieldErrors.file_duration_seconds = ["file_duration_seconds must be >= 0"];
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
    return { ok: false, error: "Only the artist on the roster can upload demos." };
  }

  const { data, error } = await supabase
    .from("demos")
    .insert({
      artist_roster_id: artistRosterId,
      title,
      description,
      file_path: filePath,
      file_mime: fileMime,
      file_size_bytes: fileSize,
      file_duration_seconds: fileDurationSec,
      status: "draft",
      created_by: user.id,
      last_modified_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/kaikorero/roster");
  revalidatePath("/admin/demos");
  return { ok: true, demoId: data.id };
}

/** Artist submits a draft demo for cultural review. */
export async function submitForReviewAction(
  _prev: DemoActionState,
  formData: FormData,
): Promise<DemoActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const demoId = asString(formData.get("demo_id"));
  if (!isUuid(demoId)) return { ok: false, error: "demo_id must be a uuid" };

  const { data: demo, error: readErr } = await supabase
    .from("demos")
    .select(`
      id, status,
      roster:artist_roster!demos_artist_roster_id_fkey (profile_id)
    `)
    .eq("id", demoId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!demo) return { ok: false, error: "Demo not found." };

  // Verify ownership
  const rosterArr = (demo.roster as unknown) as
    | { profile_id: string }
    | { profile_id: string }[]
    | null;
  const profileId = Array.isArray(rosterArr) ? rosterArr[0]?.profile_id : rosterArr?.profile_id;
  if (profileId !== user.id) {
    return { ok: false, error: "Only the artist who uploaded the demo can submit it for review." };
  }

  if (!canDemoTransition(demo.status as DemoStatus, "pending_review")) {
    return {
      ok: false,
      error: `Cannot transition from "${demo.status}" to "pending_review".`,
    };
  }

  const { error } = await supabase
    .from("demos")
    .update({ status: "pending_review", last_modified_by: user.id })
    .eq("id", demoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/kaikorero/roster");
  revalidatePath("/admin/demos");
  return { ok: true, demoId };
}

/** Kaitiaki / branch admin approves a demo. */
export async function approveDemoAction(
  _prev: DemoActionState,
  formData: FormData,
): Promise<DemoActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const demoId = asString(formData.get("demo_id"));
  const reviewNotes = asString(formData.get("review_notes")) || null;

  if (!isUuid(demoId)) return { ok: false, error: "demo_id must be a uuid" };

  const { data: demo, error: readErr } = await supabase
    .from("demos")
    .select(`
      id, status,
      roster:artist_roster!demos_artist_roster_id_fkey (branch_id)
    `)
    .eq("id", demoId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!demo) return { ok: false, error: "Demo not found." };

  const branchId = (demo.roster as unknown as { branch_id: string }).branch_id;
  const guard = await isKaitiakiOrAdmin(supabase, user.id, branchId);
  if (!guard.allowed) return { ok: false, error: guard.error };

  if (!canDemoTransition(demo.status as DemoStatus, "approved")) {
    return { ok: false, error: `Cannot transition from "${demo.status}" to "approved".` };
  }

  const { error } = await supabase
    .from("demos")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
      last_modified_by: user.id,
    })
    .eq("id", demoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/kaikorero/roster");
  revalidatePath("/admin/demos");
  return { ok: true, demoId };
}

/** Kaitiaki / branch admin rejects a demo. */
export async function rejectDemoAction(
  _prev: DemoActionState,
  formData: FormData,
): Promise<DemoActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const demoId = asString(formData.get("demo_id"));
  const reviewNotes = asString(formData.get("review_notes")) || null;

  if (!isUuid(demoId)) return { ok: false, error: "demo_id must be a uuid" };

  const { data: demo, error: readErr } = await supabase
    .from("demos")
    .select(`
      id, status,
      roster:artist_roster!demos_artist_roster_id_fkey (branch_id)
    `)
    .eq("id", demoId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!demo) return { ok: false, error: "Demo not found." };

  const branchId = (demo.roster as unknown as { branch_id: string }).branch_id;
  const guard = await isKaitiakiOrAdmin(supabase, user.id, branchId);
  if (!guard.allowed) return { ok: false, error: guard.error };

  if (!canDemoTransition(demo.status as DemoStatus, "rejected")) {
    return { ok: false, error: `Cannot transition from "${demo.status}" to "rejected".` };
  }

  const { error } = await supabase
    .from("demos")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
      last_modified_by: user.id,
    })
    .eq("id", demoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/kaikorero/roster");
  revalidatePath("/admin/demos");
  return { ok: true, demoId };
}

/** Branch admin promotes an approved demo. In a future phase this
 *  will also create a release row. For now, just flips the status. */
export async function promoteDemoAction(
  _prev: DemoActionState,
  formData: FormData,
): Promise<DemoActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const demoId = asString(formData.get("demo_id"));
  if (!isUuid(demoId)) return { ok: false, error: "demo_id must be a uuid" };

  const { data: demo, error: readErr } = await supabase
    .from("demos")
    .select(`
      id, status,
      roster:artist_roster!demos_artist_roster_id_fkey (branch_id)
    `)
    .eq("id", demoId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!demo) return { ok: false, error: "Demo not found." };

  const branchId = (demo.roster as unknown as { branch_id: string }).branch_id;
  // Only branch_admin / super_admin can promote (not just kaitiaki)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isSuper = profile?.role === "super_admin";
  let isBranchAdmin = false;
  if (!isSuper) {
    const { data: ub } = await supabase
      .from("user_branches")
      .select("role")
      .eq("user_id", user.id)
      .eq("branch_id", branchId)
      .in("role", ["admin", "editor"])
      .maybeSingle();
    isBranchAdmin = !!ub;
  }
  if (!isSuper && !isBranchAdmin) {
    return { ok: false, error: "Only branch admins can promote demos." };
  }

  if (!canDemoTransition(demo.status as DemoStatus, "promoted")) {
    return { ok: false, error: `Cannot transition from "${demo.status}" to "promoted".` };
  }

  const { error } = await supabase
    .from("demos")
    .update({
      status: "promoted",
      last_modified_by: user.id,
    })
    .eq("id", demoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/kaikorero/roster");
  revalidatePath("/admin/demos");
  revalidatePath("/admin/releases");
  return { ok: true, demoId };
}
