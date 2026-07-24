"use server";

/**
 * Notification preferences — server action.
 *
 * Stores per-kind (in_app, email) toggles on profiles.notification_prefs.
 * Auth-required: only the user themselves can update their prefs.
 *
 * v1.1: in_app channel is consumed (the notifications table is read by the
 * bell + inbox page). The email channel is read-only here; the actual
 * fanout ships when Resend lands (deferred from v1.1 plan).
 *
 * Input: a single JSON-string formData field `prefs` containing the full
 * prefs object. We use a JSON string instead of individual hidden inputs
 * because the object is dynamic and not bound to a fixed form shape.
 */

import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/lib/supabase/clients";
import {
  normaliseNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications/prefs";

export interface NotificationPrefsState {
  error?: string;
  success?: string;
}

export async function updateNotificationPrefsAction(
  _prev: NotificationPrefsState | null,
  formData: FormData,
): Promise<NotificationPrefsState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const raw = String(formData.get("prefs") ?? "").trim();
  if (!raw) return { error: "No preferences payload received." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Preferences payload is not valid JSON." };
  }

  const normalised = normaliseNotificationPrefs(parsed);

  // Write to the user's own row. RLS: profiles_update_self should permit
  // updating notification_prefs on the user's own id.
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ notification_prefs: normalised })
    .eq("id", user.id);

  if (updateErr) {
    return { error: `Could not save preferences: ${updateErr.message}` };
  }

  revalidatePath("/notifications");
  revalidatePath("/notifications/preferences");
  return { success: "Preferences saved." };
}
