"use server";

/**
 * Demo upload server action.
 *
 * Accepts a multipart/form-data submission containing one file,
 * uploads it to the `demos` storage bucket, then inserts a `demos` row.
 *
 * Limits (enforced server-side, displayed client-side):
 *  - Per-file size by mime category
 *  - Per-artist total demo count
 *  - Per-artist total storage
 *  - Per-artist rate (5 uploads/min, in-memory check)
 *
 * Auth: artist must own the roster row.
 *
 * The limits themselves live in `upload-limits.ts` (no "use server")
 * so the client form can import them for display. This file is the
 * server-side enforcement + storage upload + DB insert.
 */

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/lib/supabase/clients";
import {
  ALLOWED_MIME,
  QUOTAS,
  RATE_LIMIT,
  FILE_SIZE_LIMITS,
  sizeLimitForMime,
  formatBytes,
} from "./upload-limits";

export interface DemoUploadState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  demoId?: string;
  /** Size in bytes that was rejected (helps UI show the right error). */
  rejectedSize?: number;
  /** The limit that was hit (for the error message). */
  rejectedLimit?: string;
}

/* -------------------------------------------------------------------------- */
/* Rate limit (in-memory; replace with Redis in a future iteration)            */
/* -------------------------------------------------------------------------- */

const uploadTimestamps = new Map<string, number[]>();

function checkRateLimit(userId: string): { ok: boolean; retryInMs?: number } {
  const now = Date.now();
  const timestamps = (uploadTimestamps.get(userId) ?? []).filter(
    (t) => now - t < RATE_LIMIT.windowMs,
  );
  if (timestamps.length >= RATE_LIMIT.maxUploads) {
    const oldest = timestamps[0];
    return { ok: false, retryInMs: RATE_LIMIT.windowMs - (now - oldest) };
  }
  timestamps.push(now);
  uploadTimestamps.set(userId, timestamps);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function asString(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/* -------------------------------------------------------------------------- */
/* The action                                                                 */
/* -------------------------------------------------------------------------- */

export async function uploadDemoFileAction(
  _prev: DemoUploadState,
  formData: FormData,
): Promise<DemoUploadState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  /* ---- 1. Input validation ---- */

  const artistRosterId = asString(formData.get("artist_roster_id"));
  const title = asString(formData.get("title"));
  const description = asString(formData.get("description")) || null;
  const file = formData.get("file");

  const fieldErrors: Record<string, string[]> = {};
  if (!isUuid(artistRosterId)) fieldErrors.artist_roster_id = ["artist_roster_id must be a uuid"];
  if (!title) fieldErrors.title = ["title is required"];
  if (title.length > 200) fieldErrors.title = ["title must be 200 characters or fewer"];
  if (!(file instanceof File)) fieldErrors.file = ["file is required"];
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  /* ---- 2. Auth: artist owns the roster row ---- */

  const { data: roster, error: rosterErr } = await supabase
    .from("artist_roster")
    .select("profile_id, status")
    .eq("id", artistRosterId)
    .maybeSingle();
  if (rosterErr) return { ok: false, error: rosterErr.message };
  if (!roster) return { ok: false, error: "Roster row not found." };
  if (roster.profile_id !== user.id) {
    return { ok: false, error: "Only the artist on the roster can upload demos." };
  }
  if (roster.status !== "active" && roster.status !== "prospect") {
    return {
      ok: false,
      error: `Cannot upload demos while roster status is "${roster.status}".`,
    };
  }

  /* ---- 3. Rate limit ---- */

  const rateCheck = checkRateLimit(user.id);
  if (!rateCheck.ok) {
    return {
      ok: false,
      error: `Too many uploads. Please wait ${Math.ceil(
        (rateCheck.retryInMs ?? 0) / 1000,
      )} seconds and try again.`,
    };
  }

  /* ---- 4. File validation (mime + size) ---- */

  const f = file as File;
  if (!ALLOWED_MIME.has(f.type)) {
    return {
      ok: false,
      error: `File type "${f.type || "unknown"}" is not allowed. Accepted types: audio (wav, flac, mp3, aac, m4a), video (mp4, mov), image (jpeg, png, webp), pdf.`,
    };
  }
  const sizeLimit = sizeLimitForMime(f.type);
  if (sizeLimit === 0) {
    return { ok: false, error: `File type "${f.type}" is not in a recognised category.` };
  }
  if (f.size > sizeLimit) {
    return {
      ok: false,
      error: `File is too large (${formatBytes(f.size)}). Maximum for ${f.type} is ${formatBytes(sizeLimit)}.`,
      rejectedSize: f.size,
      rejectedLimit: formatBytes(sizeLimit),
    };
  }

  /* ---- 5. Quota: count existing demos + sum storage ---- */

  const { count: demoCount, error: countErr } = await supabase
    .from("demos")
    .select("id", { count: "exact", head: true })
    .eq("artist_roster_id", artistRosterId);
  if (countErr) return { ok: false, error: countErr.message };
  if ((demoCount ?? 0) >= QUOTAS.totalDemos) {
    return {
      ok: false,
      error: `You've reached the limit of ${QUOTAS.totalDemos} demos per artist. Delete some drafts or wait for kaitiaki review to free up space.`,
    };
  }

  const { count: draftCount } = await supabase
    .from("demos")
    .select("id", { count: "exact", head: true })
    .eq("artist_roster_id", artistRosterId)
    .eq("status", "draft");
  if ((draftCount ?? 0) >= QUOTAS.draftsPerArtist) {
    return {
      ok: false,
      error: `You have ${draftCount} drafts already (limit: ${QUOTAS.draftsPerArtist}). Submit some for review to free up space.`,
    };
  }

  const { data: existingDemos } = await supabase
    .from("demos")
    .select("file_size_bytes")
    .eq("artist_roster_id", artistRosterId);
  const usedBytes = (existingDemos ?? []).reduce(
    (sum, d) => sum + (d.file_size_bytes ?? 0),
    0,
  );
  if (usedBytes + f.size > QUOTAS.totalStorageBytes) {
    return {
      ok: false,
      error: `Upload would exceed your storage quota (${formatBytes(QUOTAS.totalStorageBytes)}). Currently using ${formatBytes(usedBytes)}.`,
    };
  }

  /* ---- 6. Upload to storage ---- */

  const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const storagePath = `demos/${user.id}/${randomUUID()}-${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from("demos")
    .upload(storagePath, f, {
      contentType: f.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadErr) {
    return { ok: false, error: `Storage upload failed: ${uploadErr.message}` };
  }

  /* ---- 7. Insert demo row + update user_storage_quotas ---- */

  const durationStr = asString(formData.get("file_duration_seconds"));
  const fileDurationSeconds = durationStr ? parseInt(durationStr, 10) : null;

  const { data: demo, error: insertErr } = await supabase
    .from("demos")
    .insert({
      artist_roster_id: artistRosterId,
      title,
      description,
      file_path: storagePath,
      file_mime: f.type,
      file_size_bytes: f.size,
      file_duration_seconds: fileDurationSeconds,
      status: "draft",
      created_by: user.id,
      last_modified_by: user.id,
    })
    .select("id")
    .single();
  if (insertErr) {
    await supabase.storage.from("demos").remove([storagePath]);
    return { ok: false, error: insertErr.message };
  }

  // Update the per-user storage quota. Uses the SECURITY DEFINER
  // function upsert_user_storage_quota which atomically increments the
  // per-bucket counters (doesn't replace other buckets' values).
  // Non-fatal if it fails — the action succeeded; quota tracking is
  // best-effort.
  await supabase.rpc("upsert_user_storage_quota" as never, {
    p_user_id: user.id,
    p_bucket: "demos",
    p_bytes: f.size,
    p_count: 1,
  } as never).then(
    () => {},
    (err) => {
      console.error("[/uploadDemoFileAction] quota upsert failed:", err.message);
    },
  );

  revalidatePath("/kaikorero/roster");
  revalidatePath("/admin/demos");
  return { ok: true, demoId: demo.id };
}
