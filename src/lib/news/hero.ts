/**
 * SVG hero image generator for /news.
 *
 * Variant of reads/hero with 5 distinct gradients (one per kind) and
 * shorter content layout. Same SVG → vector → tiny file approach.
 *
 * Aspect ratio: 1200x630 (Open Graph standard).
 */

export type NewsKind = "release" | "feature" | "milestone" | "partner" | "update";

const KIND_LABELS: Record<NewsKind, string> = {
  release: "Release",
  feature: "Feature",
  milestone: "Milestone",
  partner: "Partner",
  update: "Update",
};

const KIND_GRADIENTS: Record<NewsKind, { from: string; via: string; to: string }> = {
  release: { from: "#1f1d1a", via: "#b87333", to: "#d4a154" },        // bronze (kōkōwai)
  feature: { from: "#1a1a1f", via: "#7a6a8c", to: "#a896b4" },         // mākete purple
  milestone: { from: "#0f1f1a", via: "#5a8a72", to: "#8aab8c" },     // pounamu green
  partner: { from: "#1a1410", via: "#8a6a4a", to: "#b88a6a" },        // kōhai warm brown
  update: { from: "#101418", via: "#4a5566", to: "#6a7a8a" },         // pounamu grey-blue
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

export function renderNewsHeroSvg(opts: {
  title: string;
  summary?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  kind: NewsKind;
}): string {
  const { title, summary, authorName, publishedAt, kind } = opts;
  const gradient = KIND_GRADIENTS[kind];
  const kindLabel = KIND_LABELS[kind];

  const titleLines = wrapLines(title, 32, 2);
  const summaryLine = summary ? wrapLines(summary, 60, 1)[0] ?? "" : "";

  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="80" y="${320 + i * 72}" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="700" font-size="56" fill="#f5e6c8" letter-spacing="-1">${escapeXml(line)}</text>`,
    )
    .join("\n  ");

  const summarySvg = summaryLine
    ? `<text x="80" y="${320 + titleLines.length * 72 + 24}" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="400" font-size="22" fill="#d4a154" opacity="0.9">${escapeXml(summaryLine)}</text>`
    : "";

  // Footer meta: author + date
  const meta: string[] = [];
  if (authorName) meta.push(escapeXml(authorName));
  if (publishedAt) {
    const d = new Date(publishedAt);
    meta.push(d.toLocaleDateString("en-NZ", { year: "numeric", month: "short", day: "numeric" }));
  }
  const metaSvg = meta.length
    ? `<text x="80" y="585" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="400" font-size="18" fill="#b8b8b8" opacity="0.7">${meta.join(" · ")}</text>`
    : "";

  // Kind badge (top-right)
  const badgeSvg = `<rect x="1000" y="60" width="140" height="42" rx="21" fill="rgba(212, 161, 84, 0.15)" stroke="rgba(212, 161, 84, 0.4)" stroke-width="1"/>
  <text x="1070" y="88" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="600" font-size="18" fill="#d4a154" text-anchor="middle">${escapeXml(kindLabel)}</text>`;

  const brandSvg = `<circle cx="50" cy="60" r="6" fill="#b87333"/>
  <text x="68" y="66" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="600" font-size="20" fill="#f5e6c8">Anamata Kāhui</text>`;

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
  ${summarySvg}
  ${metaSvg}
  ${footerSvg}
</svg>`;
}