/**
 * Kaikōrero shared types and constants.
 *
 * Lives in a non-"use server" module so it can export sync values
 * (constants, types) and be safely imported from both client and server
 * contexts. Server actions live in src/lib/actions/kaikorero-profile.ts.
 */

/* -------------------------------------------------------------------------- */
/* Knowledge domain enum — kept in sync with `knowledge_domain` pg enum.      */
/* The UI uses the english label; the database stores the enum value verbatim.*/
/* -------------------------------------------------------------------------- */

export const KNOWLEDGE_DOMAINS = [
  "reo_matatini",
  "reo_korero",
  "purakau",
  "whakapapa",
  "tikanga",
  "kapa_haka",
  "waiata",
  "taonga_puoro",
  "whakairo",
  "raranga",
  "kai",
  "whenua",
  "tikanga_digital",
  "matauranga_taiao",
  "other",
] as const;
export type KnowledgeDomain = (typeof KNOWLEDGE_DOMAINS)[number];

/**
 * Human-readable label for each knowledge domain. Used in the dashboard
 * edit form and the public profile page. Server-friendly (no React, no DOM).
 */
export const DOMAIN_LABEL: Record<KnowledgeDomain, string> = {
  reo_matatini: "Reo matatini",
  reo_korero: "Reo kōrero",
  purakau: "Pūrākau",
  whakapapa: "Whakapapa",
  tikanga: "Tikanga",
  kapa_haka: "Kapa haka",
  waiata: "Waiata",
  taonga_puoro: "Taonga pūoro",
  whakairo: "Whakairo",
  raranga: "Raranga",
  kai: "Kai",
  whenua: "Whenua",
  tikanga_digital: "Tikanga matihiko",
  matauranga_taiao: "Mātauranga taiao",
  other: "Other",
};

/** Shape of one knowledge area as submitted in form data. */
export interface KnowledgeAreaInput {
  domain: KnowledgeDomain;
  scope_iwi?: string;
  scope_region?: string;
}

/**
 * Result union for kaikorero profile server actions.
 * Mirrors the pattern in src/lib/actions/cultural-review.ts.
 */
export interface KaikoreroProfileState {
  error?: string;
  success?: string;
  /** Echoed back on success so the UI can reflect what was saved */
  saved?: {
    bioLength: number;
    kaikoreroVisible: boolean;
    availableForTono: boolean;
    knowledgeAreaCount: number;
    iwiClaimed: string[];
  };
}

/**
 * A persisted knowledge area joined from the DB. Used by both the
 * dashboard edit form (to seed the initial values) and the public
 * profile page (to render the discovery surface).
 */
export interface ProfileKnowledgeArea {
  id: string;
  domain: KnowledgeDomain;
  scope_iwi: string | null;
  scope_region: string | null;
  attested_at: string;
}
