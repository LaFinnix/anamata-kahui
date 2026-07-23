"use server";

/**
 * Stem upload server action.
 *
 * Accepts a multipart/form-data submission containing one audio file,
 * uploads it to the `stems` storage bucket, then inserts a `stems`
 * row referencing the release.
 *
 * Authorization:
 *   - User must be signed in
 *   - User must have user_branches.role IN ('lead', 'admin') for the
 *     release's branch (enforced by RLS on insert)
 *   - Storage bucket is MIME-whitelisted (audio/* + video/mp4 etc.)
 *
 * Limits:
 *   - 50 MB per file (covers WAV masters and FLAC; smaller for MP3/AAC)
 *
 * Returns discriminated state for `useActionState`.
 */

import { createServerSupabase } from "@/lib/supabase/clients";
import { randomUUID } from "node:crypto";

export interface StemUploadState {
  error?: string;
  success?: string;
  fileName?: string;
  sizeBytes?: number;
}

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/mpeg",
  "audio/mp3",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
  "video/mp4",
]);

const ALLOWED_EXT = /\.(wav|flac|mp3|aac|m4a|mp4)$/i;

export async function uploadStemAction(
  _prev: StemUploadState | null,
  formData: FormData,
): Promise<StemUploadState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const releaseId = String(formData.get("release_id") ?? "").trim();
  const file = formData.get("file");

  if (!releaseId) return { error: "Release id required." };
  if (!file || !(file instanceof File)) {
    return { error: "Please choose an audio file." };
  }

  // Validate file
  if (file.size === 0) return { error: "File is empty." };
  if (file.size > MAX_BYTES) {
    return {
      error: `File too large. Maximum is ${Math.floor(MAX_BYTES / 1024 / 1024)} MB (your file: ${Math.ceil(file.size / 1024 / 1024)} MB).`,
    };
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime) && !ALLOWED_EXT.test(file.name)) {
    return {
      error: `Unsupported file type. Allowed: WAV, FLAC, MP3, AAC, M4A, MP4. Got: ${mime}`,
    };
  }

  // Build the storage path. Sanitize filename and put it in a release-scoped
  // subfolder so RLS on storage.objects can resolve the release's branch.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const storagePath = `${releaseId}/${randomUUID()}-${safeName}`;

  const arrayBuf = await file.arrayBuffer();
  const buf = new Uint8Array(arrayBuf);

  // Upload to storage. The bucket-level RLS applies (we set this up in
  // migration 0009 with MIME whitelists).
  const { error: uploadErr } = await supabase.storage
    .from("stems")
    .upload(storagePath, buf, {
      contentType: mime,
      upsert: false,
    });
  if (uploadErr) {
    return { error: `Upload failed: ${uploadErr.message}` };
  }

  // Insert stems row. RLS enforces branch-admin role.
  const { data: inserted, error: insertErr } = await supabase
    .from("stems")
    .insert({
      release_id: releaseId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: mime,
      size_bytes: file.size,
      uploaded_by: user.id,
    })
    .select("id, file_name, size_bytes, mime_type")
    .single();

  if (insertErr) {
    // Try to clean up the storage object
    await supabase.storage.from("stems").remove([storagePath]);
    return {
      error: `Could not record stem: ${insertErr.message}. Make sure your account has the lead or admin role for this branch.`,
    };
  }

  return {
    success: `Uploaded ${inserted.file_name}`,
    fileName: inserted.file_name,
    sizeBytes: inserted.size_bytes,
  };
}