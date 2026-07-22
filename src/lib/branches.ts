import type { Branch, BranchSlug } from "@/lib/types";

/**
 * Static directory of the four operational branches.
 * Mirrors the rows seeded in `supabase/migrations/0001_initial_schema.sql`.
 * Use this for navigation, branch-switcher copy, and landing-page headers
 * without making a network round-trip.
 */
export const BRANCHES: readonly Branch[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "records",
    name: "Anamata Records",
    description: "Music branch — artist portal, release pipeline, stem vault, royalty & stream analytics.",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    slug: "research",
    name: "Research & Language Preservation",
    description: "Knowledge vault, document archives, and field projects.",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    slug: "arts",
    name: "Creative Arts",
    description: "Visual arts, digital media showcase, and cultural design portfolios.",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    slug: "dev",
    name: "Technology & Development",
    description: "Software projects, client tools, and internal automation.",
    created_at: "2026-01-01T00:00:00Z",
  },
] as const;

export const BRANCH_BY_SLUG: Record<BranchSlug, Branch> = BRANCHES.reduce(
  (acc, branch) => {
    acc[branch.slug] = branch;
    return acc;
  },
  {} as Record<BranchSlug, Branch>,
);
