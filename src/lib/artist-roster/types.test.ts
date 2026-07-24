/**
 * Unit tests for the artist_roster types module.
 *
 * The state machine (ROSTER_STATUS_TRANSITIONS) is the critical
 * safety boundary — the actions layer uses it to validate every
 * status change before writing to the DB. Wrong transitions can
 * break the integrity model.
 */

import { describe, it, expect } from "vitest";
import {
  ROSTER_STATUSES,
  ROSTER_STATUS_LABEL,
  ROSTER_STATUS_TRANSITIONS,
  canTransition,
  type RosterStatus,
} from "@/lib/artist-roster/types";

describe("ROSTER_STATUSES", () => {
  it("lists exactly four statuses", () => {
    expect(ROSTER_STATUSES).toHaveLength(4);
  });

  it("includes the four expected values in the canonical order", () => {
    expect(ROSTER_STATUSES).toEqual([
      "prospect",
      "active",
      "paused",
      "departed",
    ]);
  });

  it("has a label for every status (parity check)", () => {
    for (const s of ROSTER_STATUSES) {
      expect(ROSTER_STATUS_LABEL[s]).toBeTypeOf("string");
      expect(ROSTER_STATUS_LABEL[s].length).toBeGreaterThan(0);
    }
  });
});

describe("canTransition", () => {
  it("prospect can go to active (signing event)", () => {
    expect(canTransition("prospect", "active")).toBe(true);
  });

  it("prospect can go to departed", () => {
    expect(canTransition("prospect", "departed")).toBe(true);
  });

  it("prospect cannot go to paused directly", () => {
    // Pausing requires being active first — small-pool pressure defence.
    expect(canTransition("prospect", "paused")).toBe(false);
  });

  it("active can go to paused", () => {
    expect(canTransition("active", "paused")).toBe(true);
  });

  it("active can go to departed (clean exit)", () => {
    expect(canTransition("active", "departed")).toBe(true);
  });

  it("active cannot go to prospect (no demotion back)", () => {
    expect(canTransition("active", "prospect")).toBe(false);
  });

  it("paused can go back to active (re-engagement)", () => {
    expect(canTransition("paused", "active")).toBe(true);
  });

  it("paused can go to departed", () => {
    expect(canTransition("paused", "departed")).toBe(true);
  });

  it("departed is terminal — no transitions out", () => {
    const allOthers: RosterStatus[] = ["prospect", "active", "paused"];
    for (const next of allOthers) {
      expect(canTransition("departed", next)).toBe(false);
    }
  });

  it("self-transition (no-op) is always allowed", () => {
    for (const s of ROSTER_STATUSES) {
      expect(canTransition(s, s)).toBe(true);
    }
  });
});

describe("ROSTER_STATUS_TRANSITIONS exhaustiveness", () => {
  it("every status has a transitions array", () => {
    for (const s of ROSTER_STATUSES) {
      expect(Array.isArray(ROSTER_STATUS_TRANSITIONS[s])).toBe(true);
    }
  });

  it("every transition target is a valid status", () => {
    for (const s of ROSTER_STATUSES) {
      for (const t of ROSTER_STATUS_TRANSITIONS[s]) {
        expect(ROSTER_STATUSES).toContain(t);
      }
    }
  });

  it("no status transitions to itself in the map (covered by canTransition's self-rule)", () => {
    for (const s of ROSTER_STATUSES) {
      expect(ROSTER_STATUS_TRANSITIONS[s]).not.toContain(s);
    }
  });
});
