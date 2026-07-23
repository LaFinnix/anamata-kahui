/**
 * Markdown rendering pipeline for /reads.
 *
 * Server-side only. Uses markdown-it for parsing and
 * isomorphic-dompurify for sanitisation.
 *
 * Why server-side:
 *   - Rendered HTML is cached in the `body_html` column at publish time.
 *   - Public reads don't need real-time rendering.
 *   - Avoids shipping a markdown parser + DOMPurify to the client.
 *
 * Sanitisation policy:
 *   - Allow only safe tags + attributes.
 *   - Allow `target="_blank"` on links (with rel="noopener noreferrer").
 *   - Allow `id` on headings (for anchor links).
 *   - Disallow inline event handlers, scripts, styles.
 */

import MarkdownIt from "markdown-it";
import DOMPurify from "isomorphic-dompurify";

const md = new MarkdownIt({
  html: false,          // Don't allow raw HTML in markdown source
  linkify: true,        // Auto-link bare URLs
  typographer: true,    // Smart quotes, dashes
  breaks: false,        // Don't treat \n as <br>
});

// Add `target="_blank"` + `rel="noopener noreferrer"` to external links
const defaultLinkOpen = md.renderer.rules.link_open ?? function (tokens, idx, options, _env, self) {
  return self.renderToken(tokens, idx, options);
};
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const hrefIdx = token.attrIndex("href");
  if (hrefIdx >= 0) {
    const href = token.attrs![hrefIdx][1];
    // External link heuristic
    if (/^https?:\/\//.test(href)) {
      token.attrSet("target", "_blank");
      token.attrSet("rel", "noopener noreferrer");
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// Add an `id` to headings so we can deep-link to sections
md.renderer.rules.heading_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const textToken = tokens[idx + 1];
  if (textToken && textToken.type === "inline" && textToken.content) {
    const slug = textToken.content
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    token.attrSet("id", slug);
  }
  return self.renderToken(tokens, idx, options);
};

/** Estimate reading time from markdown body. ~225 words per minute. */
export function estimateReadingTime(bodyMd: string): number {
  // Strip markdown syntax rough approximation
  const text = bodyMd
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[*_~#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 225));
}

/** Render markdown to sanitised HTML. */
export function renderMarkdown(bodyMd: string): string {
  const raw = md.render(bodyMd);
  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "em", "strong", "del", "ins", "mark",
      "ul", "ol", "li",
      "blockquote",
      "code", "pre",
      "a",
      "table", "thead", "tbody", "tr", "th", "td",
      "hr", "br",
      "img", "figure", "figcaption",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel",      // links
      "id",                          // headings
      "src", "alt", "title",         // images
      "class",                       // for syntax highlighting classes
    ],
    ALLOW_DATA_ATTR: false,
  });
  return clean;
}

/**
 * Extract a short excerpt (first paragraph, ~200 chars) for use in
 * meta_description and RSS feeds.
 */
export function extractExcerpt(bodyMd: string, maxLen: number = 200): string {
  // First paragraph (skip heading-only lines)
  const lines = bodyMd.split("\n");
  let paragraph = "";
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (paragraph) break;
      continue;
    }
    if (t.startsWith("#") || t.startsWith("```")) continue;
    if (paragraph) paragraph += " ";
    paragraph += t.replace(/[*_`>\[\]]/g, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  }
  if (paragraph.length <= maxLen) return paragraph;
  // Cut at word boundary
  const cut = paragraph.slice(0, maxLen);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}