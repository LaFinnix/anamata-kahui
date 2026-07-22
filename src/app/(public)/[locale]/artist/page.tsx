import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const revalidate = 600;
export const metadata = { title: "Artists" };

/**
 * Public artist roster.
 *
 * Surfaces profiles that opted into the public directory
 * (`opted_in_public_directory = true`). Artists who haven't opted in are
 * not listed — explicit consent, not implied.
 */
export default async function ArtistIndexPage() {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, bio, role, iwi_affiliation, te_reo_proficiency, avatar_url")
    .eq("opted_in_public_directory", true)
    .in("role", ["artist", "researcher"])
    .order("full_name");

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Public directory</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Artists & researchers
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Kāhui members who have opted into the public directory. Each
        profile is opt-in — explicit consent, not implied.
      </p>

      {(!profiles || profiles.length === 0) ? (
        <Card className="mt-12 border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground italic">
            No public-directory profiles yet. Members can opt in via{" "}
            <code>/dashboard/settings</code> (coming soon).
          </CardContent>
        </Card>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <Card key={p.id} className="group transition-colors hover:border-bronze-500/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bronze-400/15 font-display text-lg font-semibold text-bronze-200">
                    {p.full_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{p.full_name ?? "Kāhui member"}</CardTitle>
                    <Badge variant="outline" className="mt-1 capitalize">{p.role}</Badge>
                  </div>
                </div>
                {p.bio && (
                  <CardDescription className="line-clamp-3">{p.bio}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.isArray(p.iwi_affiliation) && p.iwi_affiliation.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(p.iwi_affiliation as string[]).map((iwi) => (
                      <Badge key={iwi} variant="secondary">{iwi}</Badge>
                    ))}
                  </div>
                )}
                {p.te_reo_proficiency && (
                  <p className="text-xs text-muted-foreground">
                    Te reo Māori: <span className="capitalize">{p.te_reo_proficiency.replace("_", " ")}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
