/**
 * Unit tests for the demo upload limits.
 *
 * The constants in upload-limits.ts are the safety boundary that
 * prevents a single user from monopolising the review queue, storage,
 * or the kaitiaki's attention. These tests verify the boundary is
 * exactly what we documented.
 *
 * Note: we re-declare the constants here (read from the module) so
 * the tests don't silently drift if someone changes the constants
 * without thinking about the test contract.
 */

import { describe, it, expect } from "vitest";
import {
  FILE_SIZE_LIMITS as DEMO_FILE_SIZE_LIMITS,
  ALLOWED_MIME as DEMO_ALLOWED_MIME,
  QUOTAS as DEMO_QUOTAS,
  RATE_LIMIT,
  formatBytes,
} from "@/lib/demos/upload-limits";

describe("DEMO_FILE_SIZE_LIMITS", () => {
  it("has a limit for each major mime category", () => {
    expect(DEMO_FILE_SIZE_LIMITS.audio).toBeGreaterThan(0);
    expect(DEMO_FILE_SIZE_LIMITS.video).toBeGreaterThan(0);
    expect(DEMO_FILE_SIZE_LIMITS.image).toBeGreaterThan(0);
    expect(DEMO_FILE_SIZE_LIMITS.document).toBeGreaterThan(0);
  });

  it("audio limit is 100 MB (covers high-quality tracks but not absurdly long files)", () => {
    expect(DEMO_FILE_SIZE_LIMITS.audio).toBe(100 * 1024 * 1024);
  });

  it("video limit is 500 MB (larger than audio but not cinematic)", () => {
    expect(DEMO_FILE_SIZE_LIMITS.video).toBe(500 * 1024 * 1024);
  });

  it("image limit is 20 MB (covers high-res cover art)", () => {
    expect(DEMO_FILE_SIZE_LIMITS.image).toBe(20 * 1024 * 1024);
  });

  it("document limit is 50 MB (covers liner notes, scores)", () => {
    expect(DEMO_FILE_SIZE_LIMITS.document).toBe(50 * 1024 * 1024);
  });

  it("limits form a sensible hierarchy: video > audio > document > image", () => {
    expect(DEMO_FILE_SIZE_LIMITS.video).toBeGreaterThan(DEMO_FILE_SIZE_LIMITS.audio);
    expect(DEMO_FILE_SIZE_LIMITS.audio).toBeGreaterThan(DEMO_FILE_SIZE_LIMITS.document);
    expect(DEMO_FILE_SIZE_LIMITS.document).toBeGreaterThan(DEMO_FILE_SIZE_LIMITS.image);
  });
});

describe("DEMO_ALLOWED_MIME", () => {
  it("includes common audio formats", () => {
    expect(DEMO_ALLOWED_MIME.has("audio/wav")).toBe(true);
    expect(DEMO_ALLOWED_MIME.has("audio/mpeg")).toBe(true);
    expect(DEMO_ALLOWED_MIME.has("audio/mp4")).toBe(true);
    expect(DEMO_ALLOWED_MIME.has("audio/flac")).toBe(true);
  });

  it("includes video formats", () => {
    expect(DEMO_ALLOWED_MIME.has("video/mp4")).toBe(true);
    expect(DEMO_ALLOWED_MIME.has("video/quicktime")).toBe(true);
  });

  it("includes image formats", () => {
    expect(DEMO_ALLOWED_MIME.has("image/jpeg")).toBe(true);
    expect(DEMO_ALLOWED_MIME.has("image/png")).toBe(true);
    expect(DEMO_ALLOWED_MIME.has("image/webp")).toBe(true);
  });

  it("includes PDF", () => {
    expect(DEMO_ALLOWED_MIME.has("application/pdf")).toBe(true);
  });

  it("does not include arbitrary or dangerous types", () => {
    expect(DEMO_ALLOWED_MIME.has("application/x-msdownload")).toBe(false);
    expect(DEMO_ALLOWED_MIME.has("application/x-shellscript")).toBe(false);
    expect(DEMO_ALLOWED_MIME.has("text/html")).toBe(false); // XSS risk
    expect(DEMO_ALLOWED_MIME.has("application/javascript")).toBe(false);
  });
});

describe("DEMO_QUOTAS", () => {
  it("total demo count is generous (100) but not unlimited", () => {
    expect(DEMO_QUOTAS.totalDemos).toBeGreaterThan(50);
    expect(DEMO_QUOTAS.totalDemos).toBeLessThanOrEqual(500);
  });

  it("draft limit is tighter than total — encourages submitting for review", () => {
    expect(DEMO_QUOTAS.draftsPerArtist).toBeLessThan(DEMO_QUOTAS.totalDemos);
  });

  it("pending_review limit prevents review queue flooding", () => {
    expect(DEMO_QUOTAS.pendingReviewPerArtist).toBeLessThan(DEMO_QUOTAS.draftsPerArtist);
    expect(DEMO_QUOTAS.pendingReviewPerArtist).toBeGreaterThan(0);
  });

  it("storage quota is 5 GB (matches the user_storage_summary default)", () => {
    expect(DEMO_QUOTAS.totalStorageBytes).toBe(5 * 1024 * 1024 * 1024);
  });
});

describe("RATE_LIMIT", () => {
  it("is configured for 5 uploads per minute per user", () => {
    expect(RATE_LIMIT.maxUploads).toBe(5);
    expect(RATE_LIMIT.windowMs).toBe(60_000);
  });
});

describe("formatBytes", () => {
  it("formats small values in bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobyte-range values", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats megabyte-range values", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("formats gigabyte-range values with two decimals", () => {
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe("2.50 GB");
  });

  it("uses 'KB' suffix (not 'KiB' or 'kb') for consistency", () => {
    const result = formatBytes(1024);
    expect(result).toContain("KB");
    expect(result).not.toContain("KiB");
    expect(result).not.toContain("kb");
  });
});
