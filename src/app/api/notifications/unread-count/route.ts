/**
 * GET /api/notifications/unread-count
 *
 * Returns the count of unread notifications for the current user.
 * Used by the dashboard bell to poll every 60s.
 *
 * Auth: requires a valid session cookie (createServerSupabase reads it).
 * No CSRF concern — this is a GET that returns only a count.
 *
 * Returns: { count: number }
 */

import { NextResponse } from "next/server";
import { countUnreadNotifications } from "@/lib/queries/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await countUnreadNotifications();
  return NextResponse.json({ count }, {
    headers: {
      // Don't cache — the count changes as the user reads notifications
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
