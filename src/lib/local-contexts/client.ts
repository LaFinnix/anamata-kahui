/**
 * Local Contexts Hub client.
 *
 * Local Contexts (https://localcontexts.org) provides the canonical standard
 * for Traditional Knowledge (TK) and Biocultural (BC) labels — machine-readable
 * metadata that travels with digital assets.
 *
 * The Hub has a public REST API for label lookups; this client wraps it.
 * For v1 we only fetch label metadata (no Hub project creation) because
 * artists can create projects at https://localcontexts.org/projects/ then
 * reference the project_id from this platform.
 *
 * If `LOCAL_CONTEXTS_API_URL` is not configured, we fall back to the
 * canonical catalogue already stored in our DB (lc_labels table). This is
 * the default mode — fully offline-capable.
 */

export type LabelFamily = "tk" | "bc" | "notice";

export interface LcLabel {
  id: string;
  slug: string;
  family: LabelFamily;
  label: string;
  description: string;
  canonical_url: string | null;
  requires_attribution: boolean;
  is_non_commercial: boolean;
}

export interface LcLabelLink {
  id: string;
  release_id: string | null;
  research_document_id: string | null;
  label_id: string;
  applied_by: string;
  applied_at: string;
  evidence_url: string | null;
  scope: string | null;
  status: "active" | "removed" | "superseded";
  label?: LcLabel;
  applied_by_profile?: { full_name: string | null; email: string };
}

const HUB_BASE_URL =
  process.env.LOCAL_CONTEXTS_API_URL ?? "https://api.localcontexts.org/v1";

/**
 * Fetch the canonical label catalogue from the Local Contexts Hub.
 * Falls back to embedded seed data if the API is unreachable.
 */
export async function fetchHubLabels(): Promise<LcLabel[]> {
  try {
    const res = await fetch(`${HUB_BASE_URL}/labels`, {
      next: { revalidate: 3600 }, // 1-hour cache
      headers: {
        "Accept": "application/json",
      },
    });
    if (!res.ok) throw new Error(`Hub ${res.status}`);
    const data = await res.json();
    return data.labels ?? [];
  } catch (e) {
    console.warn("Local Contexts Hub unreachable, using cached catalogue:", e);
    return getEmbeddedCatalogue();
  }
}

/**
 * Embedded canonical label catalogue (fallback when the Hub is unreachable).
 * Source: https://localcontexts.org/labels — last verified 2026-07-22.
 *
 * Keep in sync with the lc_labels seed in 0011_local_contexts.sql.
 */
export function getEmbeddedCatalogue(): LcLabel[] {
  return [
    { id: "tk_attribution", slug: "tk_attribution", family: "tk", label: "TK Attribution", description: "Traditional Knowledge should be attributed to the community of origin.", canonical_url: "https://localcontexts.org/label/tk-attribution/", requires_attribution: true, is_non_commercial: false },
    { id: "tk_non_commercial", slug: "tk_non_commercial", family: "tk", label: "TK Non-Commercial", description: "Traditional Knowledge may not be used for commercial purposes.", canonical_url: "https://localcontexts.org/label/tk-non-commercial/", requires_attribution: true, is_non_commercial: true },
    { id: "tk_clan", slug: "tk_clan", family: "tk", label: "TK Clan", description: "Traditional Knowledge is restricted to a specific clan.", canonical_url: "https://localcontexts.org/label/tk-clan/", requires_attribution: true, is_non_commercial: false },
    { id: "tk_family", slug: "tk_family", family: "tk", label: "TK Family", description: "Traditional Knowledge is restricted to a specific family.", canonical_url: "https://localcontexts.org/label/tk-family/", requires_attribution: true, is_non_commercial: false },
    { id: "tk_outreach", slug: "tk_outreach", family: "tk", label: "TK Outreach", description: "Traditional Knowledge may be used for educational outreach only.", canonical_url: "https://localcontexts.org/label/tk-outreach/", requires_attribution: true, is_non_commercial: false },
    { id: "tk_verified", slug: "tk_verified", family: "tk", label: "TK Verified", description: "Traditional Knowledge attribution has been verified by a kaitiaki or community representative.", canonical_url: "https://localcontexts.org/label/tk-verified/", requires_attribution: false, is_non_commercial: false },
    { id: "tk_creative", slug: "tk_creative", family: "tk", label: "TK Creative", description: "Traditional Knowledge may be adapted or built upon for new creative works.", canonical_url: "https://localcontexts.org/label/tk-creative/", requires_attribution: true, is_non_commercial: false },
    { id: "tk_secret_sacred", slug: "tk_secret_sacred", family: "tk", label: "TK Secret / Sacred", description: "Traditional Knowledge is secret or sacred. Do not share publicly.", canonical_url: "https://localcontexts.org/label/tk-secret-sacred/", requires_attribution: true, is_non_commercial: false },
    { id: "tk_sensitive_men", slug: "tk_sensitive_men", family: "tk", label: "TK Men", description: "Traditional Knowledge is restricted to men.", canonical_url: "https://localcontexts.org/label/tk-men/", requires_attribution: true, is_non_commercial: false },
    { id: "tk_sensitive_wen", slug: "tk_sensitive_women", family: "tk", label: "TK Women", description: "Traditional Knowledge is restricted to women.", canonical_url: "https://localcontexts.org/label/tk-women/", requires_attribution: true, is_non_commercial: false },
    { id: "tk_sensitive_children", slug: "tk_sensitive_children", family: "tk", label: "TK Children", description: "Traditional Knowledge is restricted to children.", canonical_url: "https://localcontexts.org/label/tk-children/", requires_attribution: true, is_non_commercial: false },
    { id: "bc_provenance", slug: "bc_provenance", family: "bc", label: "BC Provenance", description: "Indicates the biocultural origin of a specimen or biological sample.", canonical_url: "https://localcontexts.org/label/bc-provenance/", requires_attribution: true, is_non_commercial: false },
    { id: "bc_consent_verified", slug: "bc_consent_verified", family: "bc", label: "BC Consent Verified", description: "Biocultural provenance has been verified by community consent.", canonical_url: "https://localcontexts.org/label/bc-consent-verified/", requires_attribution: true, is_non_commercial: false },
    { id: "bc_open_to_collaboration", slug: "bc_open_to_collaboration", family: "bc", label: "BC Open to Collaboration", description: "The community is open to collaboration on this biocultural material.", canonical_url: "https://localcontexts.org/label/bc-open-to-collaboration/", requires_attribution: true, is_non_commercial: false },
    { id: "bc_consent_optional", slug: "bc_consent_optional", family: "bc", label: "BC Consent Optional", description: "Biocultural origin tracking is encouraged but not required.", canonical_url: "https://localcontexts.org/label/bc-consent-optional/", requires_attribution: false, is_non_commercial: false },
    { id: "bc_creative", slug: "bc_creative", family: "bc", label: "BC Creative", description: "Biocultural material may be adapted for creative works.", canonical_url: "https://localcontexts.org/label/bc-creative/", requires_attribution: true, is_non_commercial: false },
    { id: "notice_open_with_care", slug: "notice_open_with_care", family: "notice", label: "Open with CARE", description: "This material is shared with the CARE Principles for Indigenous Data Governance in mind.", canonical_url: "https://localcontexts.org/label/notice-open-with-care/", requires_attribution: false, is_non_commercial: false },
    { id: "notice_open_with_attribution", slug: "notice_open_with_attribution", family: "notice", label: "Open with Attribution", description: "Open-source notice requiring attribution to the community of origin.", canonical_url: "https://localcontexts.org/label/notice-open-with-attribution/", requires_attribution: true, is_non_commercial: false },
    { id: "notice_research_only", slug: "notice_research_only", family: "notice", label: "Research Only", description: "Notice restricting use to research contexts only.", canonical_url: "https://localcontexts.org/label/notice-research-only/", requires_attribution: false, is_non_commercial: false },
    { id: "notice_community_voice", slug: "notice_community_voice", family: "notice", label: "Community Voice", description: "Community voice notice — the community retains editorial authority.", canonical_url: "https://localcontexts.org/label/notice-community-voice/", requires_attribution: true, is_non_commercial: false },
    { id: "notice_kaitiaki_consultation", slug: "notice_kaitiaki_consultation", family: "notice", label: "Kaitiaki Consultation", description: "Kaitiaki have been consulted and have provided input on this material.", canonical_url: "https://localcontexts.org/label/notice-kaitiaki-consultation/", requires_attribution: true, is_non_commercial: false },
  ];
}

/**
 * Compose a machine-readable XMP-style metadata block for an asset.
 * This is the format Local Contexts projects emit, and what downstream
 * tools (Adobe, DaVinci, etc.) parse to surface usage protocols.
 */
export function composeXmpMetadata(labelLinks: LcLabelLink[]): string {
  const active = labelLinks.filter((l) => l.status === "active");
  const blocks = active
    .map((l) => {
      const fam = l.label?.family ?? "notice";
      const slug = l.label?.slug ?? "unknown";
      return `  <rdf:li>localcontexts:${fam}:${slug}</rdf:li>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:localcontexts="https://localcontexts.org/ns/">
  <rdf:Bag>
${blocks || "  <!-- no active labels -->"}
  </rdf:Bag>
</rdf:RDF>`;
}
