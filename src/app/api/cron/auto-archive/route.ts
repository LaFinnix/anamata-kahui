/**
 * Auto-archive expired news entries.
 *
 * Runs on a Vercel cron schedule (every 6 hours) and flips any
 * `news` row with `expires_at < now()` from `status='published'` to
 * `status='archived'`. Once archived, the public `news_public` view
 * filters the row out (it requires `status='published'`).
 *
 * This is intentionally narrow — we don't want to delete or modify
 * anything else. The audit trigger `news_audit` writes a governance
 * log entry on every status change.
 *
 * Required env: CRON_SECRET (header check)
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

  // Find + archive expired entries. We do this in two steps so the
  // audit log gets one row per archive (not one row per row).
  const { data: expired, error: findErr } = await supabase
    .from("news")
    .select("id, slug, title, expires_at")
    .eq("status", "published")
    .lt("expires_at", new Date().toISOString())
    .limit(100);

  if (findErr) {
    return new NextResponse(`find error: ${findErr.message}`, { status: 500 });
  }

  const items = expired ?? [];
  const archived: string[] = [];
  const failed: string[] = [];

  for (const item of items) {
    const { error: updateErr } = await supabase
      .from("news")
      .update({ status: "archived" })
      .eq("id", item.id);
    if (updateErr) {
      failed.push(`${item.slug} (${updateErr.message})`);
    } else {
      archived.push(item.slug);
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: items.length,
    archived: archived.length,
    archivedSlugs: archived,
    failed,
  });
}
