import { Plus, Upload } from "lucide-react";
import Link from "next/link";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Release pipeline" };

export default async function ReleasesPage() {
  const supabase = await createServerSupabase();
  const { data: releases } = await supabase
    .from("releases")
    .select("id, title, status, release_date")
    .order("updated_at", { ascending: false })
    .limit(20);

  const buckets = {
    draft:     releases?.filter((r) => r.status === "draft")     ?? [],
    scheduled: releases?.filter((r) => r.status === "scheduled") ?? [],
    released:  releases?.filter((r) => r.status === "released")  ?? [],
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">
            Release pipeline
          </h1>
          <p className="mt-1 text-muted-foreground">
            Move a release through draft → scheduled → released. Upload stems
            and artwork once a release exists.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New release
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {(["draft", "scheduled", "released"] as const).map((stage) => (
          <div key={stage}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-bronze-300">
              {stage}
            </h2>
            <div className="space-y-3">
              {buckets[stage].length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    No {stage} releases.
                  </CardContent>
                </Card>
              ) : (
                buckets[stage].map((r) => (
                  <Card key={r.id}>
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{r.title}</CardTitle>
                        <Badge variant="outline" className="capitalize">{r.status}</Badge>
                      </div>
                      <CardDescription>
                        {r.release_date
                          ? new Date(r.release_date).toLocaleDateString("en-NZ")
                          : "Unscheduled"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2 p-4 pt-0">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/releases/${r.id}`}>Open</Link>
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Upload className="h-3.5 w-3.5" />
                        Stems
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
