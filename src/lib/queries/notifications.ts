/**
 * Notifications queries — read-only access for the dashboard.
 *
 * RLS handles per-user access (notifications_select_own policy).
 * Write paths (insert) live in the server actions which use admin client.
 */

import { createServerSupabase } from "@/lib/supabase/clients";
import type { NotificationRow, NotificationKind } from "@/lib/notifications/types";

/** Load the most recent N notifications for the current user. */
export async function listMyNotifications(opts?: {
  limit?: number;
  unreadOnly?: boolean;
  kind?: NotificationKind;
}): Promise<NotificationRow[]> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("notifications")
    .select("id, recipient_id, kind, payload, read_at, created_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50);

  if (opts?.unreadOnly) {
    query = query.is("read_at", null);
  }
  if (opts?.kind) {
    query = query.eq("kind", opts.kind);
  }

  const { data, error } = await query;
  if (error) {
    console.error("listMyNotifications:", error.message);
    return [];
  }
  return (data ?? []) as NotificationRow[];
}

/** Unread count — used by the header bell badge. */
export async function countUnreadNotifications(): Promise<number> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("countUnreadNotifications:", error.message);
    return 0;
  }
  return count ?? 0;
}
