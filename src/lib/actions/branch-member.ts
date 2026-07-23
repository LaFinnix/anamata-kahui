"use server";

/**
 * Branch membership server actions.
 *
 * Authorization:
 *   - User must be signed in
 *   - User must have profiles.role IN ('super_admin', 'branch_admin')
 *   - For non-super-admin, they must also have a user_branches row for
 *     the target branch (per-branch scope). RLS enforces this.
 *
 * These actions:
 *   - addBranchMemberAction — adds a profile to a branch with a role
 *   - updateBranchMemberRoleAction — changes the per-branch role
 *   - removeBranchMemberAction — removes from a branch
 *
 * Audit: each mutation writes to data_governance_log (append-only).
 */

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/clients";

export interface BranchMemberState {
  error?: string;
  success?: string;
}

const VALID_BRANCH_ROLES = ["lead", "admin", "member", "guest"] as const;
type BranchRole = (typeof VALID_BRANCH_ROLES)[number];

export async function addBranchMemberAction(
  _prev: BranchMemberState | null,
  formData: FormData,
): Promise<BranchMemberState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  // Authorize
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role;
  if (role !== "super_admin" && role !== "branch_admin") {
    return { error: "Adding branch members requires super_admin or branch_admin role." };
  }

  const branchId = String(formData.get("branch_id") ?? "").trim();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  const branchRole = String(formData.get("branch_role") ?? "member") as BranchRole;

  if (!branchId) return { error: "Branch required." };
  if (!profileId) return { error: "Profile required." };
  if (!VALID_BRANCH_ROLES.includes(branchRole)) {
    return { error: `Invalid role. Use one of: ${VALID_BRANCH_ROLES.join(", ")}.` };
  }

  // For non-super-admin: verify the user has user_branches access to this branch.
  if (role === "branch_admin") {
    const { data: ownMembership } = await supabase
      .from("user_branches")
      .select("role")
      .eq("user_id", user.id)
      .eq("branch_id", branchId)
      .maybeSingle();
    if (!ownMembership) {
      return {
        error: "You don't have a user_branches row for this branch.",
      };
    }
    if (!["lead", "admin"].includes(ownMembership.role)) {
      return {
        error: "Adding members requires lead or admin role in the branch.",
      };
    }
  }

  // Upsert the user_branches row
  const { error: insertErr } = await supabase
    .from("user_branches")
    .upsert(
      {
        user_id: profileId,
        branch_id: branchId,
        role: branchRole,
      },
      { onConflict: "user_id,branch_id" },
    );

  if (insertErr) {
    return { error: `Could not add member: ${insertErr.message}` };
  }

  // Audit log
  await supabase.from("data_governance_log").insert({
    action: "branch_member_added",
    summary: `Added user ${profileId} to branch ${branchId} as ${branchRole}`,
    published: false,
    recorded_by: user.id,
  });

  revalidatePath("/admin/branches");
  revalidatePath("/admin/members");

  return { success: `Added to branch as ${branchRole}.` };
}

export async function updateBranchMemberRoleAction(
  _prev: BranchMemberState | null,
  formData: FormData,
): Promise<BranchMemberState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role;
  if (role !== "super_admin" && role !== "branch_admin") {
    return { error: "Updating branch membership requires super_admin or branch_admin role." };
  }

  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const newRole = String(formData.get("branch_role") ?? "") as BranchRole;

  if (!membershipId) return { error: "Membership id required." };
  if (!VALID_BRANCH_ROLES.includes(newRole)) {
    return { error: `Invalid role.` };
  }

  const { error: updateErr } = await supabase
    .from("user_branches")
    .update({ role: newRole })
    .eq("id", membershipId);

  if (updateErr) {
    return { error: `Could not update role: ${updateErr.message}` };
  }

  await supabase.from("data_governance_log").insert({
    action: "branch_member_role_updated",
    summary: `Updated membership ${membershipId} to role ${newRole}`,
    published: false,
    recorded_by: user.id,
  });

  revalidatePath("/admin/branches");
  return { success: `Role updated to ${newRole}.` };
}

export async function removeBranchMemberAction(
  _prev: BranchMemberState | null,
  formData: FormData,
): Promise<BranchMemberState> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role;
  if (role !== "super_admin" && role !== "branch_admin") {
    return { error: "Removing branch members requires super_admin or branch_admin role." };
  }

  const membershipId = String(formData.get("membership_id") ?? "").trim();
  if (!membershipId) return { error: "Membership id required." };

  const { error: delErr } = await supabase
    .from("user_branches")
    .delete()
    .eq("id", membershipId);

  if (delErr) {
    return { error: `Could not remove: ${delErr.message}` };
  }

  await supabase.from("data_governance_log").insert({
    action: "branch_member_removed",
    summary: `Removed membership ${membershipId}`,
    published: false,
    recorded_by: user.id,
  });

  revalidatePath("/admin/branches");
  return { success: "Removed from branch." };
}