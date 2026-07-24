/**
 * Document design system — PDF renderer.
 *
 * Mirrors the web component (`src/components/documents/document-view.tsx`)
 * but produces @react-pdf/renderer primitives that render via
 * `renderToBuffer`. Consumes the same `tokens` palette so web and PDF
 * look related (not identical — the surfaces have different affordances
 * but the brand is recognisable).
 *
 * Usage:
 *   const buffer = await renderDocumentToPdf({ document, ... });
 *   return new Response(buffer, { headers: { "Content-Type": "application/pdf" } });
 */

import * as React from "react";
import {
  Document as PdfDocument,
  Page as PdfPage,
  Text as PdfText,
  View as PdfView,
  StyleSheet,
  renderToBuffer,
  Font,
} from "@react-pdf/renderer";
import { tokens } from "./tokens";
import { parseMarkdown, type MarkdownNode, type InlineToken } from "./markdown";
import type { Document } from "./types";

const { colors, type, space, rules, page } = tokens;

const styles = StyleSheet.create({
  page: {
    paddingTop: page.marginPt,
    paddingBottom: page.marginPt,
    paddingHorizontal: page.marginPt,
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: colors.ink,
    backgroundColor: colors.paper,
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: rules.thick,
    borderBottomColor: colors.bronze,
    borderBottomStyle: "solid",
    paddingBottom: space.md,
    marginBottom: space.lg,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  eyebrowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  eyebrowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bronze,
  },
  eyebrowType: {
    fontSize: type.micro.fontSize,
    fontWeight: 600,
    color: colors.bronze,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  eyebrowVersion: {
    fontSize: type.small.fontSize,
    color: colors.inkMuted,
    fontFamily: "Courier",
  },
  statusBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: type.micro.fontSize,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusActive:    { backgroundColor: colors.pounamuLight, color: colors.pounamuDark },
  statusDraft:     { backgroundColor: colors.surface,       color: colors.inkSoft },
  statusDeprecated:{ backgroundColor: colors.surfaceWarn,   color: colors.bronzeDark },
  title: {
    fontSize: type.legalH1.fontSize,
    lineHeight: type.legalH1.lineHeight,
    fontWeight: type.legalH1.weight,
    color: colors.ink,
    marginBottom: space.xs,
    marginTop: 0,
  },
  effective: {
    fontSize: type.small.fontSize,
    color: colors.inkMuted,
  },
  // Body nodes
  h1: {
    fontSize: type.legalH1.fontSize,
    lineHeight: type.legalH1.lineHeight,
    fontWeight: type.legalH1.weight,
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  h2: {
    fontSize: type.legalH2.fontSize,
    lineHeight: type.legalH2.lineHeight,
    fontWeight: type.legalH2.weight,
    marginTop: space.lg,
    marginBottom: space.sm,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.bronzeLight,
    borderBottomStyle: "solid",
  },
  h3: {
    fontSize: type.legalH3.fontSize,
    lineHeight: type.legalH3.lineHeight,
    fontWeight: type.legalH3.weight,
    marginTop: space.md,
    marginBottom: space.xs,
  },
  paragraph: {
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: colors.inkSoft,
    marginBottom: space.sm,
    marginTop: 0,
  },
  blockquote: {
    marginVertical: space.md,
    paddingLeft: space.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.bronzeLight,
    borderLeftStyle: "solid",
    color: colors.inkMuted,
    fontStyle: "italic",
  },
  listItem: {
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: colors.inkSoft,
    marginBottom: 4,
    flexDirection: "row",
  },
  hr: {
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    borderTopStyle: "solid",
    marginVertical: space.lg,
  },
  signatureBox: {
    marginVertical: space.lg,
    padding: space.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: colors.bronze,
    borderLeftStyle: "solid",
    borderRadius: 4,
  },
  signatureLabel: {
    fontSize: type.micro.fontSize,
    fontWeight: 600,
    color: colors.bronzeDark,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  signatureNote: {
    fontSize: type.small.fontSize,
    color: colors.inkMuted,
    fontStyle: "italic",
  },
  signatureSignedLabel: {
    fontSize: type.micro.fontSize,
    fontWeight: 600,
    color: colors.pounamuDark,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  signatureSignedMeta: {
    fontSize: type.micro.fontSize,
    color: colors.inkMuted,
    fontFamily: "Courier",
    marginTop: 2,
  },
  signatureSignedName: {
    fontSize: type.small.fontSize,
    color: colors.ink,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: page.marginPt,
    right: page.marginPt,
    fontSize: type.micro.fontSize,
    color: colors.inkMuted,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    borderTopStyle: "solid",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pageNumber: { color: colors.inkMuted },
});

interface RenderOptions {
  /** Document to render. */
  document: Document;
  /** Override the displayed version (defaults to doc.meta.version). */
  version?: string;
  /** Status badge. */
  status?: { label: string; tone: "active" | "draft" | "deprecated" };
  /** Brand label for the footer (defaults to "Anamata Kāhui"). */
  brandLabel?: string;
  /** Brand URL for the footer. */
  brandUrl?: string;
}

/** Render a Document to a PDF Buffer. */
export async function renderDocumentToPdf(opts: RenderOptions): Promise<Buffer> {
  const tree = (
    <PdfDocument
      title={`${opts.document.meta.title} — v${opts.version ?? opts.document.meta.version}`}
      author={opts.brandLabel ?? "Anamata Kāhui"}
      subject={opts.document.meta.type}
    >
      <PdfPage size="A4" style={styles.page} wrap>
        {/* Header */}
        <PdfView style={styles.header}>
          <PdfView style={styles.eyebrow}>
            <PdfView style={styles.eyebrowLeft}>
              <PdfView style={styles.eyebrowDot} />
              <PdfText style={styles.eyebrowType}>
                {opts.document.meta.type.replace(/_/g, " ")}
              </PdfText>
              <PdfText style={styles.eyebrowVersion}>
                v{opts.version ?? opts.document.meta.version}
              </PdfText>
            </PdfView>
            {opts.status && <StatusBadge status={opts.status} />}
          </PdfView>
          <PdfText style={styles.title}>{opts.document.meta.title}</PdfText>
          <PdfText style={styles.effective}>
            Effective from {opts.document.meta.effective_at}
          </PdfText>
        </PdfView>

        {/* Body */}
        {parseMarkdown(opts.document.body).map((node, i) => (
          <NodeRenderer key={i} node={node} />
        ))}

        {/* Footer */}
        <PdfView style={styles.footer} fixed>
          <PdfText>{opts.brandLabel ?? "Anamata Kāhui"}</PdfText>
          <PdfText style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </PdfView>
      </PdfPage>
    </PdfDocument>
  );
  return await renderToBuffer(tree);
}

function StatusBadge({ status }: { status: { label: string; tone: "active" | "draft" | "deprecated" } }) {
  const styleByTone = {
    active: styles.statusActive,
    draft: styles.statusDraft,
    deprecated: styles.statusDeprecated,
  }[status.tone];
  return <PdfText style={[styles.statusBadge, styleByTone]}>{status.label}</PdfText>;
}

function NodeRenderer({ node }: { node: MarkdownNode }) {
  switch (node.type) {
    case "heading": {
      const style =
        node.level === 1 ? styles.h1
        : node.level === 2 ? styles.h2
        : styles.h3;
      return <PdfView style={style}>{renderInline(node.inline)}</PdfView>;
    }
    case "paragraph":
      return <PdfText style={styles.paragraph}>{renderInline(node.inline)}</PdfText>;
    case "blockquote":
      return <PdfView style={styles.blockquote}>{renderInline(node.inline)}</PdfView>;
    case "list":
      return (
        <PdfView>
          {node.items.map((item, i) => (
            <PdfView key={i} style={styles.listItem}>
              <PdfText style={{ width: 16 }}>{node.ordered ? `${i + 1}.` : "•"}</PdfText>
              <PdfText style={{ flex: 1 }}>{renderInline(item.inline)}</PdfText>
            </PdfView>
          ))}
        </PdfView>
      );
    case "hr":
      return <PdfView style={styles.hr} />;
    case "signature":
      return <SignatureBlock label={node.label} />;
  }
}

function renderInline(tokens: InlineToken[]): React.ReactNode {
  return tokens.map((t, i) => {
    const child = t.value;
    if (t.type === "text") return <PdfText key={i}>{child}</PdfText>;
    if (t.type === "bold") return <PdfText key={i} style={{ fontWeight: 700 }}>{child}</PdfText>;
    if (t.type === "italic") return <PdfText key={i} style={{ fontStyle: "italic" }}>{child}</PdfText>;
    if (t.type === "code")
      return (
        <PdfText key={i} style={{ fontFamily: "Courier", fontSize: type.body.fontSize - 1 }}>
          {child}
        </PdfText>
      );
    return null;
  });
}

function SignatureBlock({ label }: { label: string }) {
  return (
    <PdfView style={styles.signatureBox} wrap={false}>
      <PdfText style={styles.signatureLabel}>[signature required: {label}]</PdfText>
      <PdfText style={styles.signatureNote}>
        By signing, you confirm you have read, understood, and agree to this
        document in its current version.
      </PdfText>
    </PdfView>
  );
}
