/**
 * Client-safe types and metadata for the active-branch-context system.
 *
 * This file has no server-only dependencies — safe to import into
 * "use client" components.
 */

export type BranchSlug = "records" | "research" | "arts" | "dev";

export type BranchRole = "lead" | "admin" | "member" | "guest";

export type PlatformRole =
  | "super_admin"
  | "branch_admin"
  | "kaitiaki"
  | "artist"
  | "researcher"
  | "client";

export interface ActiveContext {
  branch_slug: BranchSlug;
  /** Effective role at the active branch. May differ from profile.role. */
  role_in_branch: BranchRole;
  /** Effective platform role (read-only; not switchable — platform-level). */
  platform_role: PlatformRole;
  /** Source of the active context — cookie or fallback. */
  source: "cookie" | "default";
}

export const ACTIVE_CONTEXT_COOKIE_NAME = "kahui_active_context";

export const BRANCH_LABELS: Record<BranchSlug, { label: string; icon: string; description: string }> = {
  records: {
    label: "Music (Anamata Records)",
    icon: "Music",
    description: "Releases, roster, stem vault, analytics",
  },
  research: {
    label: "Research & Language",
    icon: "BookOpen",
    description: "Papers, field projects, library",
  },
  arts: {
    label: "Creative Arts",
    icon: "Palette",
    description: "Galleries, portfolios, commissions",
  },
  dev: {
    label: "Technology & Dev",
    icon: "Code2",
    description: "API keys, webhooks, jobs",
  },
};

export const BRANCH_ROLE_LABELS: Record<BranchRole, { label: string; description: string }> = {
  lead: {
    label: "Lead",
    description:
      "Full branch admin — can create releases, manage members, approve splits",
  },
  admin: {
    label: "Admin",
    description:
      "Branch-level admin — can create releases + manage roster",
  },
  member: {
    label: "Member",
    description:
      "Standard contributor — can upload stems, view analytics",
  },
  guest: {
    label: "Guest",
    description: "Read-only access — view-only",
  },
};
