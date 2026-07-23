import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Shield, ChevronRight } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";
import { AddBranchMemberForm } from "@/components/admin/add-branch-member-form";
import { BranchMemberRow } from "@/components/admin/branch-member-row";

export const metadata = {
  title: "Branches · Admin",
  description:
    "Branch admin tool — manage membership and per-branch roles for any branch you have user_branches access to.",
};

export const revalidate = 30;

/**
 * /admin/branches — branch admin tool.
 *
 * Audience: super_admin + branch_admin (platform role) + lead/admin
 * (per-branch role). See the RLS policies on user_branches for write
 * authorisation.
 *
 * Shows:
 *   - Branches the user has access to (via user_branches)
 *   - All members of each branch (RLS-scoped)
 *   - Add member form (role picker)
 *   - Per-member row with role-change + remove actions
 */
export default async function BranchesPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  const role = profile?.role;
  const isSuperAdmin = role === "super_admin";
  const isBranchAdmin = role === "branch_admin" || isSuperAdmin;

  if (!isBranchAdmin) {
    return (
      <div className="space-y-8">
        <ActiveContextBanner />
        <Card>
          <CardHeader>
            <CardTitle>Branch admin access required</CardTitle>
            <CardDescription>
              This page is for <Badge variant="outline">super_admin</Badge> and{" "}
              <Badge variant="outline">branch_admin</Badge> roles. Your
              account is <Badge variant="outline">{role ?? "no role"}</Badge>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you should have access, contact a super admin to upgrade
              your role.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch branches + user's memberships
  const [{ data: branches }, { data: ownMemberships }] = await Promise.all([
    supabase.from("branches").select("id, slug, name, description").order("name"),
    supabase
      .from("user_branches")
      .select("branch_id, role")
      .eq("user_id", user.id),
  ]);

  // For super_admin: show ALL branches + their members.
  // For branch_admin: show only branches they have user_branches access to.
  const accessibleBranchIds = isSuperAdmin
    ? (branches ?? []).map((b) => b.id)
    : (ownMemberships ?? []).map((m) => m.branch_id);

  // For each accessible branch, fetch the member list
  const branchData = await Promise.all(
    (branches ?? [])
      .filter((b) => accessibleBranchIds.includes(b.id))
      .map(async (branch) => {
        const { data: members } = await supabase
          .from("user_branches")
          .select("id, user_id, role, profiles:user_id(full_name, email, role)")
          .eq("branch_id", branch.id)
          .order("role");
        return { branch, members: members ?? [] };
      }),
  );

  // Profile lookup for add form: list profiles that aren't yet members of each branch
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name");

  return (
    <div className="space-y-8">
      <ActiveContextBanner />

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">Admin · Branch</Badge>
          <Badge variant="secondary" className="capitalize">
            {role}
          </Badge>
        </div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">
          Branches &amp; members
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          {isSuperAdmin
            ? "As super admin, you can manage membership in every branch."
            : "As branch admin, you can manage membership in the branches you have lead or admin access to."}
        </p>
      </div>

      <div className="space-y-6">
        {branchData.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              You don't have user_branches access to any branch yet.
              Contact a super admin to be added.
            </CardContent>
          </Card>
        ) : (
          branchData.map(({ branch, members }) => {
            const ownRole = ownMemberships?.find((m) => m.branch_id === branch.id)?.role;
            const canManage = isSuperAdmin || ownRole === "lead" || ownRole === "admin";

            // Filter profile list to those not already in the branch
            const memberUserIds = new Set(members.map((m) => m.user_id));
            const availableProfiles = (allProfiles ?? []).filter(
              (p) => !memberUserIds.has(p.id),
            );

            return (
              <Card key={branch.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{branch.name}</CardTitle>
                      {branch.description && (
                        <CardDescription>{branch.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {branch.slug}
                      </Badge>
                      {ownRole && (
                        <Badge variant="secondary" className="capitalize">
                          You: {ownRole}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                      Members ({members.length})
                    </h3>
                    {members.length === 0 ? (
                      <p className="text-sm italic text-muted-foreground">
                        No members yet. Add the first below.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {members.map((m) => {
                          const profileData = m.profiles as unknown as {
                            full_name: string | null;
                            email: string | null;
                            role: string;
                          } | null;
                          return (
                            <BranchMemberRow
                              key={m.id}
                              membershipId={m.id}
                              fullName={profileData?.full_name ?? null}
                              email={profileData?.email ?? null}
                              platformRole={profileData?.role ?? "client"}
                              branchRole={m.role}
                              canManage={canManage}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {canManage && (
                    <div className="border-t border-border pt-4">
                      <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                        Add member
                      </h3>
                      <AddBranchMemberForm
                        branchId={branch.id}
                        branchName={branch.name}
                        availableProfiles={availableProfiles.map((p) => ({
                          id: p.id,
                          label: `${p.full_name ?? p.email} (${p.role})`,
                        }))}
                      />
                    </div>
                  )}

                  {!canManage && (
                    <p className="text-xs italic text-muted-foreground">
                      Your per-branch role ({ownRole ?? "none"}) is read-only
                      here. Contact a lead or admin to make changes.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}