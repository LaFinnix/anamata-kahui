/**
 * Notifications — shared types and constants.
 *
 * Notifications live in public.notifications (migration 0028). The
 * `kind` column is text (not a PG enum) so new kinds can be added
 * without a migration — when introducing a new kind, add the label
 * here AND update the runbook addendum (see docs/RUNBOOK.md).
 */

export type NotificationKind =
  | "endorsement_received"
  | "endorsement_revoked"
  | "tono_proposal_received"
  | "tono_proposal_accepted"
  | "tono_proposal_declined"
  | "tono_fulfilled";

/** Display labels for each kind. Two sources:
 *   - `KIND_LABEL`: short, for inline use (badges, dropdown rows)
 *   - `KIND_GROUP`: which inbox tab the notification falls into
 */
export const KIND_LABEL: Record<NotificationKind, string> = {
  endorsement_received: "Endorsement received",
  endorsement_revoked: "Endorsement revoked",
  tono_proposal_received: "Proposal received",
  tono_proposal_accepted: "Proposal accepted",
  tono_proposal_declined: "Proposal declined",
  tono_fulfilled: "Tono fulfilled",
};

export const KIND_GROUP: Record<NotificationKind, "endorsement" | "tono"> = {
  endorsement_received: "endorsement",
  endorsement_revoked: "endorsement",
  tono_proposal_received: "tono",
  tono_proposal_accepted: "tono",
  tono_proposal_declined: "tono",
  tono_fulfilled: "tono",
};

/** Hydrated row shape — what we read from the DB. */
export interface NotificationRow {
  id: string;
  recipient_id: string;
  kind: NotificationKind;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/** Result union for the mark-as-read server action. */
export interface NotificationActionState {
  error?: string;
  success?: string;
}

/**
 * Derive a human-readable title for a notification row by inspecting its
 * payload. The payload schema is set by the action that creates the row
 * (see src/lib/actions/endorsements.ts + src/lib/actions/tono.ts + cultural-review.ts).
 */
export function notificationTitle(n: NotificationRow): string {
  const p = n.payload as Record<string, unknown>;
  switch (n.kind) {
    case "endorsement_received": {
      const work = (p.work_id as string | undefined) ? " on this work" : "";
      return `${KIND_LABEL[n.kind]}${work}`;
    }
    case "endorsement_revoked":
      return KIND_LABEL[n.kind];
    case "tono_proposal_received":
      return KIND_LABEL[n.kind];
    case "tono_proposal_accepted":
      return KIND_LABEL[n.kind];
    case "tono_proposal_declined":
      return KIND_LABEL[n.kind];
    case "tono_fulfilled":
      return KIND_LABEL[n.kind];
    default:
      return n.kind;
  }
}

/**
 * Derive the URL the notification should link to. Falls back to the inbox.
 * If the related entity (work, tono, profile) exists, link there.
 */
export function notificationLink(n: NotificationRow): string {
  const p = n.payload as Record<string, unknown>;
  const tonoId = p.tono_id as string | undefined;
  if (tonoId) return `/tono/${tonoId}`;
  const workId = p.work_id as string | undefined;
  if (workId) {
    // v1.1: we don't yet have a generic /release/[id] page; link to the
    // waiata page if a slug exists in the payload, else to /releases.
    const slug = p.work_slug as string | undefined;
    if (slug) return `/[locale]/waiata/${slug}`;
    return "/releases";
  }
  const recipientId = p.endorser_id as string | undefined;
  if (recipientId) return `/[locale]/artist/${recipientId}`;
  return "/notifications";
}
