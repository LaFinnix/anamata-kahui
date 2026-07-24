/**
 * Unit tests for tono types and label maps.
 *
 * Catches drift between:
 *   - TONO_STATUSES array and TONO_STATUS_LABEL map
 *   - TONO_HELP_TYPES array and TONO_HELP_TYPE_LABEL map
 *   - TONO_VISIBILITIES array and TONO_VISIBILITY_LABEL map
 *   - PROPOSAL_STATUSES array and PROPOSAL_STATUS_LABEL map (if exists)
 */

import { describe, it, expect } from "vitest";
import {
  TONO_STATUSES,
  TONO_HELP_TYPES,
  TONO_VISIBILITIES,
  PROPOSAL_STATUSES,
  TONO_STATUS_LABEL,
  TONO_HELP_TYPE_LABEL,
  TONO_VISIBILITY_LABEL,
  type TonoStatus,
  type TonoHelpType,
  type TonoVisibility,
  type ProposalStatus,
} from "@/lib/tono/types";

describe("TONO_STATUSES", () => {
  it("contains the canonical lifecycle states", () => {
    expect(TONO_STATUSES).toContain("open");
    expect(TONO_STATUSES).toContain("in_conversation");
    expect(TONO_STATUSES).toContain("fulfilled");
    expect(TONO_STATUSES).toContain("closed");
    expect(TONO_STATUSES).toContain("withdrawn");
  });

  it("TONO_STATUS_LABEL has a label for every status", () => {
    for (const status of TONO_STATUSES) {
      expect(TONO_STATUS_LABEL[status]).toBeDefined();
      expect(typeof TONO_STATUS_LABEL[status]).toBe("string");
      expect(TONO_STATUS_LABEL[status].length).toBeGreaterThan(0);
    }
  });

  it("TONO_STATUS_LABEL has no extra entries", () => {
    const labelKeys = Object.keys(TONO_STATUS_LABEL) as TonoStatus[];
    const allowed = new Set<string>(TONO_STATUSES);
    for (const k of labelKeys) {
      expect(allowed.has(k)).toBe(true);
    }
  });

  it("status labels are unique", () => {
    const labels = Object.values(TONO_STATUS_LABEL);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("TONO_HELP_TYPES", () => {
  it("includes the core collaboration modes", () => {
    const required: TonoHelpType[] = [
      "verify_narrative",
      "verify_reo",
      "co_create",
      "review_cultural",
      "mentor",
    ];
    for (const r of required) {
      expect(TONO_HELP_TYPES, `help type ${r}`).toContain(r);
    }
  });

  it("TONO_HELP_TYPE_LABEL covers every type", () => {
    for (const ht of TONO_HELP_TYPES) {
      expect(TONO_HELP_TYPE_LABEL[ht]).toBeDefined();
      expect(typeof TONO_HELP_TYPE_LABEL[ht]).toBe("string");
      expect(TONO_HELP_TYPE_LABEL[ht].length).toBeGreaterThan(0);
    }
  });

  it("help type labels are unique", () => {
    const labels = Object.values(TONO_HELP_TYPE_LABEL);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("TONO_VISIBILITIES", () => {
  it("contains the three canonical visibility tiers", () => {
    expect(TONO_VISIBILITIES).toContain("open");
    expect(TONO_VISIBILITIES).toContain("invited");
    expect(TONO_VISIBILITIES).toContain("iwi_specific");
  });

  it("TONO_VISIBILITY_LABEL covers every tier", () => {
    for (const v of TONO_VISIBILITIES) {
      expect(TONO_VISIBILITY_LABEL[v]).toBeDefined();
    }
  });

  it("has exactly 3 visibility tiers (defends §4.9 layered model)", () => {
    // If this number changes, the §4.9 visibility logic must be re-audited.
    expect(TONO_VISIBILITIES.length).toBe(3);
  });
});

describe("PROPOSAL_STATUSES", () => {
  it("covers the four-state proposal lifecycle", () => {
    expect(PROPOSAL_STATUSES).toContain("pending");
    expect(PROPOSAL_STATUSES).toContain("accepted");
    expect(PROPOSAL_STATUSES).toContain("declined");
    expect(PROPOSAL_STATUSES).toContain("withdrawn");
  });

  it("'withdrawn' is shared with tono statuses (proposer/creator can both withdraw)", () => {
    // Both vocabs intentionally share 'withdrawn' — a proposer can withdraw
    // their proposal, and a tono creator can withdraw their tono. These are
    // distinct DB enums but the semantics align at this state.
    expect(TONO_STATUSES).toContain("withdrawn");
    expect(PROPOSAL_STATUSES).toContain("withdrawn");
  });
});
