/**
 * Unit tests for endorsement types and label maps.
 */

import { describe, it, expect } from "vitest";
import {
  ENDORSEMENT_TYPES,
  ENDORSEMENT_WORK_TYPES,
  ENDORSEMENT_STATUSES,
  ENDORSEMENT_TYPE_LABEL,
  ENDORSEMENT_WORK_TYPE_LABEL,
  type EndorsementType,
  type EndorsementWorkType,
} from "@/lib/endorsements/types";

describe("ENDORSEMENT_TYPES", () => {
  it("contains the canonical endorsement kinds", () => {
    const required: EndorsementType[] = [
      "source_of_knowledge",
      "cultural_endorsement",
      "co_creator",
      "mentorship",
    ];
    for (const r of required) {
      expect(ENDORSEMENT_TYPES, `endorsement type ${r}`).toContain(r);
    }
  });

  it("ENDORSEMENT_TYPE_LABEL covers every type", () => {
    for (const t of ENDORSEMENT_TYPES) {
      expect(ENDORSEMENT_TYPE_LABEL[t]).toBeDefined();
      expect(ENDORSEMENT_TYPE_LABEL[t].length).toBeGreaterThan(0);
    }
  });

  it("labels are unique", () => {
    const labels = Object.values(ENDORSEMENT_TYPE_LABEL);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("contains no duplicates", () => {
    expect(new Set(ENDORSEMENT_TYPES).size).toBe(ENDORSEMENT_TYPES.length);
  });
});

describe("ENDORSEMENT_WORK_TYPES", () => {
  it("includes 'profile' for standing endorsements", () => {
    expect(ENDORSEMENT_WORK_TYPES).toContain("profile");
  });

  it("includes release, lyric, stem for work-anchored endorsements", () => {
    expect(ENDORSEMENT_WORK_TYPES).toContain("release");
    expect(ENDORSEMENT_WORK_TYPES).toContain("lyric");
    expect(ENDORSEMENT_WORK_TYPES).toContain("stem");
  });

  it("ENDORSEMENT_WORK_TYPE_LABEL covers every type", () => {
    for (const wt of ENDORSEMENT_WORK_TYPES) {
      expect(ENDORSEMENT_WORK_TYPE_LABEL[wt]).toBeDefined();
      expect(ENDORSEMENT_WORK_TYPE_LABEL[wt].length).toBeGreaterThan(0);
    }
  });
});

describe("ENDORSEMENT_STATUSES", () => {
  it("contains the three states (active, revoked, superseded)", () => {
    expect(ENDORSEMENT_STATUSES).toContain("active");
    expect(ENDORSEMENT_STATUSES).toContain("revoked");
    expect(ENDORSEMENT_STATUSES).toContain("superseded");
  });
});
