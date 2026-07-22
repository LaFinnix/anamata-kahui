import Link from "next/link";
import { Users } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Members · Admin",
  description: "All profiles on the platform — staff, kaitiaki, artists, researchers.",
};

/**
 * /dashboard/admin/members — list all profiles for super_admin and
 * branch_admin. RLS scopes to profile.role visibility.
 *
 * Staff can edit role + branch membership here once we add the
 * update actions (deferred to the collaboration milestone).
 */
export default async function MembersPage() {
  const supabase = await createServerSupabase();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at, iwi_affiliation, opted_in_public_directory")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">Admin</Badge>
          <Badge variant="secondary" className="text-xs">Sub-category</Badge>
        </div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Members</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          All profiles on the platform. Staff can manage roles and branch
          membership once that workflow ships (see{" "}
          <Link href="/dashboard/admin/iwi-gate" className="text-bronze-300 hover:text-bronze-200 underline">
            /dashboard/admin/iwi-gate
          </Link>{" "}
          for the kaitiaki analogue).
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground italic">
          <Users className="mb-2 h-5 w-5 text-bronze-300" />
          {members && members.length > 0
            ? `${members.length} member${members.length === 1 ? "" : "s"} on record.`
            : "No members yet. Sign up via /register to add the first real user."}
        </CardContent>
      </Card>

      {members && members.length > 0 && (
        <section className="grid gap-3">
          {members.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{m.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {m.role.replace("_", " ")}
                  </Badge>
                  {m.opted_in_public_directory && (
                    <Badge variant="success" className="text-xs">public</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
