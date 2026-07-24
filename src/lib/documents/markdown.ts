/**
 * Minimal Markdown renderer for legal documents.
 *
 * Zero dependencies — we don't use `react-markdown` to keep the bundle
 * lean and the rendering behaviour predictable. Supports the subset of
 * Markdown that contract / policy / legal text actually uses:
 *
 *   - # H1, ## H2, ### H3 headings
 *   - Paragraphs (blank-line separated)
 *   - Unordered lists (- item)
 *   - Ordered lists (1. item)
 *   - **bold** and *italic* inline emphasis
 *   - `code` inline
 *   - > blockquote
 *   - --- horizontal rule
 *   - Signature block: a paragraph starting with `/sig` becomes a
 *     signature placeholder.
 *
 * Deliberately does NOT support: nested lists, code blocks, tables,
 * links, images, raw HTML, references. The body of every formal
 * document we ship should be plain enough that none of these are needed.
 *
 * Both the web component (<MarkdownDocument>) and the PDF renderer
 * share this AST builder via the same parseMarkdown function. The
 * actual node-type -> JSX mapping differs.
 */

export type MarkdownNode =
  | { type: "heading"; level: 1 | 2 | 3; text: string; inline: InlineToken[] }
  | { type: "paragraph"; text: string; inline: InlineToken[] }
  | { type: "list"; ordered: boolean; items: { text: string; inline: InlineToken[] }[] }
  | { type: "blockquote"; text: string; inline: InlineToken[] }
  | { type: "hr" }
  | { type: "signature"; label: string };

export type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string };

/** Tokenise inline content (within a paragraph or heading) into
 *  bold/italic/code/text segments. */
function tokeniseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // Regex: capture bold (**...**), italic (*...*), code (`...`), then any
  // non-greedy fallback. Order matters: bold before italic.
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, m.index) });
    }
    if (m[2] !== undefined) {
      tokens.push({ type: "bold", value: m[2] });
    } else if (m[4] !== undefined) {
      tokens.push({ type: "italic", value: m[4] });
    } else if (m[6] !== undefined) {
      tokens.push({ type: "code", value: m[6] });
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }
  return tokens;
}

/** Split a body string into block-level nodes. */
export function parseMarkdown(body: string): MarkdownNode[] {
  const lines = body.split(/\r?\n/);
  const nodes: MarkdownNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push({ type: "hr" });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      const text = headingMatch[2].trim();
      nodes.push({ type: "heading", level, text, inline: tokeniseInline(text) });
      i++;
      continue;
    }

    // Blockquote (single-line only — multi-line bq is not common in legal docs)
    const quoteMatch = line.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      const text = quoteMatch[1].trim();
      nodes.push({ type: "blockquote", text, inline: tokeniseInline(text) });
      i++;
      continue;
    }

    // Signature block — paragraph starting with `/sig`
    if (line.trim().startsWith("/sig")) {
      const label = line.trim().slice(4).trim() || "Signature";
      nodes.push({ type: "signature", label });
      i++;
      continue;
    }

    // List (collect consecutive list lines)
    const ulMatch = line.match(/^-\s+(.*)$/);
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      const ordered = !!olMatch;
      const items: { text: string; inline: InlineToken[] }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(ordered ? /^\d+\.\s+(.*)$/ : /^-\s+(.*)$/);
        if (!m) break;
        const text = m[1].trim();
        items.push({ text, inline: tokeniseInline(text) });
        i++;
      }
      nodes.push({ type: "list", ordered, items });
      continue;
    }

    // Paragraph (collect until blank line or block-level token)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim() === "") break;
      if (/^#{1,3}\s+/.test(l) || /^---+$/.test(l.trim())) break;
      if (/^>\s*/.test(l) || /^-\s+/.test(l) || /^\d+\.\s+/.test(l)) break;
      if (l.trim().startsWith("/sig")) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length > 0) {
      const text = paraLines.join(" ").trim();
      nodes.push({ type: "paragraph", text, inline: tokeniseInline(text) });
    }
  }

  return nodes;
}

/** Helper: extract just the text content of a node (for preview/search). */
export function nodeText(node: MarkdownNode): string {
  if (node.type === "heading" || node.type === "paragraph" || node.type === "blockquote") {
    return node.text;
  }
  if (node.type === "list") {
    return node.items.map((i) => i.text).join("; ");
  }
  if (node.type === "signature") {
    return `[signature: ${node.label}]`;
  }
  return "";
}
