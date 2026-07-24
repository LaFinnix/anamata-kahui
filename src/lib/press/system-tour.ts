/**
 * System tour — text source shared between the HTML page and the PDF pack.
 *
 * The HTML tour renders this with real UI components (chips, TonoCard,
 * CollaborationActivityRow). The PDF renders a condensed text-only
 * version of the same 6 stops, prioritising the cultural-integrity
 * decisions that funders care about.
 *
 * Keeping the text in one place ensures the two surfaces stay aligned —
 * if you change a stop's decision rationale here, both the HTML tour
 * and the PDF reflect the change.
 */

export interface TourStop {
  /** 1-indexed step number */
  n: number;
  /** Title shown as the stop heading */
  title: string;
  /** Short subtitle shown next to the title */
  subtitle: string;
  /** 1-2 sentence intro paragraph */
  intro: string;
  /** Cultural-integrity decision rationale — the part funders care about most */
  designNote: string;
}

export const TOUR_STOPS: TourStop[] = [
  {
    n: 1,
    title: "A kaikōrero joins and declares their knowledge",
    subtitle: "Discovery surface, not a profile-page selfie",
    intro:
      "A new kaikōrero sets their cultural-knowledge areas (with iwi or region scope), declares their iwi affiliations, and opts into the public directory. Both opt-in flags must be set for the profile to render publicly — one gate alone is not enough.",
    designNote:
      "The platform does not collect demographic data speculatively. Knowledge areas are declared by the person who carries them, scoped to the iwi or region where that knowledge lives. Attestation is a separate signal that emerges from contribution, not self-assertion.",
  },
  {
    n: 2,
    title: "A tono is posted — a call for cross-iwi help",
    subtitle: "Asking the kāhui, not asking one person",
    intro:
      "When a creator needs cultural verification, te reo review, mentorship, or a co-creator for a release, they post a tono. They pick a help type, a knowledge area, an optional iwi/region scope, and a visibility tier (open, iwi_specific, or invited).",
    designNote:
      "Open tono are dashboard-private by design. The public surface only ever shows resolved tono (fulfilled, closed, withdrawn). This is the §5.1 cultural-integrity rule: the work-in-progress of asking for help is dignified space, not performance.",
  },
  {
    n: 3,
    title: "The tono inbox — filtered by attested iwi and knowledge area",
    subtitle: "Discovery via specificity, not search",
    intro:
      "Other kaikōrero see open tono in their dashboard inbox. The list is filtered server-side by their attested iwi affiliations (iwi_specific tono only surface to attested members) and optional knowledge-area filter. No one sees all open tono — that's a privacy and quality-of-attention decision.",
    designNote:
      "iwi_specific visibility is checked against attested, not claimed, iwi affiliations. The 30-day promotion window from claimed to attested is the §4.9 layered-defence mechanism that prevents casual impersonation. No amount of clicking 'I belong to iwi X' on a form gives someone access to iwi-X-private tono.",
  },
  {
    n: 4,
    title: "Proposal + acceptance — the working loop",
    subtitle: "Mutual commitment, mutual visibility",
    intro:
      "A proposer writes what they can contribute, what koha they accept (often $0, often co-credit, often 'reciprocity later'). The creator accepts, declines, or counter-proposes. Once accepted, the tono moves to in_conversation — visible only to the two parties.",
    designNote:
      "Proposals and decline reasons stay private to the two parties. Only the resolved outcome (fulfilled) joins the public lineage. This is the reciprocal trust space: creators and helpers can be honest because the conversation isn't on display.",
  },
  {
    n: 5,
    title: "Cultural review + auto-endorsement — the kaitiaki gate",
    subtitle: "Verification, append-only lineage",
    intro:
      "When the work lands, the kaitiaki reviews the release. Approval auto-creates a co_creator endorsement for every split_participant on the release, with their contribution_count bumped by one. The cultural-review audit row stands regardless of endorsement creation success — the gate is sacred, the endorsements are derived state.",
    designNote:
      "Endorsements are append-only with revocation. Once an endorsement is given, the only change is revocation (with reason visible to all parties and on the public profile). The revocation, not deletion, is the §4 transparency mechanism. kaitiaki can withdraw their cultural standing for a work, and the lineage records that they did.",
  },
  {
    n: 6,
    title: "The public lineage — visible, append-only, no aggregates",
    subtitle: "The work, not the popularity",
    intro:
      "The kaikōrero's public profile now shows their contribution lineage — who endorsed them, for what knowledge, scoped to which iwi or work. A separate public collaborations index surfaces resolved activity across the kāhui, filterable by iwi and knowledge area. There are no leaderboards, no 'top collaborators', no aggregate counts on individuals.",
    designNote:
      "Specificity over aggregation (PLAN §4.3). A kaikōrero with 47 endorsements doesn't appear more credible than one with 4 — because we don't surface the 47. We surface the specific endorsements: 'Hine carries the pūrākau of Tāne' is verifiable. '47 endorsements' is gamification dressed as credibility.",
  },
];
