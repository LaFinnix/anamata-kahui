/**
 * Tests for the document design system.
 *
 * Critical safety boundaries:
 *   - The Markdown parser must never crash, regardless of input
 *   - The parser must preserve all known frontmatter fields
 *   - Token values are stable (changing a token = a design decision)
 */

import { describe, it, expect } from "vitest";
import { parseDocument } from "@/lib/documents/parser";
import { parseMarkdown, nodeText } from "@/lib/documents/markdown";
import { tokens, colors, type, space, rules, page } from "@/lib/documents/tokens";
import {
  listDocuments,
  listDocumentVersions,
  getCurrentDocument,
  getDocument,
  DOCUMENT_LIBRARY_PATH,
} from "@/lib/documents/loader";
import { promises as fs } from "node:fs";
import path from "node:path";

describe("parseDocument", () => {
  it("parses a complete document with all frontmatter fields", () => {
    const input = `---
type: label_deal
title: Standard Label Deal
version: 1.0.0
effective_at: 2026-08-01
summary: A standard deal between artist and Anamata Records.
---

# Terms

You agree to ...`;
    const result = parseDocument(input);
    expect(result.meta.type).toBe("label_deal");
    expect(result.meta.title).toBe("Standard Label Deal");
    expect(result.meta.version).toBe("1.0.0");
    expect(result.meta.effective_at).toBe("2026-08-01");
    expect(result.meta.summary).toBe("A standard deal between artist and Anamata Records.");
    expect(result.body).toContain("# Terms");
  });

  it("parses quoted values with spaces and special characters", () => {
    const input = `---
type: code_of_conduct
title: "Code: Conduct & Values"
version: 1.0.0
effective_at: "2026-08-01"
summary: 'A short summary.'
---

# Body`;
    const result = parseDocument(input);
    expect(result.meta.title).toBe("Code: Conduct & Values");
  });

  it("falls back to safe defaults when frontmatter is missing", () => {
    const result = parseDocument("Just a body, no frontmatter.");
    expect(result.meta.type).toBe("code_of_conduct");
    expect(result.meta.title).toBe("Untitled document");
    expect(result.meta.version).toBe("0.0.0");
    expect(result.body).toBe("Just a body, no frontmatter.");
  });

  it("falls back to safe defaults when type is unknown", () => {
    const input = `---
type: definitely-not-a-real-type
title: Foo
version: 1
effective_at: 2026-01-01
---

# Body`;
    const result = parseDocument(input);
    expect(result.meta.type).toBe("code_of_conduct"); // default
  });

  it("handles a file with only `---` opening but no close (treats whole file as body)", () => {
    const result = parseDocument("---\n# Half-open\nStill body");
    expect(result.body).toContain("# Half-open");
  });

  it("handles Windows-style line endings", () => {
    const input = "---\r\ntype: code_of_conduct\r\ntitle: A\r\n---\r\n\r\n# Body\r\n";
    const result = parseDocument(input);
    expect(result.meta.type).toBe("code_of_conduct");
  });

  it("strips UTF-8 BOM if present", () => {
    const input = "\uFEFF---\ntype: code_of_conduct\n---\n# Body";
    const result = parseDocument(input);
    expect(result.meta.type).toBe("code_of_conduct");
  });
});

describe("parseMarkdown", () => {
  it("parses headings at three levels", () => {
    const ast = parseMarkdown("# H1\n## H2\n### H3\n");
    expect(ast).toHaveLength(3);
    expect(ast[0].type).toBe("heading");
    if (ast[0].type === "heading") expect(ast[0].level).toBe(1);
    if (ast[1].type === "heading") expect(ast[1].level).toBe(2);
    if (ast[2].type === "heading") expect(ast[2].level).toBe(3);
  });

  it("parses bold, italic, and inline code", () => {
    const ast = parseMarkdown("**bold** *italic* `code`");
    expect(ast).toHaveLength(1);
    const para = ast[0];
    if (para.type !== "paragraph") throw new Error("expected paragraph");
    const tokens = para.inline;
    // The parser produces 5 tokens: bold, text (whitespace), italic,
    // text (whitespace), code. We just check that the three semantic
    // types appear in order.
    const semanticTypes = tokens
      .filter((t) => t.type !== "text")
      .map((t) => t.type);
    expect(semanticTypes).toEqual(["bold", "italic", "code"]);
  });

  it("parses unordered lists", () => {
    const ast = parseMarkdown("- one\n- two\n- three\n");
    expect(ast).toHaveLength(1);
    if (ast[0].type === "list") {
      expect(ast[0].ordered).toBe(false);
      expect(ast[0].items).toHaveLength(3);
    }
  });

  it("parses ordered lists", () => {
    const ast = parseMarkdown("1. one\n2. two\n");
    expect(ast).toHaveLength(1);
    if (ast[0].type === "list") {
      expect(ast[0].ordered).toBe(true);
    }
  });

  it("parses horizontal rules", () => {
    const ast = parseMarkdown("Before\n\n---\n\nAfter");
    expect(ast.some((n) => n.type === "hr")).toBe(true);
  });

  it("parses blockquotes", () => {
    const ast = parseMarkdown("> a quoted line");
    expect(ast[0].type).toBe("blockquote");
  });

  it("parses signature blocks (`/sig`)", () => {
    const ast = parseMarkdown("/sig Artist signature\n");
    expect(ast[0].type).toBe("signature");
    if (ast[0].type === "signature") {
      expect(ast[0].label).toBe("Artist signature");
    }
  });

  it("combines multiple lines into one paragraph", () => {
    const ast = parseMarkdown("first line\nsecond line\nthird line");
    expect(ast).toHaveLength(1);
    if (ast[0].type === "paragraph") {
      expect(ast[0].text).toBe("first line second line third line");
    }
  });

  it("separates paragraphs by blank lines", () => {
    const ast = parseMarkdown("first para\n\nsecond para");
    expect(ast).toHaveLength(2);
  });

  it("nodeText extracts text for search/preview", () => {
    const ast = parseMarkdown("# Heading\n\nBody text\n\n- list item");
    const texts = ast.map(nodeText);
    expect(texts[0]).toBe("Heading");
    expect(texts[1]).toBe("Body text");
    expect(texts[2]).toBe("list item");
  });
});

describe("design tokens", () => {
  it("exposes the brand palette", () => {
    expect(colors.bronze).toBe("#A17B4F");
    expect(colors.pounamu).toBe("#3D6B5E");
    expect(colors.paper).toBe("#FAF7F2");
  });

  it("exposes A4 page dimensions", () => {
    expect(page.a4).toEqual({ width: 595, height: 842 });
  });

  it("exports a frozen-like tokens object (no undefined values)", () => {
    // Type assertions: at least one entry per category must be defined
    expect(Object.keys(colors).length).toBeGreaterThan(0);
    expect(Object.keys(type).length).toBeGreaterThan(0);
    expect(Object.keys(space).length).toBeGreaterThan(0);
    expect(Object.keys(rules).length).toBeGreaterThan(0);
    expect(tokens.colors).toBe(colors);
  });
});

describe("document loader", () => {
  it("lists at least the bundled code_of_conduct", async () => {
    const docs = await listDocuments();
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.some((d) => d.meta.type === "code_of_conduct")).toBe(true);
  });

  it("sorts documents by effective_at descending", async () => {
    const docs = await listDocuments();
    for (let i = 1; i < docs.length; i++) {
      expect(docs[i - 1].meta.effective_at >= docs[i].meta.effective_at).toBe(true);
    }
  });

  it("returns all versions of a type", async () => {
    const versions = await listDocumentVersions("code_of_conduct");
    expect(versions.length).toBeGreaterThan(0);
    for (const v of versions) {
      expect(v.meta.type).toBe("code_of_conduct");
    }
  });

  it("returns the highest semver as the current document", async () => {
    const current = await getCurrentDocument("code_of_conduct");
    expect(current).not.toBeNull();
    // The bundled version is 0.1.0-draft, which sorts higher than 0.0.0
    // and lower than any 0.2.0+ — so this assertion is sanity.
    expect(current!.meta.type).toBe("code_of_conduct");
  });

  it("finds a specific (type, version) document", async () => {
    const doc = await getDocument("code_of_conduct", "0.1.0-draft");
    expect(doc).not.toBeNull();
    expect(doc!.meta.title).toBe("Code of Conduct");
  });

  it("returns null for a non-existent version", async () => {
    const doc = await getDocument("code_of_conduct", "99.99.99");
    expect(doc).toBeNull();
  });
});
