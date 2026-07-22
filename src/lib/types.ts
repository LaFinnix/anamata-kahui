/**
 * Shared types for the Anamata Kāhui platform.
 *
 * These mirror the Postgres schema defined in
 * `supabase/migrations/0001_initial_schema.sql`.
 * If you change the schema, update the matching type here.
 */

export type UserRole = "super_admin" | "branch_admin" | "artist" | "researcher" | "client";

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
  uploaded_by: string | null;
  created_at: string;
}

/** A user's effective access within a single branch. */
export interface BranchAccess {
  branch: Branch;
  role: BranchRole;
}
