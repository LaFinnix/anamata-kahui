/**
 * Tono (help-request) shared types and constants.
 *
 * Lives in a non-"use server" module so it can export sync values
 * (constants, types) and be safely imported from both client and server
 * contexts. Server actions live in src/lib/actions/tono.ts.
 */

import type { KnowledgeDomain } from "@/lib/kaikorero/types";

// Re-export the knowledge domain so consumers can import everything tono
// needs from one place.
export type { KnowledgeDomain };

/* -------------------------------------------------------------------------- */
/* Enums — kept in sync with pg enums in migration 0027_tono.sql               */
/* -------------------------------------------------------------------------- */

export const TONO_STATUSES = [
  "open",             // seeking responses
  "in_conversation",  // a proposal has been accepted; in progress
  "fulfilled",        // work landed; ended well
  "closed",           // creator closed without fulfilling (still public)
  "withdrawn",        // creator withdrew the request
] as const;
export type TonoStatus = (typeof TONO_STATUSES)[number];

export const TONO_HELP_TYPES = [
  "verify_narrative", // need someone to verify a pūrākau reference
  "verify_reo",       // need te reo verification
  "co_create",        // looking for a collaborator
  "review_cultural",  // need cultural review (formal kaitiaki role)
  "translate",        // need translation
  "compose",          // need a composer / arranger
  "produce",          // need a producer
  "mentor",           // looking for mentorship on a work
  "feedback",         // want creative feedback
  "place_name",       // need verification of place names
  "other",
] as const;
export type TonoHelpType = (typeof TONO_HELP_TYPES)[number];

export const TONO_VISIBILITIES = [
  "open",          // anyone can see and propose
  "invited",       // only named invitees
  "iwi_specific",  // only people whose iwi_affiliation_attested matches scope_iwi
] as const;
export type TonoVisibility = (typeof TONO_VISIBILITIES)[number];

export const PROPOSAL_STATUSES = [
  "pending",   // awaiting creator response
  "accepted",  // creator accepted; relationship begins
  "declined",  // creator declined
  "withdrawn", // proposer withdrew before creator responded
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/* -------------------------------------------------------------------------- */
/* Human-readable labels — used in the dashboard UI.                         */
/* -------------------------------------------------------------------------- */

export const TONO_STATUS_LABEL: Record<TonoStatus, string> = {
  open: "Open",
  in_conversation: "In conversation",
  fulfilled: "Fulfilled",
  closed: "Closed",
  withdrawn: "Withdrawn",
};

export const TONO_HELP_TYPE_LABEL: Record<TonoHelpType, string> = {
  verify_narrative: "Verify a narrative",
  verify_reo: "Verify te reo",
  co_create: "Co-create",
  review_cultural: "Cultural review",
  translate: "Translate",
  compose: "Compose / arrange",
  produce: "Produce",
  mentor: "Mentorship",
  feedback: "Creative feedback",
  place_name: "Verify place names",
  other: "Other",
};

export const TONO_VISIBILITY_LABEL: Record<TonoVisibility, string> = {
  open: "Open",
  invited: "Invited only",
  iwi_specific: "Iwi-specific",
};

/* -------------------------------------------------------------------------- */
/* Action state union — discriminated result pattern.                          */
/* -------------------------------------------------------------------------- */

export interface TonoState {
  error?: string;
  success?: string;
  tonoId?: string;
  proposalId?: string;
  /** Number of endorsements auto-created on fulfillment */
  endorsementsCreated?: number;
}

/* -------------------------------------------------------------------------- */
/* Hydrated row shapes — for displaying tonos in the dashboard.               */
/* -------------------------------------------------------------------------- */

export interface TonoRow {
  id: string;
  creator_id: string;
  work_id: string | null;
  help_type: TonoHelpType;
  knowledge_domain: KnowledgeDomain | null;
  scope_iwi: string | null;
  scope_region: string | null;
  request_body: string;
  offered_koha: string | null;
  koha_is_monetary: boolean;
  visibility: TonoVisibility;
  status: TonoStatus;
  fulfilled_by: string | null;
  fulfilled_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface TonoWithCounts extends TonoRow {
  proposal_count: number;
}

export interface TonoProposalRow {
  id: string;
  tono_id: string;
  proposer_id: string;
  proposal_body: string;
  proposed_koha: string | null;
  estimated_hours: number | null;
  available_from: string | null;
  status: ProposalStatus;
  decided_at: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TonoProposalWithProposer extends TonoProposalRow {
  proposer: {
    id: string;
    full_name: string | null;
    role: string | null;
    iwi_affiliation_attested: string[] | null;
    contribution_count: number | null;
  } | null;
  tono?: TonoRow | null;
}
