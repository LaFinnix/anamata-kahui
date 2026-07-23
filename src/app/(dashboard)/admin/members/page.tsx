import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Shield } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";
import { AddBranchMemberForm } from "@/components/admin/add-branch-member-form";
import { BranchMemberRow } from "@/components/admin/branch-member-row";

export const metadata = {
  title: "Members & branches · Admin",
  description:
    "All profiles on the platform + branch membership management for super_admin and branch_admin roles.",
};

export const revalidate = 30;

/**
 * /admin/members — combined people + branch management.
 *
 * Two sections:
 *   1. **All profiles** — every account on the platform (super_admin /
 *      branch_admin view; artist/researcher/client see only public profiles)
 *   2. **Branch membership** — manage user_branches for branches the
 *      current user has lead/admin access to (or all branches for super_admin)
 *
 * Merged the previous /admin/branches and /admin/members pages because
 * they shared the same audience and questions — who's on the platform
 * and where do they belong.
 */
export default async function MembersPage() {
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

  // Fetch in parallel
  const [
    { data: members },
    { data: branches },
    { data: ownMemberships },
    { data: allProfiles },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at, iwi_affiliation, opted_in_public_directory")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("branches")
      .select("id, slug, name, description")
      .order("name"),
    supabase
      .from("user_branches")
      .select("branch_id, role")
      .eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .order("full_name"),
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
        const { data: branchMembers } = await supabase
          .from("user_branches")
          .select("id, user_id, role, profiles:user_id(full_name, email, role)")
          .eq("branch_id", branch.id)
          .order("role");
        return { branch, members: branchMembers ?? [] };
      }),
  );

  return (
    <div className="space-y-8">
      <ActiveContextBanner />

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">Admin</Badge>
          <Badge variant="secondary" className="text-xs">Sub-category</Badge>
        </div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">
          Members &amp; branches
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Everyone on the platform, and the per-branch team rosters.
        </p>
      </div>

      {/* Profile list */}
      <section>
        <h2 className="mb-3 font-display text-2xl">
          <Users className="mr-2 inline h-5 w-5 text-bronze-300" />
          All profiles ({members?.length ?? 0})
        </h2>
        {!members || members.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm italic text-muted-foreground">
              No profiles yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {members.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex items-center justify-between p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {m.full_name ?? m.email ?? "Unknown"}
                    </p>
                    {m.email && (
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.iwi_affiliation && (
                      <Badge variant="outline" className="text-xs">
                        {m.iwi_affiliation}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="capitalize">
                      {m.role.replace("_", " ")}
                    </Badge>
                    {m.opted_in_public_directory ? (
                      <Badge variant="outline" className="text-xs">Listed</Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Branch management */}
      {isBranchAdmin && (
        <section>
          <h2 className="mb-3 font-display text-2xl">
            <Shield className="mr-2 inline h-5 w-5 text-bronze-300" />
            Branch membership
          </h2>
          {branchData.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                You don't have user_branches access to any branch yet.
                Contact a super admin to be added.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {branchData.map(({ branch, members: branchMembers }) => {
                const ownRole = ownMemberships?.find(
                  (m) => m.branch_id === branch.id,
                )?.role;
                const canManage =
                  isSuperAdmin || ownRole === "lead" || ownRole === "admin";

                const memberUserIds = new Set(
                  branchMembers.map((m) => m.user_id),
                );
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
                          Members ({branchMembers.length})
                        </h3>
                        {branchMembers.length === 0 ? (
                          <p className="text-sm italic text-muted-foreground">
                            No members yet. Add the first below.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {branchMembers.map((m) => {
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
              })}
            </div>
          )}
        </section>
      )}

      {!isBranchAdmin && (
        <section>
          <Card className="border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground">
              <Shield className="mb-2 h-5 w-5 text-bronze-300" />
              Branch management requires the{" "}
              <Badge variant="outline">super_admin</Badge> or{" "}
              <Badge variant="outline">branch_admin</Badge> role. Your
              account is <Badge variant="outline">{role ?? "no role"}</Badge>.
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}