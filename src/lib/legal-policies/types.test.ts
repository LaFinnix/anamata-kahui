/**
 * Unit tests for the legal_policies types module.
 *
 * Critical: `isAckActive` is the safety check used by both the
 * action layer and the UI. If a withdrawn ack is treated as active,
 * the artist still appears to be covered by a policy they've
 * withdrawn from.
 */

import { describe, it, expect } from "vitest";
import {
  POLICY_TYPES,
  POLICY_TYPE_LABEL,
  isAckActive,
  type PolicyType,
} from "@/lib/legal-policies/types";

describe("POLICY_TYPES", () => {
  it("lists exactly five types", () => {
    expect(POLICY_TYPES).toHaveLength(5);
  });

  it("includes the five expected values", () => {
    expect(POLICY_TYPES).toEqual([
      "code_of_conduct",
      "privacy_consent",
      "data_rights",
      "cultural_safety",
      "other",
    ]);
  });

  it("has a label for every type (parity check)", () => {
    for (const t of POLICY_TYPES) {
      expect(POLICY_TYPE_LABEL[t]).toBeTypeOf("string");
      expect(POLICY_TYPE_LABEL[t].length).toBeGreaterThan(0);
    }
  });
});

describe("isAckActive", () => {
  it("returns true when withdrawn_at is null", () => {
    expect(isAckActive({ withdrawn_at: null })).toBe(true);
  });

  it("returns false when withdrawn_at is a timestamp", () => {
    expect(isAckActive({ withdrawn_at: "2026-08-01T00:00:00Z" })).toBe(false);
  });

  it("handles a freshly-created row (no withdrawn_at field at all)", () => {
    expect(isAckActive({} as never)).toBe(true);
  });
});
