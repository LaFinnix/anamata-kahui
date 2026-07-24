/**
 * Document design system — React components for the WEB surface.
 *
 * Renders a `Document` (markdown body + metadata) as a styled page using
 * the design tokens. Use this for:
 *   - Contract view pages (/dashboard/admin/records/contracts/[id])
 *   - Policy view pages (/dashboard/admin/records/policies/[id])
 *   - Public read-only legal pages if needed
 *
 * For PDF rendering of the same content, use lib/documents/render-to-pdf.tsx
 * — it consumes the same token palette so web and PDF look related.
 */

import * as React from "react";
import { tokens } from "@/lib/documents/tokens";
import { parseMarkdown, type MarkdownNode, type InlineToken } from "@/lib/documents/markdown";
import type { Document } from "@/lib/documents/types";

const { colors, type, space, rules } = tokens;

/* -------------------------------------------------------------------------- */
/* DocumentLayout — the outer chrome                                          */
/* -------------------------------------------------------------------------- */

export function DocumentLayout({
  meta,
  version,
  status,
  children,
}: {
  meta: { title: string; type: string; effective_at: string };
  version?: string;
  status?: { label: string; tone: "active" | "draft" | "deprecated" };
  children: React.ReactNode;
}) {
  return (
    <article
      style={{
        background: colors.paperWhite,
        color: colors.ink,
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: 780,
        margin: "0 auto",
        padding: `${space.xl}px ${space.lg}px`,
        border: `1px solid ${colors.rule}`,
        borderRadius: 8,
      }}
    >
      {/* Document header */}
      <header
        style={{
          borderBottom: `${rules.thick}px solid ${colors.bronze}`,
          paddingBottom: space.md,
          marginBottom: space.lg,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: space.md,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: colors.bronze,
              }}
            />
            <span
              style={{
                fontSize: type.micro.fontSize,
                fontWeight: 600,
                color: colors.bronze,
                letterSpacing: 1.5,
                textTransform: "uppercase" as const,
              }}
            >
              {meta.type.replace(/_/g, " ")}
            </span>
            {version && (
              <span
                style={{
                  fontSize: type.small.fontSize,
                  color: colors.inkMuted,
                  fontFamily: "monospace",
                }}
              >
                v{version}
              </span>
            )}
          </div>
          {status && <DocumentStatusBadge label={status.label} tone={status.tone} />}
        </div>
        <h1
          style={{
            fontSize: type.legalH1.fontSize,
            lineHeight: type.legalH1.lineHeight,
            fontWeight: type.legalH1.weight,
            margin: `${space.md}px 0 ${space.sm}px 0`,
            color: colors.ink,
          }}
        >
          {meta.title}
        </h1>
        <p
          style={{
            fontSize: type.small.fontSize,
            color: colors.inkMuted,
            margin: 0,
          }}
        >
          Effective from {meta.effective_at}
        </p>
      </header>

      {/* Document body */}
      <div style={{ fontSize: type.body.fontSize, lineHeight: type.body.lineHeight }}>
        {children}
      </div>
    </article>
  );
}

function DocumentStatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "active" | "draft" | "deprecated";
}) {
  const colorsByTone: Record<typeof tone, { bg: string; fg: string }> = {
    active:    { bg: colors.pounamuLight,  fg: colors.pounamuDark },
    draft:     { bg: colors.surface,        fg: colors.inkSoft },
    deprecated:{ bg: colors.surfaceWarn,    fg: colors.bronzeDark },
  };
  const c = colorsByTone[tone];
  return (
    <span
      style={{
        display: "inline-block",
        padding: `${space.xs / 2}px ${space.sm}px`,
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        fontSize: type.micro.fontSize,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
      }}
    >
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* MarkdownDocument — renders a parsed body as web JSX                         */
/* -------------------------------------------------------------------------- */

export function MarkdownDocument({ body }: { body: string }) {
  const nodes = parseMarkdown(body);
  return (
    <>
      {nodes.map((node, i) => (
        <NodeRenderer key={i} node={node} />
      ))}
    </>
  );
}

function NodeRenderer({ node }: { node: MarkdownNode }) {
  switch (node.type) {
    case "heading": {
      const headingStyle: React.CSSProperties =
        node.level === 1
          ? { fontSize: type.legalH1.fontSize, lineHeight: type.legalH1.lineHeight, fontWeight: type.legalH1.weight, marginTop: space.lg, marginBottom: space.sm, color: colors.ink }
          : node.level === 2
          ? { fontSize: type.legalH2.fontSize, lineHeight: type.legalH2.lineHeight, fontWeight: type.legalH2.weight, marginTop: space.lg, marginBottom: space.sm, paddingBottom: space.xs, borderBottom: `1px solid ${colors.bronzeLight}`, color: colors.ink }
          : { fontSize: type.legalH3.fontSize, lineHeight: type.legalH3.lineHeight, fontWeight: type.legalH3.weight, marginTop: space.md, marginBottom: space.xs, color: colors.ink };
      return <div style={headingStyle}>{renderInline(node.inline)}</div>;
    }
    case "paragraph":
      return (
        <p style={{ marginTop: space.sm, marginBottom: space.md, color: colors.inkSoft }}>
          {renderInline(node.inline)}
        </p>
      );
    case "blockquote":
      return (
        <blockquote
          style={{
            margin: `${space.md}px 0`,
            paddingLeft: space.md,
            borderLeft: `3px solid ${colors.bronzeLight}`,
            color: colors.inkMuted,
            fontStyle: "italic",
          }}
        >
          {renderInline(node.inline)}
        </blockquote>
      );
    case "list":
      return (
        <ol
          start={node.ordered ? 1 : undefined}
          style={{
            listStyle: node.ordered ? "decimal" : "disc",
            paddingLeft: space.lg,
            margin: `${space.sm}px 0 ${space.md}px 0`,
            color: colors.inkSoft,
          }}
        >
          {node.items.map((item, i) => (
            <li key={i} style={{ marginBottom: space.xs }}>
              {renderInline(item.inline)}
            </li>
          ))}
        </ol>
      );
    case "hr":
      return (
        <hr
          style={{
            border: 0,
            borderTop: `1px solid ${colors.rule}`,
            margin: `${space.lg}px 0`,
          }}
        />
      );
    case "signature":
      return <SignatureBlock label={node.label} />;
  }
}

function renderInline(tokens: InlineToken[]): React.ReactNode {
  return tokens.map((t, i) => {
    if (t.type === "text") return <span key={i}>{t.value}</span>;
    if (t.type === "bold") return <strong key={i}>{t.value}</strong>;
    if (t.type === "italic") return <em key={i}>{t.value}</em>;
    if (t.type === "code")
      return (
        <code
          key={i}
          style={{
            fontFamily: "monospace",
            fontSize: "0.92em",
            padding: "1px 4px",
            background: colors.surfaceMuted,
            borderRadius: 3,
          }}
        >
          {t.value}
        </code>
      );
    return null;
  });
}

/* -------------------------------------------------------------------------- */
/* SignatureBlock — the "I have read and accept" element                      */
/* -------------------------------------------------------------------------- */

export function SignatureBlock({
  label,
  signedAt,
  signedByName,
  signedByRole,
  ipHash,
}: {
  label: string;
  signedAt?: string;
  signedByName?: string;
  signedByRole?: string;
  ipHash?: string;
}) {
  if (signedAt) {
    return (
      <div
        style={{
          margin: `${space.lg}px 0`,
          padding: space.md,
          background: colors.pounamuLight,
          borderLeft: `3px solid ${colors.pounamu}`,
          borderRadius: 4,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: type.micro.fontSize,
            color: colors.pounamuDark,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: 1,
          }}
        >
          ✓ {label}
        </p>
        <p style={{ margin: `${space.xs}px 0 0 0`, fontSize: type.small.fontSize, color: colors.ink }}>
          {signedByName}
          {signedByRole && (
            <span style={{ color: colors.inkMuted }}> · {signedByRole}</span>
          )}
        </p>
        <p style={{ margin: `${space.xs}px 0 0 0`, fontSize: type.micro.fontSize, color: colors.inkMuted, fontFamily: "monospace" }}>
          Signed {signedAt}
          {ipHash && <> · IP hash: {ipHash}</>}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        margin: `${space.lg}px 0`,
        padding: space.md,
        background: colors.surface,
        border: `1px dashed ${colors.bronzeLight}`,
        borderRadius: 4,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: type.micro.fontSize,
          color: colors.bronzeDark,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: 1,
        }}
      >
        [signature required: {label}]
      </p>
      <p
        style={{
          margin: `${space.xs}px 0 0 0`,
          fontSize: type.small.fontSize,
          color: colors.inkMuted,
          fontStyle: "italic",
        }}
      >
        By signing, you confirm you have read, understood, and agree to
        this document in its current version.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Top-level helper                                                            */
/* -------------------------------------------------------------------------- */

/** One-call component: takes a Document and renders the full layout. */
export function DocumentView({
  document,
  version,
  status,
}: {
  document: Document;
  version?: string;
  status?: { label: string; tone: "active" | "draft" | "deprecated" };
}) {
  return (
    <DocumentLayout
      meta={{
        title: document.meta.title,
        type: document.meta.type,
        effective_at: document.meta.effective_at,
      }}
      version={version}
      status={status}
    >
      <MarkdownDocument body={document.body} />
    </DocumentLayout>
  );
}
