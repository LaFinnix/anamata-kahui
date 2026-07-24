/**
 * Unit tests for the demos types module.
 *
 * The state machine is the safety boundary that prevents destructive
 * transitions (e.g. promoting a draft directly, or re-approving a
 * promoted demo).
 */

import { describe, it, expect } from "vitest";
import {
  DEMO_STATUSES,
  DEMO_STATUS_LABEL,
  DEMO_STATUS_TRANSITIONS,
  canDemoTransition,
  type DemoStatus,
} from "@/lib/demos/types";

describe("DEMO_STATUSES", () => {
  it("lists exactly five statuses", () => {
    expect(DEMO_STATUSES).toHaveLength(5);
  });

  it("includes the five expected values in canonical order", () => {
    expect(DEMO_STATUSES).toEqual([
      "draft",
      "pending_review",
      "approved",
      "rejected",
      "promoted",
    ]);
  });

  it("has a label for every status (parity check)", () => {
    for (const s of DEMO_STATUSES) {
      expect(DEMO_STATUS_LABEL[s]).toBeTypeOf("string");
      expect(DEMO_STATUS_LABEL[s].length).toBeGreaterThan(0);
    }
  });
});

describe("canDemoTransition", () => {
  it("draft can go to pending_review (artist submits)", () => {
    expect(canDemoTransition("draft", "pending_review")).toBe(true);
  });

  it("draft cannot go directly to approved or rejected", () => {
    // Must go through pending_review first.
    expect(canDemoTransition("draft", "approved")).toBe(false);
    expect(canDemoTransition("draft", "rejected")).toBe(false);
  });

  it("draft cannot be promoted directly", () => {
    expect(canDemoTransition("draft", "promoted")).toBe(false);
  });

  it("pending_review can go to approved (kaitiaki passes)", () => {
    expect(canDemoTransition("pending_review", "approved")).toBe(true);
  });

  it("pending_review can go to rejected (kaitiaki rejects)", () => {
    expect(canDemoTransition("pending_review", "rejected")).toBe(true);
  });

  it("approved can go to promoted (admin promotes to release)", () => {
    expect(canDemoTransition("approved", "promoted")).toBe(true);
  });

  it("approved can request re-review (back to pending_review)", () => {
    // E.g. artist submitted new version, kaitiaki wants to re-review
    expect(canDemoTransition("approved", "pending_review")).toBe(true);
  });

  it("approved cannot be rejected (rejection is a pre-approval state)", () => {
    expect(canDemoTransition("approved", "rejected")).toBe(false);
  });

  it("rejected is terminal — artist re-uploads as a new demo", () => {
    const allOthers: DemoStatus[] = ["draft", "pending_review", "approved", "promoted"];
    for (const next of allOthers) {
      expect(canDemoTransition("rejected", next)).toBe(false);
    }
  });

  it("promoted is terminal — it's a release now", () => {
    const allOthers: DemoStatus[] = ["draft", "pending_review", "approved", "rejected"];
    for (const next of allOthers) {
      expect(canDemoTransition("promoted", next)).toBe(false);
    }
  });

  it("self-transition (no-op) is always allowed", () => {
    for (const s of DEMO_STATUSES) {
      expect(canDemoTransition(s, s)).toBe(true);
    }
  });
});

describe("DEMO_STATUS_TRANSITIONS exhaustiveness", () => {
  it("every status has a transitions array", () => {
    for (const s of DEMO_STATUSES) {
      expect(Array.isArray(DEMO_STATUS_TRANSITIONS[s])).toBe(true);
    }
  });

  it("every transition target is a valid status", () => {
    for (const s of DEMO_STATUSES) {
      for (const t of DEMO_STATUS_TRANSITIONS[s]) {
        expect(DEMO_STATUSES).toContain(t);
      }
    }
  });

  it("no status transitions to itself in the map (covered by canDemoTransition's self-rule)", () => {
    for (const s of DEMO_STATUSES) {
      expect(DEMO_STATUS_TRANSITIONS[s]).not.toContain(s);
    }
  });
});
