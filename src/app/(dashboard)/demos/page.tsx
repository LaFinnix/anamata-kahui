import Link from "next/link";
import { Mic2, Plus, Music } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Demos · Music (Anamata Records)",
  description: "Demo submissions and pre-release material for the Anamata Records branch.",
};

/**
 * /dashboard/demos — demo submissions track.
 *
 * Demos = tracks in progress that haven't reached the release pipeline yet.
 * Live querying from `releases` where status = 'draft' AND has demo
 * metadata. Currently the `releases` table doesn't have an `is_demo`
 * column, so this surface reads draft releases as a proxy.
 *
 * When the `0010_collaboration.sql` migration lands, this will switch to
 * a proper `demos` table with submission state machine + audio upload.
 */
export default async function DemosPage() {
  const supabase = await createServerSupabase();
  const { data: drafts } = await supabase
    .from("releases")
    .select("id, title, status, created_at, metadata")
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Music (Anamata Records)</Badge>
            <Badge variant="secondary" className="text-xs">Sub-category</Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Demos</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Tracks in progress. Demos are pre-release submissions that
            haven't entered the cultural-review pipeline yet.
          </p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4" />
          Submit demo
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Active demos</CardDescription>
            <CardTitle className="text-3xl">{drafts?.length ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Tracks in `draft` state.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Submitted</CardDescription>
            <CardTitle className="text-3xl">—</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Awaiting first real submissions.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Accepted</CardDescription>
            <CardTitle className="text-3xl">—</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Promoted to the release pipeline.
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl">Drafts</h2>
        {(!drafts || drafts.length === 0) ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground italic">
              <Mic2 className="mb-2 h-5 w-5 text-bronze-300" />
              No demos yet. Once the `0010_collaboration.sql` migration
              lands, this surface will accept audio submissions directly.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {drafts.map((d) => (
              <Link key={d.id} href={`/releases/${d.id}`}>
                <Card className="transition-colors hover:border-bronze-500/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Music className="h-4 w-4 text-bronze-300" />
                      <span className="font-medium">{d.title}</span>
                    </div>
                    <Badge variant="outline">draft</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
