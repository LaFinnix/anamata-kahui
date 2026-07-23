/**
 * SVG hero image generator for /reads.
 *
 * Renders a deterministic gradient + article title + author + read kind
 * as an SVG, returns the SVG string. The caller (a server action) can
 * then upload the SVG to the `press` storage bucket (which is public,
 * so the resulting URL is directly usable as `featured_image_url`).
 *
 * Why SVG instead of PNG/JPEG:
 *   - Text is vector — no font embedding issues, scales perfectly.
 *   - File is tiny (~3KB).
 *   - Renders identically on every browser.
 *   - The `press` bucket already accepts image/svg+xml.
 *
 * Design rules:
 *   - Bronze (kōkōwai) → Gold (kōhai) → Pounamu gradient, rotated per kind.
 *   - Title in display font, max 3 lines, auto-truncated with ellipsis.
 *   - Subtitle / author in body font, max 1 line.
 *   - Bottom strip: kind label + reading time.
 *   - Aspect ratio: 1200x630 (Open Graph standard).
 */

export type ReadKind = "note" | "research" | "data_drop";

const KIND_LABELS: Record<ReadKind, string> = {
  note: "Note",
  research: "Research",
  data_drop: "Data Drop",
};

const KIND_GRADIENTS: Record<ReadKind, { from: string; via: string; to: string }> = {
  note: { from: "#1f1d1a", via: "#b87333", to: "#d4a154" },
  research: { from: "#0f1f1a", via: "#5a8a72", to: "#8aab8c" },
  data_drop: { from: "#1a1a1f", via: "#7a6a8c", to: "#a896b4" },
};

const ASPECT_W = 1200;
const ASPECT_H = 630;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Wrap text into max `maxLines` lines, truncating with an ellipsis. */
function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine) {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) {
        // Truncate last line with ellipsis
        const lastWord = word;
        const remaining = words.slice(words.indexOf(lastWord) + 1).join(" ");
        const truncated = remaining
          ? `${lastWord} ${remaining}`.slice(0, maxCharsPerLine - 1) + "…"
          : lastWord;
        current = truncated;
        break;
      }
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

/**
 * Render a hero SVG for a read.
 *
 * @param opts - Article metadata
 * @returns SVG markup as a string (XML declaration included).
 */
export function renderHeroSvg(opts: {
  title: string;
  subtitle?: string | null;
  authorName?: string | null;
  kind: ReadKind;
  readingMinutes?: number | null;
}): string {
  const { title, subtitle, authorName, kind, readingMinutes } = opts;
  const gradient = KIND_GRADIENTS[kind];
  const kindLabel = KIND_LABELS[kind];

  // Title: ~32 chars/line × 3 lines max for the 1200-wide canvas.
  const titleLines = wrapLines(title, 32, 3);
  const subtitleLine = subtitle ? wrapLines(subtitle, 60, 1)[0] ?? "" : "";

  // Render title lines
  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="80" y="${320 + i * 64}" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="700" font-size="56" fill="#f5e6c8" letter-spacing="-1">${escapeXml(line)}</text>`,
    )
    .join("\n  ");

  // Subtitle (lighter)
  const subtitleSvg = subtitleLine
    ? `<text x="80" y="540" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="400" font-size="22" fill="#d4a154" opacity="0.9">${escapeXml(subtitleLine)}</text>`
    : "";

  // Author + reading time strip
  const meta: string[] = [];
  if (authorName) {
    meta.push(escapeXml(authorName));
  }
  if (readingMinutes) {
    meta.push(`${readingMinutes} min read`);
  }
  const metaSvg = meta.length
    ? `<text x="80" y="585" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="400" font-size="18" fill="#b8b8b8" opacity="0.7">${meta.join(" · ")}</text>`
    : "";

  // Kind badge (top-right)
  const badgeSvg = `<rect x="1000" y="60" width="140" height="42" rx="21" fill="rgba(184, 115, 51, 0.15)" stroke="rgba(184, 115, 51, 0.4)" stroke-width="1"/>
  <text x="1070" y="88" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="600" font-size="18" fill="#d4a154" text-anchor="middle">${escapeXml(kindLabel)}</text>`;

  // Brand mark (top-left) — bronze dot + name
  const brandSvg = `<circle cx="50" cy="60" r="6" fill="#b87333"/>
  <text x="68" y="66" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="600" font-size="20" fill="#f5e6c8">Anamata Kāhui</text>`;

  // Footer decorative line
  const footerSvg = `<line x1="80" y1="${ASPECT_H - 60}" x2="${ASPECT_W - 80}" y2="${ASPECT_H - 60}" stroke="rgba(212, 161, 84, 0.2)" stroke-width="1"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${ASPECT_W}" height="${ASPECT_H}" viewBox="0 0 ${ASPECT_W} ${ASPECT_H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gradient.from}"/>
      <stop offset="50%" stop-color="${gradient.via}"/>
      <stop offset="100%" stop-color="${gradient.to}"/>
    </linearGradient>
  </defs>
  <rect width="${ASPECT_W}" height="${ASPECT_H}" fill="url(#bg)"/>
  ${brandSvg}
  ${badgeSvg}
  ${titleSvg}
  ${subtitleSvg}
  ${metaSvg}
  ${footerSvg}
</svg>`;
}

/** SVG → data URI (browser-renderable, used in OG meta tags). */
export function renderHeroDataUri(opts: Parameters<typeof renderHeroSvg>[0]): string {
  const svg = renderHeroSvg(opts);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}