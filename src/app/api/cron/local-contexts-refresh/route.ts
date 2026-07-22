/**
 * Vercel Cron endpoint — refreshes Local Contexts Hub caches.
 *
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/cron/local-contexts-refresh", "schedule": "0 star-slash-6 star star star" }] }
 *
 * (The actual schedule string is "0 *\/6 * * *" — every 6 hours — written
 * here as prose to avoid the comment block being closed early.)
 *
 * Runs every 6 hours. For each Hub project that's attached to an
 * Anamata asset, calls the date_modified polling endpoint to detect
 * changes, then re-fetches only those that changed.
 *
 * Honors the Hub's maintenance window:
 *   - Pacific 12am-4am → Hub may return 503
 *   - On 503, log and skip; next cron cycle retries
 *
 * Auth: protected by CRON_SECRET (Vercel sets Authorization: Bearer
 * header for cron jobs).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/clients";
import { fetchHubProjectsModified, fetchHubProject, HubError } from "@/lib/local-contexts/hub-client";
import type { HubProject } from "@/lib/local-contexts/hub-client";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel function timeout

/**
 * Cron handler.
 *
 * Run on schedule (recommended: every 6 hours).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const t0 = Date.now();

  // Collect all attached project IDs
  const { data: statuses } = await admin
    .from("lc_project_status")
    .select("hub_project_id, last_synced_at, asset_kind, asset_id")
    .not("hub_project_id", "is", null);

  const projectIds = Array.from(
    new Set((statuses ?? []).map((s) => s.hub_project_id as string).filter(Boolean)),
  );

  if (projectIds.length === 0) {
    return NextResponse.json({
      ok: true,
      refreshed: 0,
      skipped: 0,
      errors: 0,
      duration_ms: Date.now() - t0,
      message: "No attached Hub projects.",
    });
  }

  // Use the polling endpoint to detect changes cheaply
  let modified: Record<string, string | null>;
  try {
    modified = await fetchHubProjectsModified(projectIds);
  } catch (e) {
    if (e instanceof HubError && e.statusCode === 503) {
      // Hub in maintenance window — log and exit cleanly
      await admin.from("lc_sync_log").insert({
        hub_project_id: null,
        action: "error",
        http_status: 503,
        error_message: "Hub in maintenance window (Pacific 12am-4am)",
        actor_id: null,
      });
      return NextResponse.json({
        ok: false,
        skipped: "maintenance_window",
        message: "Hub is in maintenance; will retry next cycle.",
      });
    }
    return NextResponse.json(
      { ok: false, error: `Polling failed: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  // Pull the existing cache for comparison
  const { data: caches } = await admin
    .from("lc_labels_cache")
    .select("hub_project_id, hub_modified_at")
    .in("hub_project_id", projectIds);

  const cacheByProject = Object.fromEntries(
    (caches ?? []).map((c) => [c.hub_project_id, c]),
  );

  // Identify which projects need a full re-fetch
  const stale = projectIds.filter((id) => {
    const cached = cacheByProject[id];
    const hubModified = modified[id];
    if (!cached) return true; // not cached yet
    if (!hubModified) return true; // Hub didn't return a timestamp
    return cached.hub_modified_at !== hubModified;
  });

  // Parallel re-fetch (cap at 50 to stay within function duration)
  const toFetch = stale.slice(0, 50);
  const results = await Promise.allSettled(
    toFetch.map((id) => fetchHubProject(id)),
  );

  let refreshed = 0;
  let errors = 0;
  const errorDetails: { id: string; status?: number; message?: string }[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const id = toFetch[i];
    if (r.status === "fulfilled" && r.value) {
      const project: HubProject = r.value;
      const labelCount =
        project.tk_labels.length +
        project.bc_labels.length +
        project.notice.length;

      await admin.from("lc_labels_cache").upsert(
        {
          hub_project_id: id,
          payload: project,
          fetched_at: new Date().toISOString(),
          hub_modified_at: project.date_modified,
          has_tk_labels: project.tk_labels.length > 0,
          has_bc_labels: project.bc_labels.length > 0,
          has_notices: project.notice.length > 0,
          label_count: labelCount,
        },
        { onConflict: "hub_project_id" },
      );

      // Update all asset statuses that point to this project
      const linked = (statuses ?? []).filter((s) => s.hub_project_id === id);
      for (const s of linked) {
        await admin
          .from("lc_project_status")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_status: "ok",
            last_sync_error: null,
          })
          .eq("asset_kind", s.asset_kind)
          .eq("asset_id", s.asset_id);
      }

      await admin.from("lc_sync_log").insert({
        hub_project_id: id,
        action: "fetch",
        http_status: 200,
        duration_ms: 0,
        actor_id: null,
      });
      refreshed += 1;
    } else {
      const reason =
        r.status === "rejected" ? (r.reason as HubError) : null;
      const status = reason?.statusCode;
      const message = reason?.message ?? "Unknown error";
      errorDetails.push({ id, status, message });
      errors += 1;

      // Update status to reflect error
      const linked = (statuses ?? []).filter((s) => s.hub_project_id === id);
      for (const s of linked) {
        await admin
          .from("lc_project_status")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_status: "error",
            last_sync_error: message,
          })
          .eq("asset_kind", s.asset_kind)
          .eq("asset_id", s.asset_id);
      }

      await admin.from("lc_sync_log").insert({
        hub_project_id: id,
        action: "error",
        http_status: status ?? null,
        duration_ms: 0,
        error_message: message,
        actor_id: null,
      });
    }
  }

  // Cache-hit records for the unchanged ones
  const skipped = projectIds.length - toFetch.length;
  if (skipped > 0) {
    await admin.from("lc_sync_log").insert({
      hub_project_id: null,
      action: "cache_hit",
      http_status: 200,
      duration_ms: 0,
      actor_id: null,
      error_message: `${skipped} project(s) unchanged`,
    });
  }

  return NextResponse.json({
    ok: true,
    total_projects: projectIds.length,
    refreshed,
    skipped,
    errors,
    error_details: errorDetails.slice(0, 5),
    duration_ms: Date.now() - t0,
    message:
      errors === 0
        ? `OK: refreshed ${refreshed}, skipped ${skipped} unchanged.`
        : `Completed with ${errors} error(s).`,
  });
}

// Also support POST (Vercel Cron uses GET by default but some
// schedulers use POST).
export const POST = GET;
