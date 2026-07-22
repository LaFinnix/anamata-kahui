"use server";

/**
 * Active-branch-context server action.
 *
 * Sets the `kahui_active_context` cookie. The cookie persists across
 * page navigations and is read by getActiveContext() on every page.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  serializeActiveContext,
  ACTIVE_CONTEXT_COOKIE_NAME,
  ACTIVE_CONTEXT_COOKIE_MAX_AGE_S,
  type BranchSlug,
  type BranchRole,
  type PlatformRole,
} from "@/lib/auth/active-context";
import { createServerSupabase } from "@/lib/supabase/clients";

export interface ActiveContextState {
  error?: string;
  success?: string;
}

/**
 * Set the active branch + role. Server-side validates the user has
 * permission to operate in that branch (i.e. has a user_branches row).
 */
export async function setActiveBranchAction(
  _prev: ActiveContextState | null,
  formData: FormData,
): Promise<ActiveContextState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const branchSlug = String(formData.get("branch_slug") ?? "") as BranchSlug;
  const roleInBranch = String(formData.get("role_in_branch") ?? "") as BranchRole;

  if (!["records", "research", "arts", "dev"].includes(branchSlug)) {
    return { error: "Invalid branch." };
  }
  if (!["lead", "admin", "member", "guest"].includes(roleInBranch)) {
    return { error: "Invalid role." };
  }

  // Verify the user has access to the branch with the requested role
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("slug", branchSlug)
    .single();
  if (!branch) return { error: "Branch not found." };

  // Super admins can switch to any branch
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const platformRole = (profile?.role ?? "client") as PlatformRole;

  if (platformRole !== "super_admin") {
    const { data: membership } = await supabase
      .from("user_branches")
      .select("role")
      .eq("user_id", user.id)
      .eq("branch_id", branch.id)
      .maybeSingle();
    if (!membership) {
      return { error: `You don't have access to the ${branchSlug} branch.` };
    }
    // The role in branch must match what's in the database
    if (membership.role !== roleInBranch) {
      return {
        error: `Your role in this branch is "${membership.role}", not "${roleInBranch}".`,
      };
    }
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: ACTIVE_CONTEXT_COOKIE_NAME,
    value: serializeActiveContext({
      branch_slug: branchSlug,
      role_in_branch: roleInBranch,
      platform_role: platformRole,
    }),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACTIVE_CONTEXT_COOKIE_MAX_AGE_S,
    path: "/",
  });

  // Re-fetch the dashboard layout so the new branch is reflected
  revalidatePath("/admin", "layout");
  revalidatePath("/records", "layout");
  revalidatePath("/research", "layout");
  revalidatePath("/arts", "layout");
  revalidatePath("/dev", "layout");

  return {
    success: `Switched to ${branchSlug} (${roleInBranch}).`,
  };
}
