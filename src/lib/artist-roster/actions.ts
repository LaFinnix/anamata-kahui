"use server";

/**
 * Artist roster — server actions.
 *
 * Auth-required: only super_admin or branch_admin of the relevant
 * branch can write. RLS policies also enforce this at the DB layer.
 *
 * Pattern follows the existing actions in src/lib/actions/ (tono.ts,
 * endorsements.ts): plain validation, no external schema lib. Each
 * action returns a RosterActionState suitable for useActionState.
 */

import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/lib/supabase/clients";
import { canTransition, ROSTER_STATUSES, type RosterStatus } from "./types";

/* -------------------------------------------------------------------------- */
/* ActionState shape                                                          */
/* -------------------------------------------------------------------------- */

export interface RosterActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  rosterId?: string;
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

async function requireBranchAdmin(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
  branchId: string,
) {
  // RLS would catch this too, but a clean up-front check gives better error messages.
  const { data, error } = await supabase
    .from("user_branches")
    .select("role")
    .eq("user_id", userId)
    .eq("branch_id", branchId)
    .in("role", ["admin", "editor"])
    .maybeSingle();
  if (error) return { allowed: false, error: error.message } as const;
  if (!data) return { allowed: false, error: "Not a branch admin for this branch." } as const;
  return { allowed: true, error: null } as const;
}

/** Parse a FormData value into a boolean checkbox state. */
function parseBool(v: FormDataEntryValue | null): boolean {
  if (typeof v !== "string") return false;
  return v === "on" || v === "true" || v === "1";
}

function asString(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

/** Create a new roster entry. Defaults to status='prospect' on first
 *  call; the admin moves it to 'active' via changeRosterStatusAction. */
export async function createRosterEntryAction(
  _prev: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  // Field-level validation
  const profileId = asString(formData.get("profile_id"));
  const branchId = asString(formData.get("branch_id"));
  const statusRaw = asString(formData.get("status")) || "prospect";
  const fieldErrors: Record<string, string[]> = {};

  if (!isUuid(profileId)) fieldErrors.profile_id = ["profile_id must be a uuid"];
  if (!isUuid(branchId)) fieldErrors.branch_id = ["branch_id must be a uuid"];
  if (!(ROSTER_STATUSES as readonly string[]).includes(statusRaw)) {
    fieldErrors.status = [`status must be one of: ${ROSTER_STATUSES.join(", ")}`];
  }
  const roleSummary = asString(formData.get("role_summary")) || null;
  if (roleSummary && roleSummary.length > 500) {
    fieldErrors.role_summary = ["role_summary must be 500 characters or fewer"];
  }
  const internalNotes = asString(formData.get("internal_notes")) || null;
  if (internalNotes && internalNotes.length > 5000) {
    fieldErrors.internal_notes = ["internal_notes must be 5000 characters or fewer"];
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const guard = await requireBranchAdmin(supabase, user.id, branchId);
  if (!guard.allowed) return { ok: false, error: guard.error };

  const { data, error } = await supabase
    .from("artist_roster")
    .insert({
      profile_id: profileId,
      branch_id: branchId,
      status: statusRaw as RosterStatus,
      role_summary: roleSummary,
      on_roster_publicly: parseBool(formData.get("on_roster_publicly")),
      opted_in_public: parseBool(formData.get("opted_in_public")),
      internal_notes: internalNotes,
      created_by: user.id,
      status_changed_by: user.id,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "An active roster entry already exists for this artist on this branch.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/admin/records");
  return { ok: true, rosterId: data.id };
}

/** Change the status of a roster entry. Validates the transition is
 *  allowed by the state machine. */
export async function changeRosterStatusAction(
  _prev: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const rosterId = asString(formData.get("roster_id"));
  const newStatus = asString(formData.get("new_status")) as RosterStatus;
  const fieldErrors: Record<string, string[]> = {};
  if (!isUuid(rosterId)) fieldErrors.roster_id = ["roster_id must be a uuid"];
  if (!(ROSTER_STATUSES as readonly string[]).includes(newStatus)) {
    fieldErrors.new_status = [`new_status must be one of: ${ROSTER_STATUSES.join(", ")}`];
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  // Read current row to get branch_id + current status
  const { data: current, error: readError } = await supabase
    .from("artist_roster")
    .select("status, branch_id")
    .eq("id", rosterId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!current) return { ok: false, error: "Roster entry not found." };

  const guard = await requireBranchAdmin(supabase, user.id, current.branch_id);
  if (!guard.allowed) return { ok: false, error: guard.error };

  if (!canTransition(current.status as RosterStatus, newStatus)) {
    return {
      ok: false,
      error: `Cannot transition from "${current.status}" to "${newStatus}".`,
    };
  }

  const departedReason = asString(formData.get("departed_reason")) || null;

  const update: Record<string, unknown> = {
    status: newStatus,
    status_changed_at: new Date().toISOString(),
    status_changed_by: user.id,
  };
  if (newStatus === "departed") {
    update.departed_at = new Date().toISOString();
    update.departed_reason = departedReason;
  }

  const { error } = await supabase
    .from("artist_roster")
    .update(update)
    .eq("id", rosterId);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "An active roster entry already exists for this artist on this branch.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/admin/records");
  return { ok: true, rosterId };
}

/** Update public visibility flags. */
export async function updateRosterVisibilityAction(
  _prev: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const rosterId = asString(formData.get("roster_id"));
  if (!isUuid(rosterId)) return { ok: false, error: "roster_id must be a uuid" };

  const { data: current, error: readError } = await supabase
    .from("artist_roster")
    .select("branch_id")
    .eq("id", rosterId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!current) return { ok: false, error: "Roster entry not found." };

  const guard = await requireBranchAdmin(supabase, user.id, current.branch_id);
  if (!guard.allowed) return { ok: false, error: guard.error };

  const { error } = await supabase
    .from("artist_roster")
    .update({
      on_roster_publicly: parseBool(formData.get("on_roster_publicly")),
      opted_in_public: parseBool(formData.get("opted_in_public")),
    })
    .eq("id", rosterId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/records");
  revalidatePath("/artist");
  return { ok: true, rosterId };
}

/** Update internal notes (admin-only). */
export async function updateRosterNotesAction(
  _prev: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  const { supabase, user, error: userError } = await requireUser();
  if (userError || !user) return { ok: false, error: userError ?? "Not signed in." };

  const rosterId = asString(formData.get("roster_id"));
  const notes = asString(formData.get("internal_notes")) || null;
  if (!isUuid(rosterId)) return { ok: false, error: "roster_id must be a uuid" };
  if (notes && notes.length > 5000) {
    return { ok: false, error: "internal_notes must be 5000 characters or fewer" };
  }

  const { data: current, error: readError } = await supabase
    .from("artist_roster")
    .select("branch_id")
    .eq("id", rosterId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!current) return { ok: false, error: "Roster entry not found." };

  const guard = await requireBranchAdmin(supabase, user.id, current.branch_id);
  if (!guard.allowed) return { ok: false, error: guard.error };

  const { error } = await supabase
    .from("artist_roster")
    .update({ internal_notes: notes })
    .eq("id", rosterId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/records");
  return { ok: true, rosterId };
}
