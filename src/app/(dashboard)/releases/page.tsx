import { Upload } from "lucide-react";
import Link from "next/link";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateReleaseForm } from "@/components/music/create-release-form";

export const metadata = {
  title: "Release pipeline · Music (Anamata Records)",
  description: "Releases in draft, scheduled, and released states.",
};

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

  const { data: iwiGates } = await supabase
    .from("iwi_gates")
    .select("id, iwi_name, hapu_name, scope")
    .order("iwi_name");

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Music (Anamata Records)</Badge>
            <Badge variant="secondary" className="text-xs">Sub-category</Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">
            Release pipeline
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Tracks progress through draft → scheduled → released. Each
            release passes through the cultural-review pipeline (kaitiaki
            sign-off required before scheduling) before going live.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled>
            <Upload className="h-4 w-4" />
            Upload stems
          </Button>
          <CreateReleaseForm iwiGates={iwiGates ?? []} />
        </div>
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
