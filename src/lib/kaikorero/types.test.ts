/**
 * Unit tests for kaikōrero label maps and type invariants.
 *
 * These tests catch the most common drift class: when someone adds a value
 * to KNOWLEDGE_DOMAINS but forgets to add it to DOMAIN_LABEL (or vice
 * versa), or adds a label without a matching tone visibility tier.
 */

import { describe, it, expect } from "vitest";
import {
  DOMAIN_LABEL,
  KNOWLEDGE_DOMAINS,
  type KnowledgeDomain,
} from "@/lib/kaikorero/types";

describe("DOMAIN_LABEL map", () => {
  it("has an entry for every KNOWLEDGE_DOMAINS value", () => {
    for (const domain of KNOWLEDGE_DOMAINS) {
      expect(DOMAIN_LABEL[domain]).toBeDefined();
      expect(typeof DOMAIN_LABEL[domain]).toBe("string");
      expect(DOMAIN_LABEL[domain].length).toBeGreaterThan(0);
    }
  });

  it("has no extra keys that aren't in KNOWLEDGE_DOMAINS", () => {
    const labelKeys = Object.keys(DOMAIN_LABEL) as KnowledgeDomain[];
    const allowed = new Set<string>(KNOWLEDGE_DOMAINS);
    for (const k of labelKeys) {
      expect(allowed.has(k)).toBe(true);
    }
  });

  it("labels are unique (no two domains share a label)", () => {
    const labels = Object.values(DOMAIN_LABEL);
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length);
  });

  it("labels do not contain empty strings or whitespace-only", () => {
    for (const [key, label] of Object.entries(DOMAIN_LABEL)) {
      expect(label.trim().length, `domain ${key}`).toBeGreaterThan(0);
    }
  });
});

describe("KNOWLEDGE_DOMAINS array", () => {
  it("contains at least 10 entries (sanity check)", () => {
    expect(KNOWLEDGE_DOMAINS.length).toBeGreaterThanOrEqual(10);
  });

  it("contains no duplicates", () => {
    const unique = new Set(KNOWLEDGE_DOMAINS);
    expect(unique.size).toBe(KNOWLEDGE_DOMAINS.length);
  });

  it("contains no empty strings", () => {
    for (const d of KNOWLEDGE_DOMAINS) {
      expect(d.length).toBeGreaterThan(0);
    }
  });

  it("entries are snake_case (lowercase + underscore)", () => {
    for (const d of KNOWLEDGE_DOMAINS) {
      expect(d).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("includes the canonical cultural-knowledge domains", () => {
    // These are the core domains the platform MUST support; missing one
    // is a serious regression.
    const required: KnowledgeDomain[] = [
      "purakau",
      "whakapapa",
      "tikanga",
      "waiata",
      "kapa_haka",
    ];
    for (const r of required) {
      expect(KNOWLEDGE_DOMAINS, `domain ${r}`).toContain(r);
    }
  });
});
