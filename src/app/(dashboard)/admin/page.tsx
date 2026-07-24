import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, Users, Music, FileText } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";

export const metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Super admins see all metrics; branch admins / artists see scoped counts.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = profile?.role === "super_admin";

  // Counts via RLS-safe queries. super_admin sees everything; others see only
  // what their policies permit.
  const [releases, profiles] = await Promise.all([
    supabase.from("releases").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-8">
      <ActiveContextBanner />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">
            Kāhui overview
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isSuperAdmin
              ? "Full platform access. Manage branches, members, and content across the ecosystem."
              : "Your access across the Kāhui. Switch branches via the sidebar."}
          </p>
        </div>
        {isSuperAdmin && (
          <Badge variant="success" className="gap-1">
            <Activity className="h-3 w-3" />
            Super admin
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <Music className="h-5 w-5 text-bronze-300" />
            <CardTitle className="text-2xl">{releases.count ?? 0}</CardTitle>
            <CardDescription>Releases</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Users className="h-5 w-5 text-bronze-300" />
            <CardTitle className="text-2xl">{profiles.count ?? 0}</CardTitle>
            <CardDescription>Profiles</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <FileText className="h-5 w-5 text-bronze-300" />
            <CardTitle className="text-2xl">—</CardTitle>
            <CardDescription>Research docs</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Activity className="h-5 w-5 text-bronze-300" />
            <CardTitle className="text-2xl">—</CardTitle>
            <CardDescription>Active sessions</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to the Kāhui</CardTitle>
          <CardDescription>
            Use the sidebar to navigate to your branch dashboards. Super admins
            can manage every branch; branch admins and artists see only what
            they own.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-bronze-300 hover:text-bronze-200" href="/dashboard/records">Records dashboard →</Link></li>
            <li><Link className="text-bronze-300 hover:text-bronze-200" href="/dashboard/releases">Release pipeline →</Link></li>
            <li><Link className="text-bronze-300 hover:text-bronze-200" href="/analytics">Stream & revenue analytics →</Link></li>
            <li><Link className="text-bronze-300 hover:text-bronze-200" href="/dashboard/research">Research portal →</Link></li>
            <li><Link className="text-bronze-300 hover:text-bronze-200" href="/dashboard/dev">Dev console →</Link></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
