/**
 * Endorsements shared types and constants.
 *
 * Lives in a non-"use server" module so it can export sync values
 * (constants, types) and be safely imported from both client and server
 * contexts. Server actions live in src/lib/actions/endorsements.ts.
 */

import { KNOWLEDGE_DOMAINS, type KnowledgeDomain } from "@/lib/kaikorero/types";

// Re-export so consumers can import endorsement types + knowledge domain from one place.
export { KNOWLEDGE_DOMAINS, type KnowledgeDomain };

/* -------------------------------------------------------------------------- */
/* Endorsement enums — kept in sync with `endorsement_*` pg enums.            */
/* -------------------------------------------------------------------------- */

export const ENDORSEMENT_TYPES = [
  "source_of_knowledge",
  "cultural_endorsement",
  "co_creator",
  "verification",
  "translation",
  "blessing",
  "mentorship",
] as const;
export type EndorsementType = (typeof ENDORSEMENT_TYPES)[number];

export const ENDORSEMENT_WORK_TYPES = [
  "release",
  "lyric",
  "stem",
  "profile",
] as const;
export type EndorsementWorkType = (typeof ENDORSEMENT_WORK_TYPES)[number];

export const ENDORSEMENT_STATUSES = ["active", "revoked", "superseded"] as const;
export type EndorsementStatus = (typeof ENDORSEMENT_STATUSES)[number];

/* -------------------------------------------------------------------------- */
/* Human-readable labels — used in the dashboard and public surfaces.          */
/* -------------------------------------------------------------------------- */

export const ENDORSEMENT_TYPE_LABEL: Record<EndorsementType, string> = {
  source_of_knowledge: "Source of knowledge",
  cultural_endorsement: "Cultural endorsement",
  co_creator: "Co-creator",
  verification: "Verification",
  translation: "Translation",
  blessing: "Blessing",
  mentorship: "Mentorship",
};

/** Verb form for the UI ("endorsed as a co-creator"). */
export const ENDORSEMENT_TYPE_VERB: Record<EndorsementType, string> = {
  source_of_knowledge: "sourced this knowledge",
  cultural_endorsement: "endorsed this work culturally",
  co_creator: "co-created this work",
  verification: "verified this work",
  translation: "translated or verified reo",
  blessing: "blessed this work",
  mentorship: "mentored on this work",
};

export const ENDORSEMENT_WORK_TYPE_LABEL: Record<EndorsementWorkType, string> = {
  release: "Release",
  lyric: "Lyric",
  stem: "Stem",
  profile: "Profile",
};

/* -------------------------------------------------------------------------- */
/* Action state union — same shape as cultural-review.ts                       */
/* -------------------------------------------------------------------------- */

export interface EndorsementState {
  error?: string;
  success?: string;
  endorsementId?: string;
}

/* -------------------------------------------------------------------------- */
/* Hydrated row shape — for displaying endorsements in the dashboard + UI.    */
/* -------------------------------------------------------------------------- */

export interface EndorsementRow {
  id: string;
  recipient_id: string;
  endorser_id: string;
  work_id: string | null;
  work_type: EndorsementWorkType;
  work_ref: string | null;
  endorsement_type: EndorsementType;
  knowledge_domain: KnowledgeDomain | null;
  scope_iwi: string | null;
  scope_region: string | null;
  notes: string;
  status: EndorsementStatus;
  revoked_reason: string | null;
  revoked_at: string | null;
  superseded_by: string | null;
  created_at: string;
}

/**
 * Lightweight profile summary joined onto an endorsement for display.
 * Used in the dashboard Given/Received tabs and on the public profile page.
 */
export interface EndorsementWithActor extends EndorsementRow {
  endorser: {
    id: string;
    full_name: string | null;
    role: string | null;
    iwi_affiliation_attested: string[] | null;
  } | null;
  recipient: {
    id: string;
    full_name: string | null;
    role: string | null;
    iwi_affiliation_attested: string[] | null;
  } | null;
  work?: {
    id: string;
    title: string;
    slug: string | null;
  } | null;
}
