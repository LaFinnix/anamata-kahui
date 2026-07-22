/**
 * Active-branch + active-context — SERVER-SIDE LOGIC.
 *
 * Reads the kahui_active_context cookie via next/headers.
 *
 * For client-safe types and labels (usable in "use client" components),
 * import from `./active-context-types` instead.
 */

import { cookies } from "next/headers";
import {
  ACTIVE_CONTEXT_COOKIE_NAME,
  type ActiveContext,
  type BranchSlug,
  type BranchRole,
  type PlatformRole,
} from "./active-context-types";

const ONE_YEAR_S = 60 * 60 * 24 * 365;

/**
 * Read the current user's active branch context from cookies.
 *
 * Falls back to the user's first branch membership (or "records" if none).
 *
 * Pass `userBranches` so we can validate the cookie value against the
 * user's actual memberships (and resolve role_in_branch).
 */
export async function getActiveContext(
  userBranches: { branch_slug: BranchSlug; role_in_branch: BranchRole }[] = [],
  platformRole: PlatformRole = "client",
): Promise<ActiveContext> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_CONTEXT_COOKIE_NAME)?.value;

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<ActiveContext>;
      const validBranches = userBranches.length > 0 ? userBranches : null;
      if (
        parsed.branch_slug &&
        ["records", "research", "arts", "dev"].includes(parsed.branch_slug) &&
        validBranches?.some((b) => b.branch_slug === parsed.branch_slug)
      ) {
        const matched = validBranches.find(
          (b) => b.branch_slug === parsed.branch_slug,
        );
        return {
          branch_slug: parsed.branch_slug,
          role_in_branch: parsed.role_in_branch ?? matched!.role_in_branch,
          platform_role: platformRole,
          source: "cookie",
        };
      }
    } catch {
      // fall through to default
    }
  }

  // Default fallback
  if (userBranches.length > 0) {
    return {
      branch_slug: userBranches[0].branch_slug,
      role_in_branch: userBranches[0].role_in_branch,
      platform_role: platformRole,
      source: "default",
    };
  }

  return {
    branch_slug: "records",
    role_in_branch: "lead",
    platform_role: platformRole,
    source: "default",
  };
}

/** Serialise a context for the cookie value. */
export function serializeActiveContext(
  ctx: Omit<ActiveContext, "source">,
): string {
  return JSON.stringify({
    branch_slug: ctx.branch_slug,
    role_in_branch: ctx.role_in_branch,
    platform_role: ctx.platform_role,
  });
}

export const ACTIVE_CONTEXT_COOKIE_MAX_AGE_S = ONE_YEAR_S;

// Re-export the client-safe types so existing imports keep working
export type {
  BranchSlug,
  BranchRole,
  PlatformRole,
  ActiveContext,
} from "./active-context-types";
export { ACTIVE_CONTEXT_COOKIE_NAME, BRANCH_LABELS, BRANCH_ROLE_LABELS } from "./active-context-types";
