/**
 * Safe regex matching — uses the browser's native RegExp, never eval.
 *
 * Returns either:
 *   - { ok: true, matches: [...] } on success (including "no matches")
 *   - { ok: false, error: string } on invalid pattern
 *
 * Each match:
 *   - match:  the matched substring
 *   - index:  zero-based position in the input string
 *   - groups: capture groups (undefined means the group didn't match)
 */

export interface RegexMatch {
  match: string;
  index: number;
  groups: (string | undefined)[];
}

export type MatchResult =
  | { ok: true; matches: RegexMatch[] }
  | { ok: false; error: string };

/** Validate flag string. Throws on invalid flag. */
function validateFlags(flags: string): void {
  const valid = new Set(["g", "i", "m", "s", "u", "y", "d"]);
  for (const ch of flags) {
    if (!valid.has(ch)) {
      throw new Error(`Invalid flag: "${ch}"`);
    }
  }
  if ((flags.match(/g/g) ?? []).length > 1) {
    throw new Error("Duplicate flag 'g'");
  }
  if ((flags.match(/y/g) ?? []).length > 1) {
    throw new Error("Duplicate flag 'y'");
  }
}

export function matchRegex(
  pattern: string,
  flags: string,
  input: string,
): MatchResult {
  // Validate flags first so we can give a precise error
  try {
    validateFlags(flags);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // Build the RegExp. If the pattern is invalid, the constructor throws.
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // Run matches. Use matchAll if 'g' flag is present, otherwise single match.
  const matches: RegexMatch[] = [];
  if (flags.includes("g")) {
    const iter = input.matchAll(regex);
    for (const m of iter) {
      matches.push({
        match: m[0],
        index: m.index ?? 0,
        groups: (m.slice(1) as (string | undefined)[]).map((g) =>
          g === undefined ? undefined : String(g),
        ),
      });
    }
  } else {
    const m = regex.exec(input);
    if (m) {
      matches.push({
        match: m[0],
        index: m.index ?? 0,
        groups: (m.slice(1) as (string | undefined)[]).map((g) =>
          g === undefined ? undefined : String(g),
        ),
      });
    }
  }

  return { ok: true, matches };
}