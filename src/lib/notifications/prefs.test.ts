/**
 * Unit tests for notification-prefs normaliser.
 *
 * The normaliser is the only safety boundary between user-supplied JSON
 * and the stored `notification_prefs` column. It must:
 *   - Always return all 6 known kinds (never partial)
 *   - Coerce unknown values to safe defaults
 *   - Reject malformed input without throwing
 *   - Strip unknown keys
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_KIND_ORDER,
  normaliseNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications/prefs";

describe("normaliseNotificationPrefs", () => {
  it("returns the defaults for null input", () => {
    expect(normaliseNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("returns the defaults for undefined input", () => {
    expect(normaliseNotificationPrefs(undefined)).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("returns the defaults for non-object input", () => {
    expect(normaliseNotificationPrefs("string")).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(normaliseNotificationPrefs(42)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(normaliseNotificationPrefs(true)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(normaliseNotificationPrefs([])).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("always includes all 6 known kinds", () => {
    const result = normaliseNotificationPrefs({});
    for (const kind of NOTIFICATION_KIND_ORDER) {
      expect(result).toHaveProperty(kind);
    }
  });

  it("preserves user-supplied valid values", () => {
    const input = {
      endorsement_received: { in_app: false, email: false },
      tono_fulfilled: { in_app: true, email: true },
    };
    const result = normaliseNotificationPrefs(input);
    expect(result.endorsement_received).toEqual({ in_app: false, email: false });
    expect(result.tono_fulfilled).toEqual({ in_app: true, email: true });
  });

  it("fills in defaults for missing kinds", () => {
    const input = {
      endorsement_received: { in_app: false, email: false },
    };
    const result = normaliseNotificationPrefs(input);
    expect(result.endorsement_received).toEqual({ in_app: false, email: false });
    // Other kinds should match the defaults
    expect(result.endorsement_revoked).toEqual(DEFAULT_NOTIFICATION_PREFS.endorsement_revoked);
    expect(result.tono_fulfilled).toEqual(DEFAULT_NOTIFICATION_PREFS.tono_fulfilled);
  });

  it("coerces non-boolean values to safe defaults", () => {
    const input = {
      endorsement_received: { in_app: "true", email: 1 },
      tono_fulfilled: { in_app: null, email: "false" },
    };
    const result = normaliseNotificationPrefs(input);
    // Non-boolean → falls back to the default for that field
    expect(result.endorsement_received.in_app).toBe(true);
    expect(result.endorsement_received.email).toBe(false);
    expect(result.tono_fulfilled.in_app).toBe(true);
    expect(result.tono_fulfilled.email).toBe(false);
  });

  it("strips unknown kinds", () => {
    const input = {
      endorsement_received: { in_app: true, email: true },
      unknown_kind: { in_app: false, email: false },
      evil_kind: "not even an object",
    };
    const result = normaliseNotificationPrefs(input);
    expect(result).not.toHaveProperty("unknown_kind");
    expect(result).not.toHaveProperty("evil_kind");
    // All 6 known kinds still present
    for (const kind of NOTIFICATION_KIND_ORDER) {
      expect(result).toHaveProperty(kind);
    }
  });

  it("treats a kind whose value is not an object as 'use default'", () => {
    const input = {
      endorsement_received: "not an object",
    };
    const result = normaliseNotificationPrefs(input);
    expect(result.endorsement_received).toEqual(DEFAULT_NOTIFICATION_PREFS.endorsement_received);
  });
});

describe("NOTIFICATION_KIND_ORDER", () => {
  it("has exactly 6 entries", () => {
    expect(NOTIFICATION_KIND_ORDER.length).toBe(6);
  });

  it("contains all expected kinds", () => {
    const expected: (keyof NotificationPrefs)[] = [
      "endorsement_received",
      "endorsement_revoked",
      "tono_proposal_received",
      "tono_proposal_accepted",
      "tono_proposal_declined",
      "tono_fulfilled",
    ];
    for (const k of expected) {
      expect(NOTIFICATION_KIND_ORDER).toContain(k);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(NOTIFICATION_KIND_ORDER).size).toBe(NOTIFICATION_KIND_ORDER.length);
  });
});

describe("DEFAULT_NOTIFICATION_PREFS", () => {
  it("has all 6 kinds", () => {
    for (const kind of NOTIFICATION_KIND_ORDER) {
      expect(DEFAULT_NOTIFICATION_PREFS).toHaveProperty(kind);
    }
  });

  it("sets in_app=true for every kind (default is 'show in bell')", () => {
    for (const kind of NOTIFICATION_KIND_ORDER) {
      expect(DEFAULT_NOTIFICATION_PREFS[kind].in_app, kind).toBe(true);
    }
  });

  it("sets email=false for less-urgent workflow kinds", () => {
    expect(DEFAULT_NOTIFICATION_PREFS.tono_proposal_accepted.email).toBe(false);
    expect(DEFAULT_NOTIFICATION_PREFS.tono_proposal_declined.email).toBe(false);
  });
});
