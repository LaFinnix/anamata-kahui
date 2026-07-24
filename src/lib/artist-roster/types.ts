/**
 * Artist roster — type definitions and label maps.
 *
 * Mirrors the public.artist_roster table (migration 0032). The Roster
 * is the single source of truth for "is this artist signed to this
 * branch's roster?"
 *
 * The four statuses form a small lifecycle:
 *   prospect  →  active  →  paused  →  active | departed
 *
 * Transitions (enforced at the application layer; the DB only
 * enforces "at most one active per (profile, branch)"):
 *   prospect → active          (signing event)
 *   active   → paused          (relationship on hold)
 *   paused   → active          (re-engagement)
 *   active   → departed        (clean exit)
 *   paused   → departed        (clean exit from paused)
 *   departed → (terminal)      (no transitions out of departed)
 *   prospect → (back to prospect, or → departed)
 */

export const ROSTER_STATUSES = [
  "prospect",
  "active",
  "paused",
  "departed",
] as const;

export type RosterStatus = (typeof ROSTER_STATUSES)[number];

export const ROSTER_STATUS_LABEL: Record<RosterStatus, string> = {
  prospect: "Prospect",
  active: "Active",
  paused: "Paused",
  departed: "Departed",
};

/** Allowed status transitions. Used by the action layer to validate
 *  before writing. Not enforced by the DB. */
export const ROSTER_STATUS_TRANSITIONS: Record<
  RosterStatus,
  readonly RosterStatus[]
> = {
  prospect: ["active", "departed"],
  active: ["paused", "departed"],
  paused: ["active", "departed"],
  departed: [],
};

/** True if the transition is allowed. */
export function canTransition(
  from: RosterStatus,
  to: RosterStatus,
): boolean {
  if (from === to) return true; // no-op allowed
  return ROSTER_STATUS_TRANSITIONS[from].includes(to);
}

/** DB row shape (matches public.artist_roster exactly). */
export interface ArtistRosterRow {
  id: string;
  profile_id: string;
  branch_id: string;
  status: RosterStatus;
  on_roster_publicly: boolean;
  opted_in_public: boolean;
  role_summary: string | null;
  created_by: string | null;
  created_at: string;
  last_modified_by: string | null;
  last_modified_at: string;
  status_changed_by: string | null;
  status_changed_at: string;
  departed_at: string | null;
  departed_reason: string | null;
  internal_notes: string | null;
}

/** Roster row joined with the profile + branch for display. */
export interface ArtistRosterEntry extends ArtistRosterRow {
  profile: {
    id: string;
    full_name: string | null;
    iwi_affiliation_attested: string[] | null;
  };
  branch: {
    id: string;
    slug: "records" | "research" | "arts" | "dev";
    name: string;
  };
}
