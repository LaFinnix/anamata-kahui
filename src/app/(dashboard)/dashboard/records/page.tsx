import Link from "next/link";
import { Plus, Users, Music } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Roster · Music (Anamata Records)",
  description: "Artists, kaihaka, kaiwaiata, and collaborators on the Anamata Records roster.",
};

/**
 * /dashboard/records — Roster page (formerly "Records dashboard").
 *
 * Renamed from the previous flat-list "Records" to "Roster" inside the
 * Music (Anamata Records) branch group. Lists artists + collaborators
 * + active release count.
 */
export default async function RecordsDashboardPage() {
  const supabase = await createServerSupabase();

  const [{ data: releases }, { data: profiles }] = await Promise.all([
    supabase
      .from("releases")
      .select("id, title, status, release_date")
      .order("release_date", { ascending: false })
      .limit(20),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, iwi_affiliation")
      .in("role", ["artist", "branch_admin"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Music (Anamata Records)</Badge>
            <Badge variant="secondary" className="text-xs">Sub-category</Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Roster</h1>
          <p className="mt-1 text-muted-foreground">
            Artists, kaihaka, kaiwaiata, and collaborators on the Anamata
            Records roster. RLS scopes to your role and branch membership.
          </p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4" />
          Add artist
        </Button>
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl">Recent releases</h2>
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
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl">Roster</h2>
          {profiles && profiles.length > 0 ? (
            <div className="grid gap-3">
              {profiles.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-bronze-300" />
                      <div>
                        <div className="font-medium">{p.full_name ?? "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.iwi_affiliation && (p.iwi_affiliation as string[]).length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {(p.iwi_affiliation as string[])[0]}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="capitalize text-xs">
                        {p.role.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-sm text-muted-foreground italic">
                <Users className="mb-2 h-5 w-5 text-bronze-300" />
                Roster is empty. Add artists via the button above.
              </CardContent>
            </Card>
          )}
        </section>
    </div>
  );
}
