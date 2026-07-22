import Link from "next/link";
import { Plus } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Records dashboard" };

export default async function RecordsDashboardPage() {
  // The (dashboard) layout already redirects unauthenticated users to /login.
  const supabase = await createServerSupabase();

  const { data: releases } = await supabase
    .from("releases")
    .select("id, title, status, release_date")
    .order("release_date", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Records</h1>
          <p className="mt-1 text-muted-foreground">
            Releases you can see, scoped by RLS to your role and branch membership.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New release
        </Button>
      </div>

      {releases && releases.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {releases.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xl">{r.title}</CardTitle>
                  <Badge variant={r.status === "released" ? "success" : "outline"} className="capitalize">
                    {r.status}
                  </Badge>
                </div>
                <CardDescription>
                  {r.release_date ? new Date(r.release_date).toLocaleDateString("en-NZ") : "Unscheduled"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/releases/${r.id}`} className="text-sm text-bronze-300 hover:text-bronze-200">
                  Open release →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No releases yet</CardTitle>
            <CardDescription>
              Create your first release to start the pipeline.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
