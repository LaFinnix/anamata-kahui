/**
 * Document design system — the source of truth.
 *
 * Used by:
 *   - Web components: src/components/documents/*
 *   - PDF renderer: src/lib/documents/render-to-pdf.tsx (and downstream)
 *   - Funder Kit PDF: src/lib/press/funder-kit-pdf.tsx (refactor target)
 *
 * Why a single source: when the brand colour shifts, both the web page and
 * the generated PDF change in one place. When the legal-document typography
 * changes, every formal document picks it up. No drift.
 *
 * Token categories:
 *   - colors:  brand palette (bronze, pounamu) + neutrals (ink, paper, rule)
 *   - type:    type scale (legal h1, h2, h3, body, small, micro)
 *   - space:   8px-base spacing scale
 *   - rules:   decorative rules (under section heads, etc.)
 *   - layout:  page-level layout (max widths, page margins for PDF)
 *
 * The web components use the same key names as the PDF components, so a
 * design change is a single-line edit in two consumers.
 */

export const colors = {
  // Brand
  bronze:        "#A17B4F",
  bronzeLight:   "#D4B98C",
  bronzeDark:    "#5C4528",
  bronzeMuted:   "#8A6E4C",
  pounamu:       "#3D6B5E",
  pounamuLight:  "#5A8B7E",
  pounamuDark:   "#28463D",

  // Neutrals
  ink:           "#1A1A1A",  // primary text on light
  inkSoft:       "#4A4A4A",  // secondary text on light
  inkMuted:      "#7A7A7A",  // tertiary / metadata on light
  paper:         "#FAF7F2",  // page background (warm off-white)
  paperWhite:    "#FFFFFF",  // pure white for content surfaces
  rule:          "#E0D9CC",  // hairlines
  ruleStrong:    "#C9BFA9",  // heavier rules for legal docs
  surface:       "#F0EAD9",  // callout box bg
  surfaceMuted:  "#F4EFE3",  // subtle surface
  surfaceWarn:   "#FCEAC9",  // warning surface
  surfaceDanger: "#F7D6CC",  // danger / error surface
} as const;

export const type = {
  // Document titles
  legalH1:    { fontSize: 26, lineHeight: 1.2, weight: 700 },
  legalH2:    { fontSize: 18, lineHeight: 1.3, weight: 700 },
  legalH3:    { fontSize: 14, lineHeight: 1.35, weight: 600 },
  // Body
  bodyLg:     { fontSize: 12, lineHeight: 1.55, weight: 400 },
  body:       { fontSize: 11, lineHeight: 1.55, weight: 400 },
  small:      { fontSize: 9,  lineHeight: 1.45, weight: 400 },
  micro:      { fontSize: 7,  lineHeight: 1.4,  weight: 400, letterSpacing: 0.5 },
  // Emphasis
  bodyBold:   { fontSize: 11, lineHeight: 1.55, weight: 600 },
  // Special — for legal clause numbers and signature blocks
  clauseNum:  { fontSize: 9,  fontFamily: "Courier", weight: 400 },
  signature:  { fontSize: 13, fontFamily: "Helvetica-Oblique", weight: 400 },
  // Mono / codes / signatures / audit
  mono:       { fontSize: 9,  fontFamily: "Courier" },
} as const;

export const space = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

/** Decorative rules (in points, for PDF) / pixel CSS for web. */
export const rules = {
  hairline: 0.5,
  thin:     1,
  thick:    2,
} as const;

/** Page-level layout. PDF uses these directly. Web pages use the
 *  same concept but with CSS units. */
export const page = {
  // A4 portrait
  a4: { width: 595, height: 842 },
  // Standard margins (1cm = ~28pt)
  marginPt: 56,
} as const;

/** Type alias for a token palette. Both web and PDF components accept
 *  this shape so a different theme (e.g. print, dark) can be slotted in. */
export type Tokens = {
  colors: typeof colors;
  type: typeof type;
  space: typeof space;
  rules: typeof rules;
  page: typeof page;
};

export const tokens: Tokens = { colors, type, space, rules, page };
