/**
 * Unit tests for the shared system-tour text source.
 *
 * The HTML tour and the PDF pack both read from TOUR_STOPS. If you
 * change a stop's design decision rationale here, both surfaces update.
 * These tests defend against:
 *   - Renumbering or losing stops
 *   - Empty intro / decision rationale fields
 *   - Stops drifting out of the expected canonical order
 */

import { describe, it, expect } from "vitest";
import { TOUR_STOPS } from "@/lib/press/system-tour";

describe("TOUR_STOPS", () => {
  it("has exactly 6 stops", () => {
    expect(TOUR_STOPS.length).toBe(6);
  });

  it("stops are numbered 1-6 in order", () => {
    for (let i = 0; i < TOUR_STOPS.length; i++) {
      expect(TOUR_STOPS[i].n, `stop ${i}`).toBe(i + 1);
    }
  });

  it("every stop has a non-empty title, subtitle, intro, and designNote", () => {
    for (const stop of TOUR_STOPS) {
      expect(stop.title.length, `stop ${stop.n} title`).toBeGreaterThan(5);
      expect(stop.subtitle.length, `stop ${stop.n} subtitle`).toBeGreaterThan(5);
      expect(stop.intro.length, `stop ${stop.n} intro`).toBeGreaterThan(20);
      expect(stop.designNote.length, `stop ${stop.n} designNote`).toBeGreaterThan(20);
    }
  });

  it("titles are unique", () => {
    const titles = TOUR_STOPS.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("design notes reference plan sections (cultural-integrity traceability)", () => {
    // The §-style references are how funders trace decisions back to the
    // documented plan. Drift here would weaken that audit trail.
    const planRefs = TOUR_STOPS.flatMap((s) =>
      s.designNote.match(/§\s*\d+(\.\d+)?/g) ?? []
    );
    // We expect at least 4 distinct plan section references
    expect(planRefs.length).toBeGreaterThanOrEqual(4);
  });

  it("stop 1 covers the profile + dual opt-in", () => {
    const stop = TOUR_STOPS.find((s) => s.n === 1);
    expect(stop?.intro).toMatch(/opt-in|opt in/i);
    expect(stop?.intro).toMatch(/directory|public/i);
  });

  it("stop 2 references the §5.1 cultural-integrity rule for open tono privacy", () => {
    const stop = TOUR_STOPS.find((s) => s.n === 2);
    expect(stop?.designNote).toMatch(/§\s*5\.1/);
    expect(stop?.designNote).toMatch(/dashboard-private|dashboard private/i);
  });

  it("stop 3 references the §4.9 layered defence for iwi_specific visibility", () => {
    const stop = TOUR_STOPS.find((s) => s.n === 3);
    expect(stop?.designNote).toMatch(/§\s*4\.9/);
    expect(stop?.designNote).toMatch(/attested/i);
  });

  it("stop 5 covers cultural review + auto-endorsement", () => {
    const stop = TOUR_STOPS.find((s) => s.n === 5);
    expect(stop?.intro).toMatch(/kaitiaki/i);
    expect(stop?.intro).toMatch(/co_creator/i);
    expect(stop?.designNote).toMatch(/append-only|append only/i);
  });

  it("stop 6 commits to no aggregate counts on individuals", () => {
    const stop = TOUR_STOPS.find((s) => s.n === 6);
    expect(stop?.designNote).toMatch(/§\s*4\.3/);
    expect(stop?.intro).toMatch(/leaderboards|aggregate counts/i);
  });
});
