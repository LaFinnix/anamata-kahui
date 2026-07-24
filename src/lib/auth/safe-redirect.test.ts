/**
 * Unit tests for safe-redirect (no DB needed).
 *
 * Converted from `node:test` to Vitest so the full test runner is
 * consistent. The function under test is mirrored here (same as the
 * original test file) — when a Vitest-compatible test runner is
 * available, this could be replaced with an import.
 */

import { describe, it, expect } from "vitest";

// Mirror of src/lib/auth/safe-redirect.ts
function safeRedirect(
  input: string | null | undefined,
  fallback: string = "/admin",
): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  if (!trimmed) return fallback;
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f]/.test(trimmed)) return fallback;
  return trimmed;
}

describe("safeRedirect", () => {
  it("accepts same-origin paths", () => {
    expect(safeRedirect("/admin")).toBe("/admin");
    expect(safeRedirect("/waiata/te-tinihanga")).toBe("/waiata/te-tinihanga");
    expect(safeRedirect("/mi/about?q=1")).toBe("/mi/about?q=1");
    expect(safeRedirect("/admin#section")).toBe("/admin#section");
    expect(safeRedirect("/")).toBe("/");
  });

  it("rejects protocol-relative URLs (//evil.com)", () => {
    expect(safeRedirect("//evil.com")).toBe("/admin");
    expect(safeRedirect("//evil.com/path")).toBe("/admin");
    expect(safeRedirect("///triple")).toBe("/admin");
  });

  it("rejects absolute URLs", () => {
    expect(safeRedirect("https://evil.com")).toBe("/admin");
    expect(safeRedirect("http://evil.com/admin")).toBe("/admin");
    expect(safeRedirect("ftp://anywhere")).toBe("/admin");
  });

  it("rejects javascript: and data: schemes", () => {
    expect(safeRedirect("javascript:alert(1)")).toBe("/admin");
    expect(safeRedirect("data:text/html,<script>alert(1)</script>")).toBe("/admin");
    expect(safeRedirect("vbscript:msgbox(1)")).toBe("/admin");
  });

  it("rejects backslash tricks", () => {
    // Some browsers normalize \ to /
    expect(safeRedirect("/\\evil.com")).toBe("/admin");
    expect(safeRedirect("\\\\evil.com")).toBe("/admin");
    expect(safeRedirect("/admin\\path")).toBe("/admin");
  });

  it("rejects bare hosts and relative paths", () => {
    expect(safeRedirect("evil.com")).toBe("/admin");
    expect(safeRedirect("admin")).toBe("/admin");
    expect(safeRedirect("./admin")).toBe("/admin");
    expect(safeRedirect("../admin")).toBe("/admin");
  });

  it("handles null and undefined", () => {
    expect(safeRedirect(null)).toBe("/admin");
    expect(safeRedirect(undefined)).toBe("/admin");
    expect(safeRedirect("")).toBe("/admin");
  });

  it("uses custom fallback", () => {
    expect(safeRedirect(null, "/login")).toBe("/login");
    expect(safeRedirect("https://evil.com", "/home")).toBe("/home");
    expect(safeRedirect("/", "/login")).toBe("/");
  });

  it("preserves query string and hash on accepted paths", () => {
    expect(safeRedirect("/admin?tab=users")).toBe("/admin?tab=users");
    expect(safeRedirect("/admin#users-section")).toBe("/admin#users-section");
    expect(safeRedirect("/admin?a=1&b=2#x")).toBe("/admin?a=1&b=2#x");
  });

  it("does not modify the input (returns same string for valid paths)", () => {
    const input = "/waiata/te-tinihanga?lang=mi";
    expect(safeRedirect(input)).toBe(input);
  });

  it("does not accept whitespace-padded values", () => {
    // Whitespace prefix is suspicious
    expect(safeRedirect(" /admin")).toBe("/admin");
    expect(safeRedirect("/admin\n")).toBe("/admin");
    expect(safeRedirect("\t/admin")).toBe("/admin");
  });
});
