/**
 * Unit tests for safe-redirect (no DB needed).
 *
 * Run with:
 *   node --experimental-strip-types --test \\
 *     src/lib/auth/safe-redirect.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

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

test("accepts same-origin paths", () => {
  assert.equal(safeRedirect("/admin"), "/admin");
  assert.equal(safeRedirect("/waiata/te-tinihanga"), "/waiata/te-tinihanga");
  assert.equal(safeRedirect("/mi/about?q=1"), "/mi/about?q=1");
  assert.equal(safeRedirect("/admin#section"), "/admin#section");
  assert.equal(safeRedirect("/"), "/");
});

test("rejects protocol-relative URLs (//evil.com)", () => {
  assert.equal(safeRedirect("//evil.com"), "/admin");
  assert.equal(safeRedirect("//evil.com/path"), "/admin");
  assert.equal(safeRedirect("///triple"), "/admin");
});

test("rejects absolute URLs", () => {
  assert.equal(safeRedirect("https://evil.com"), "/admin");
  assert.equal(safeRedirect("http://evil.com/admin"), "/admin");
  assert.equal(safeRedirect("ftp://anywhere"), "/admin");
});

test("rejects javascript: and data: schemes", () => {
  assert.equal(safeRedirect("javascript:alert(1)"), "/admin");
  assert.equal(safeRedirect("data:text/html,<script>alert(1)</script>"), "/admin");
  assert.equal(safeRedirect("vbscript:msgbox(1)"), "/admin");
});

test("rejects backslash tricks", () => {
  // Some browsers normalize \ to /
  assert.equal(safeRedirect("/\\evil.com"), "/admin");
  assert.equal(safeRedirect("\\\\evil.com"), "/admin");
  assert.equal(safeRedirect("/admin\\path"), "/admin");
});

test("rejects bare hosts and relative paths", () => {
  assert.equal(safeRedirect("evil.com"), "/admin");
  assert.equal(safeRedirect("admin"), "/admin");
  assert.equal(safeRedirect("./admin"), "/admin");
  assert.equal(safeRedirect("../admin"), "/admin");
});

test("handles null and undefined", () => {
  assert.equal(safeRedirect(null), "/admin");
  assert.equal(safeRedirect(undefined), "/admin");
  assert.equal(safeRedirect(""), "/admin");
});

test("uses custom fallback", () => {
  assert.equal(safeRedirect(null, "/login"), "/login");
  assert.equal(safeRedirect("https://evil.com", "/home"), "/home");
  assert.equal(safeRedirect("/", "/login"), "/");
});

test("preserves query string and hash on accepted paths", () => {
  assert.equal(safeRedirect("/admin?tab=users"), "/admin?tab=users");
  assert.equal(safeRedirect("/admin#users-section"), "/admin#users-section");
  assert.equal(safeRedirect("/admin?a=1&b=2#x"), "/admin?a=1&b=2#x");
});

test("does not modify the input (returns same string for valid paths)", () => {
  const input = "/waiata/te-tinihanga?lang=mi";
  assert.equal(safeRedirect(input), input);
});

test("does not accept whitespace-padded values", () => {
  // Whitespace prefix is suspicious
  assert.equal(safeRedirect(" /admin"), "/admin");
  assert.equal(safeRedirect("/admin\n"), "/admin");
  assert.equal(safeRedirect("\t/admin"), "/admin");
});