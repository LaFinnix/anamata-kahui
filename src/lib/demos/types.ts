/**
 * Demos — types and label maps.
 *
 * A demo is a pre-release work-in-progress file that an artist uploads
 * before it becomes a release. It walks the cultural review pipeline:
 *
 *   draft  →  pending_review  →  approved  →  promoted
 *                          ↘  rejected (terminal)
 *
 * Once approved, an admin can promote it. Promotion creates a release
 * (in a future phase) and sets demos.release_id.
 *
 * Why "rejected" is terminal: rather than allow the artist to edit
 * a rejected demo back to draft, the artist re-uploads a new demo.
 * This preserves the audit trail of what was rejected and why.
 */

export const DEMO_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "promoted",
] as const;

export type DemoStatus = (typeof DEMO_STATUSES)[number];

export const DEMO_STATUS_LABEL: Record<DemoStatus, string> = {
  draft:          "Draft",
  pending_review: "Pending review",
  approved:       "Approved",
  rejected:       "Rejected",
  promoted:       "Promoted",
};

/** Allowed status transitions. */
export const DEMO_STATUS_TRANSITIONS: Record<
  DemoStatus,
  readonly DemoStatus[]
> = {
  draft:          ["pending_review"],
  pending_review: ["approved", "rejected"],
  approved:       ["promoted", "pending_review"], // re-review request
  rejected:       [],                              // terminal
  promoted:       [],                              // terminal — it's a release now
};

export function canDemoTransition(from: DemoStatus, to: DemoStatus): boolean {
  if (from === to) return true;
  return DEMO_STATUS_TRANSITIONS[from].includes(to);
}

/** DB row shape (matches public.demos). */
export interface DemoRow {
  id: string;
  artist_roster_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_mime: string;
  file_size_bytes: number;
  file_duration_seconds: number | null;
  status: DemoStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  release_id: string | null;
  created_by: string | null;
  created_at: string;
  last_modified_by: string | null;
  last_modified_at: string;
}

/** Demo joined with roster + profile for display. */
export interface DemoWithRoster extends DemoRow {
  roster: {
    id: string;
    profile_id: string;
    branch_id: string;
    status: import("@/lib/artist-roster/types").RosterStatus;
    branch: {
      id: string;
      slug: "records" | "research" | "arts" | "dev";
      name: string;
    };
    profile: {
      id: string;
      full_name: string | null;
    };
  };
}
