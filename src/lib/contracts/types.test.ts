/**
 * Unit tests for the contracts types module.
 *
 * The state machine (CONTRACT_STATUS_TRANSITIONS) is the safety boundary
 * that prevents destructive edits (e.g. reactivating a terminated
 * contract). The actions layer uses canContractTransition() to validate
 * every status change.
 */

import { describe, it, expect } from "vitest";
import {
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABEL,
  CONTRACT_STATUSES,
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TRANSITIONS,
  canContractTransition,
  type ContractStatus,
} from "@/lib/contracts/types";

describe("CONTRACT_TYPES", () => {
  it("lists exactly six types", () => {
    expect(CONTRACT_TYPES).toHaveLength(6);
  });

  it("includes the six expected values", () => {
    expect(CONTRACT_TYPES).toEqual([
      "label_deal",
      "distribution",
      "publishing",
      "co_venture",
      "recording",
      "tour",
    ]);
  });

  it("has a label for every type (parity check)", () => {
    for (const t of CONTRACT_TYPES) {
      expect(CONTRACT_TYPE_LABEL[t]).toBeTypeOf("string");
      expect(CONTRACT_TYPE_LABEL[t].length).toBeGreaterThan(0);
    }
  });
});

describe("CONTRACT_STATUSES", () => {
  it("lists exactly five statuses", () => {
    expect(CONTRACT_STATUSES).toHaveLength(5);
  });

  it("includes the five expected values in canonical order", () => {
    expect(CONTRACT_STATUSES).toEqual([
      "draft",
      "active",
      "expired",
      "terminated",
      "renewed",
    ]);
  });

  it("has a label for every status (parity check)", () => {
    for (const s of CONTRACT_STATUSES) {
      expect(CONTRACT_STATUS_LABEL[s]).toBeTypeOf("string");
      expect(CONTRACT_STATUS_LABEL[s].length).toBeGreaterThan(0);
    }
  });
});

describe("canContractTransition", () => {
  it("draft can go to active (signing event)", () => {
    expect(canContractTransition("draft", "active")).toBe(true);
  });

  it("draft can go to terminated (cancel before signing)", () => {
    expect(canContractTransition("draft", "terminated")).toBe(true);
  });

  it("draft cannot go directly to expired", () => {
    // Expiry is time-based; you have to be active first.
    expect(canContractTransition("draft", "expired")).toBe(false);
  });

  it("active can go to expired (term ended)", () => {
    expect(canContractTransition("active", "expired")).toBe(true);
  });

  it("active can go to terminated (early termination)", () => {
    expect(canContractTransition("active", "terminated")).toBe(true);
  });

  it("active can go to renewed (signals a new contract is being created)", () => {
    expect(canContractTransition("active", "renewed")).toBe(true);
  });

  it("expired is terminal — no transitions out", () => {
    const allOthers: ContractStatus[] = ["draft", "active", "terminated", "renewed"];
    for (const next of allOthers) {
      expect(canContractTransition("expired", next)).toBe(false);
    }
  });

  it("terminated is terminal — no transitions out", () => {
    const allOthers: ContractStatus[] = ["draft", "active", "expired", "renewed"];
    for (const next of allOthers) {
      expect(canContractTransition("terminated", next)).toBe(false);
    }
  });

  it("renewed is terminal — superseded by a new contract", () => {
    const allOthers: ContractStatus[] = ["draft", "active", "expired", "terminated"];
    for (const next of allOthers) {
      expect(canContractTransition("renewed", next)).toBe(false);
    }
  });

  it("self-transition (no-op) is always allowed", () => {
    for (const s of CONTRACT_STATUSES) {
      expect(canContractTransition(s, s)).toBe(true);
    }
  });
});

describe("CONTRACT_STATUS_TRANSITIONS exhaustiveness", () => {
  it("every status has a transitions array", () => {
    for (const s of CONTRACT_STATUSES) {
      expect(Array.isArray(CONTRACT_STATUS_TRANSITIONS[s])).toBe(true);
    }
  });

  it("every transition target is a valid status", () => {
    for (const s of CONTRACT_STATUSES) {
      for (const t of CONTRACT_STATUS_TRANSITIONS[s]) {
        expect(CONTRACT_STATUSES).toContain(t);
      }
    }
  });

  it("no status transitions to itself in the map (covered by canContractTransition's self-rule)", () => {
    for (const s of CONTRACT_STATUSES) {
      expect(CONTRACT_STATUS_TRANSITIONS[s]).not.toContain(s);
    }
  });
});
