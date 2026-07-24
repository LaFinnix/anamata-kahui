/**
 * Demo upload limits — pure constants used by both the client (to show
 * limits in the upload form) and the server (to enforce them).
 *
 * These are kept in a separate file from the server action so the
 * client component can import them without pulling in
 * "next/cache" / "node:crypto" (which would break the build).
 */

export const FILE_SIZE_LIMITS = {
  audio:    100 * 1024 * 1024,   // 100 MB
  video:    500 * 1024 * 1024,   // 500 MB
  image:     20 * 1024 * 1024,   //  20 MB
  document:  50 * 1024 * 1024,   //  50 MB
} as const;

export const ALLOWED_MIME: ReadonlySet<string> = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/mpeg",
  "audio/mp3",
  "audio/aac",
  "audio/x-m4a",
  "audio/mp4",
  "video/mp4",
  "video/quicktime",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const QUOTAS = {
  totalDemos: 100,
  draftsPerArtist: 50,
  pendingReviewPerArtist: 20,
  totalStorageBytes: 5 * 1024 * 1024 * 1024,  // 5 GB
} as const;

export const RATE_LIMIT = {
  maxUploads: 5,
  windowMs: 60_000,
} as const;

export function sizeLimitForMime(mime: string): number {
  if (mime.startsWith("audio/")) return FILE_SIZE_LIMITS.audio;
  if (mime.startsWith("video/")) return FILE_SIZE_LIMITS.video;
  if (mime.startsWith("image/")) return FILE_SIZE_LIMITS.image;
  if (mime === "application/pdf") return FILE_SIZE_LIMITS.document;
  return 0;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
