/**
 * Safe-redirect helper — blocks open-redirect attacks.
 *
 * An attacker who can place arbitrary strings in a `redirectTo` /
 * `next` / `return_to` parameter could redirect users to phishing sites
 * after a successful auth flow. This helper accepts only same-origin
 * path-absolute URLs.
 *
 * Accepted:
 *   "/admin", "/waiata/te-tinihanga", "/mi/about?q=1"
 * Rejected:
 *   "https://evil.com", "//evil.com", "javascript:alert(1)",
 *   "evil.com", "http://anywhere", "" (empty)
 *
 * Fallback: returns the supplied default (default to "/admin").
 */
export function safeRedirect(
  input: string | null | undefined,
  fallback: string = "/admin",
): string {
  if (!input) return fallback;
  // Trim whitespace — a URL like " /admin" or "/admin\n" would
  // otherwise be passed through. Browsers may or may not strip
  // whitespace before navigation, so we strip it explicitly.
  const trimmed = input.trim();
  if (!trimmed) return fallback;
  // Must start with a single forward slash — that's a path-absolute URL.
  // Reject protocol-relative ("//evil.com"), absolute ("http://..."),
  // and protocol schemes ("javascript:").
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  // Reject backslash tricks — some browsers normalize \ to /
  if (trimmed.includes("\\")) return fallback;
  // Reject control characters (newlines, tabs, NUL) which could
  // confuse downstream parsers or allow header injection.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f]/.test(trimmed)) return fallback;
  return trimmed;
}
