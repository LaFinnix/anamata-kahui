/**
 * GET /api/cron/auto-expire-tonos
 *
 * Calls the SECURITY DEFINER `auto_expire_tonos()` function which:
 *   1. Finds open tono where expires_at < now()
 *   2. Declines any pending proposals on those tono with reason "Tono expired."
 *   3. Flips the tono to status='closed' with closed_at=now()
 *
 * Idempotent — safe to call repeatedly.
 *
 * Auth: requires CRON_SECRET in the Authorization: Bearer header.
 *
 * Schedule: register with Vercel cron (or whichever scheduler) for once
 * per day, e.g. 00:00 UTC. The function is fast (single UPDATE per
 * affected row) so the cost is negligible.
 *
 * Returns:
 *   {
 *     ok: true,
 *     expired: <number>,        // tono closed
 *     declined_proposals: <number>  // pending proposals auto-declined
 *   }
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/clients";

export const dynamic = "force-dynamic";

async function isAuthorized(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();

  // Call the SECURITY DEFINER function via RPC.
  const { data: expired, error: funcErr } = await supabase.rpc(
    "auto_expire_tonos" as never,
  );

  if (funcErr) {
    return new NextResponse(`function error: ${funcErr.message}`, { status: 500 });
  }

  const expiredCount = (expired as number | null) ?? 0;

  // After closure, we also need to know how many proposals were declined.
  // The function returns only the tono count; the proposal declines happen
  // inside the function. We don't have a separate counter, so we report
  // the tono count and let callers trust the function's side effects.
  //
  // If a future iteration needs the proposal count, the function should
  // return a jsonb with both fields.

  return NextResponse.json({
    ok: true,
    expired: expiredCount,
    declined_proposals: null, // not surfaced; function handles it
  });
}

// Also accept POST for cron runners that don't support GET-with-body.
export async function POST(request: Request) {
  return GET(request);
}
