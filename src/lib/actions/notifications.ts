"use server";

/**
 * Notifications — server actions for mark-as-read.
 *
 * Notifications are written by other server actions (endorsements, tono,
 * cultural-review) using the admin client. These actions only handle
 * recipient-side state changes (mark read, mark all read).
 *
 * Auth: requires auth.uid(); RLS enforces notifications_update_own.
 */

import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/lib/supabase/clients";
import type { NotificationActionState } from "@/lib/notifications/types";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: "Authentication required." as const };
  return { supabase, user, error: null };
}

/** Mark a single notification as read. */
export async function markNotificationReadAction(
  _prev: NotificationActionState | null,
  formData: FormData,
): Promise<NotificationActionState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Notification id required." };

  const { error: updateErr } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", user.id) // defence-in-depth; RLS also enforces
    .is("read_at", null); // only update if still unread (idempotent)

  if (updateErr) {
    return { error: `Could not mark notification read: ${updateErr.message}` };
  }

  revalidatePath("/notifications");
  revalidatePath("/", "layout"); // dashboard layout (bell badge)
  return { success: "Notification marked as read." };
}

/** Mark all of the current user's notifications as read. */
export async function markAllNotificationsReadAction(): Promise<NotificationActionState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user || !supabase) return { error: error ?? "Auth failed." };

  const { error: updateErr } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (updateErr) {
    return { error: `Could not mark all notifications read: ${updateErr.message}` };
  }

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { success: "All notifications marked as read." };
}
