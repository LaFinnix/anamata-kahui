/**
 * Document types — the contract between the on-disk Markdown file and
 * the renderer.
 *
 * Every formal document is a Markdown file with YAML frontmatter. The
 * frontmatter carries the metadata (type, version, effective_at, etc.)
 * The body is the document text.
 *
 * Example:
 *
 *   ---
 *   type: code_of_conduct
 *   title: Code of Conduct
 *   version: 1.2.0
 *   effective_at: 2026-08-01
 *   summary: Agreed standards of behaviour for signed artists.
 *   ---
 *
 *   # Code of Conduct
 *
 *   You agree to participate in good faith ...
 *
 * The renderer (MarkdownDocument) takes a `Document` and renders it as
 * a typed React tree. Both the web page and the PDF generator consume
 * the same tree, so a single change in the .md file updates both
 * surfaces.
 */

export type DocumentType =
  | "code_of_conduct"
  | "label_deal"
  | "distribution_agreement"
  | "publishing_agreement"
  | "co_venture"
  | "recording_agreement"
  | "tour_agreement"
  | "cultural_safety_charter"
  | "data_rights_policy"
  | "privacy_consent";

export interface DocumentMeta {
  /** Stable slug used as the document identity. Re-using the slug for a
   *  new version means the renderer re-renders; version is what makes
   *  them distinct. */
  type: DocumentType;
  title: string;
  /** Semantic version. Bump on changes; the ack table records the
   *  specific version each artist acknowledged. */
  version: string;
  /** ISO date when this version takes effect. */
  effective_at: string;
  /** Short summary used in lists. */
  summary: string;
}

export interface Document {
  meta: DocumentMeta;
  /** Raw Markdown body. */
  body: string;
}

/** Minimal frontmatter shape we accept. Loose typing because the
 *  loader validates at runtime and the renderer is defensive. */
export interface Frontmatter {
  type?: string;
  title?: string;
  version?: string;
  effective_at?: string;
  summary?: string;
}
