/**
 * Parse a Markdown file with YAML-like frontmatter.
 *
 * Zero-dependency — we don't use `gray-matter` to keep the bundle lean.
 * Supports the subset of frontmatter we use:
 *   - lines of `key: value`
 *   - quoted values: `key: "value with spaces"`
 *   - lists: `key: [a, b, c]`
 *   - comments: not supported (we don't need them)
 *
 * The body separator is `---` on its own line. Anything before it is
 * frontmatter; anything after is Markdown.
 *
 * If the file doesn't start with `---`, returns meta={} and the full
 * content as body (so the renderer can still show the file as a
 * plain document).
 */

import type { Document, DocumentMeta, Frontmatter, DocumentType } from "./types";

const DOCUMENT_TYPES: DocumentType[] = [
  "code_of_conduct",
  "label_deal",
  "distribution_agreement",
  "publishing_agreement",
  "co_venture",
  "recording_agreement",
  "tour_agreement",
  "cultural_safety_charter",
  "data_rights_policy",
  "privacy_consent",
];

/** Cast a raw frontmatter value to the typed meta. Defensive — invalid
 *  values fall back to sensible defaults so a malformed file doesn't
 *  crash the renderer. */
function normaliseMeta(raw: Frontmatter): DocumentMeta {
  const type =
    typeof raw.type === "string" && (DOCUMENT_TYPES as string[]).includes(raw.type)
      ? (raw.type as DocumentType)
      : "code_of_conduct";
  return {
    type,
    title: typeof raw.title === "string" ? raw.title : "Untitled document",
    version: typeof raw.version === "string" ? raw.version : "0.0.0",
    effective_at:
      typeof raw.effective_at === "string" ? raw.effective_at : "1970-01-01",
    summary: typeof raw.summary === "string" ? raw.summary : "",
  };
}

/** Parse a single frontmatter value. Supports:
 *   - bare word: `key: hello`
 *   - quoted: `key: "hello world"`
 *   - bracketed list: `key: [a, b, c]`
 *   - number: `key: 42`
 */
function parseValue(raw: string): string | string[] | number {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter((s) => s.length > 0);
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

/** Parse frontmatter into a key-value object. */
function parseFrontmatter(block: string): Frontmatter {
  const lines = block.split("\n");
  const result: Record<string, string | string[] | number> = {};
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, valueRaw] = m;
    result[key] = parseValue(valueRaw);
  }
  return result;
}

/** Parse a Markdown string into a Document. */
export function parseDocument(input: string): Document {
  const trimmed = input.replace(/^\uFEFF?/, "").trimStart();
  if (!trimmed.startsWith("---")) {
    return { meta: normaliseMeta({}), body: input };
  }
  // Find the closing `---` on its own line. The opening line is
  // already consumed; we scan from the next line.
  const afterOpen = trimmed.slice(3);
  const closeIdx = afterOpen.indexOf("\n---");
  if (closeIdx < 0) {
    return { meta: normaliseMeta({}), body: input };
  }
  const frontmatterBlock = afterOpen.slice(0, closeIdx).trim();
  const rest = afterOpen.slice(closeIdx + 4);
  // Strip the optional leading newline after the closing `---`
  const body = rest.replace(/^\r?\n/, "");
  const raw = parseFrontmatter(frontmatterBlock);
  return { meta: normaliseMeta(raw), body };
}
