/**
 * Shared types for the Anamata Kāhui platform.
 *
 * These mirror the Postgres schema defined in
 * `supabase/migrations/0001_initial_schema.sql`.
 * If you change the schema, update the matching type here.
 */

export type UserRole =
  | "super_admin"
  | "branch_admin"
  | "kaitiaki"
  | "artist"
  | "researcher"
  | "client";

export type BranchSlug = "records" | "research" | "arts" | "dev";

export type BranchRole = "lead" | "admin" | "member" | "guest";

export type ReleaseStatus = "draft" | "scheduled" | "released" | "archived";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  // Cultural metadata (migration 0002)
  iwi_affiliation: string[];
  te_reo_proficiency: "none" | "basic" | "intermediate" | "advanced" | "first_language" | null;
  preferred_language: string | null;
  region: string | null;
  opted_in_public_directory: boolean;
  data_export_requested_at: string | null;
  data_deletion_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CulturalSensitivity =
  | "open"
  | "attributed"
  | "kaitiaki_gated"
  | "tapu"
  | "restricted_iwi";

export interface IwiGate {
  id: string;
  iwi_name: string;
  hapu_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  scope: "public" | "iwi_only" | "hapu_only" | "restricted" | "tapu";
  applies_to_kind: "release" | "research_doc" | "stem" | "artist" | "general";
  applies_to_id: string | null;
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  granted_by: string | null;
  notes: string | null;
}

export interface ConsentLogEntry {
  id: string;
  iwi_gate_id: string | null;
  actor_id: string | null;
  action:
    | "granted"
    | "amended"
    | "revoked"
    | "expired"
    | "requested_withdrawal"
    | "reviewed";
  notes: string | null;
  at: string;
}

export interface KaitiakiRoopuMember {
  id: string;
  profile_id: string;
  scope: "platform" | "branch" | "iwi" | "project";
  branch_id: string | null;
  iwi_name: string | null;
  term_started_at: string;
  term_ends_at: string | null;
  voting_weight: number;
  is_active: boolean;
  notes: string | null;
}

// Research — migration 0004
export type ResearchDocStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "published"
  | "retracted";

export interface ResearchDocument {
  id: string;
  branch_id: string;
  title: string;
  abstract: string | null;
  publication_date: string | null;
  doi: string | null;
  pdf_url: string | null;
  language_code: string | null;
  iwi_consent_id: string | null;
  access_tier: "open" | "iwi_only" | "restricted" | "tapu";
  methodology: string | null;
  venue: string | null;
  status: ResearchDocStatus;
  keywords: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ResearchDocumentAuthor {
  id: string;
  document_id: string;
  author_profile_id: string | null;
  author_name: string | null;
  affiliation: string | null;
  position: number;
  is_corresponding: boolean;
}

export interface ResearchDocumentCitation {
  id: string;
  document_id: string;
  cited_doc_id: string | null;
  cited_release_id: string | null;
  external_url: string | null;
  citation_text: string | null;
}

export type FieldProjectStatus =
  | "planning"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export interface ResearchFieldProject {
  id: string;
  title: string;
  lead_profile_id: string | null;
  iwi_consent_id: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: FieldProjectStatus;
  summary: string | null;
  methodology: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  slug: BranchSlug;
  name: string;
  description: string | null;
  created_at: string;
}

export interface UserBranch {
  id: string;
  user_id: string;
  branch_id: string;
  role: BranchRole;
  created_at: string;
}

export interface Release {
  id: string;
  artist_id: string;
  branch_id: string;
  title: string;
  description: string | null;
  release_date: string | null;
  upc_isrc: string | null;
  cover_art_url: string | null;
  status: ReleaseStatus;
  metadata: Record<string, unknown>;
  // Cultural metadata (migration 0002)
  language_code: string | null;
  iwi_consent_id: string | null;
  cultural_sensitivity: CulturalSensitivity;
  upc: string | null;
  isrc: string | null;
  parental_advisory: string | null;
  territory_rights: Record<string, unknown>;
  distributors: unknown[];
  created_at: string;
  updated_at: string;
}

export interface Stem {
  id: string;
  release_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  // Cultural metadata (migration 0002)
  instrument: string | null;
  version: number;
  license: string | null;
  cultural_sensitivity: CulturalSensitivity;
  uploaded_by: string | null;
  created_at: string;
}

/** A user's effective access within a single branch. */
export interface BranchAccess {
  branch: Branch;
  role: BranchRole;
}
