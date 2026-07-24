/**
 * Notification preferences — shared types and defaults.
 *
 * Schema: per-kind (in_app, email) booleans. Lives in
 * `profiles.notification_prefs jsonb` (migration 0031).
 */

import type { NotificationKind } from "@/lib/notifications/types";

/** Per-kind channel toggles. */
export interface ChannelPrefs {
  in_app: boolean;
  email: boolean;
}

/** Full preferences object. Every known kind MUST be present (validated on
 *  write). Unknown keys are stripped. */
export type NotificationPrefs = Record<NotificationKind, ChannelPrefs>;

/** The defaults applied to new profiles (and to the migration column
 *  default). Sourced from v1 design notes (see V1.1 PLAN §"Email fanout"). */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  endorsement_received:  { in_app: true, email: true  },
  endorsement_revoked:   { in_app: true, email: true  },
  tono_proposal_received: { in_app: true, email: true  },
  tono_proposal_accepted: { in_app: true, email: false },
  tono_proposal_declined: { in_app: true, email: false },
  tono_fulfilled:        { in_app: true, email: true  },
};

/** Display order for the UI. Matches the lifecycle of activity. */
export const NOTIFICATION_KIND_ORDER: NotificationKind[] = [
  "endorsement_received",
  "endorsement_revoked",
  "tono_proposal_received",
  "tono_proposal_accepted",
  "tono_proposal_declined",
  "tono_fulfilled",
];

/** Validate a parsed JSON object against the schema. Returns the
 *  normalised prefs (every kind present, defaults filled in for any
 *  missing or invalid entries). */
export function normaliseNotificationPrefs(input: unknown): NotificationPrefs {
  const result: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };
  if (!input || typeof input !== "object") return result;
  const obj = input as Record<string, unknown>;
  for (const kind of NOTIFICATION_KIND_ORDER) {
    const raw = obj[kind];
    if (raw && typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      result[kind] = {
        in_app: typeof r.in_app === "boolean" ? r.in_app : true,
        email: typeof r.email === "boolean" ? r.email : false,
      };
    }
  }
  return result;
}
