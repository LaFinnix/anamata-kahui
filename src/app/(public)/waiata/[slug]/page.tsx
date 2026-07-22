import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Hash, Music, Shield } from "lucide-react";

import { createServerSupabase, createAdminClient } from "@/lib/supabase/clients";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const revalidate = 300; // refresh every 5 minutes

/**
 * Pre-render the slug list at build time using the service-role client.
 * Using createAdminClient avoids the cookies() call that runs at request time
 * — generateStaticParams executes at build time without an HTTP request, so
 * it can't use the regular server client that reads cookies.
 */
export async function generateStaticParams() {
  const admin = createAdminClient();
  const { data: released } = await admin
    .from("releases")
    .select("metadata")
    .eq("status", "released");

  return (released ?? [])
    .map((r) => (r.metadata as { slug?: string })?.slug)
    .filter((s): s is string => typeof s === "string")
    .map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function WaiataPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabase();

  // Public read of released releases via the existing RLS policy
  // `releases_select_public`. We also pull the linked iwi_consent_id gate
  // so the cultural context is visible.
  const { data: release, error } = await supabase
    .from("releases")
    .select(
      "id, title, description, status, language_code, cultural_sensitivity, metadata, iwi_consent_id, release_date, upc, isrc, created_at",
    )
    .eq("metadata->>slug", slug)
    .eq("status", "released")
    .maybeSingle();

  if (error || !release) {
    notFound();
  }

  // Fetch the linked iwi gate if any.
  const { data: gate } = release.iwi_consent_id
    ? await supabase
        .from("iwi_gates")
        .select("iwi_name, scope, notes")
        .eq("id", release.iwi_consent_id)
        .maybeSingle()
    : { data: null };

  const meta = (release.metadata ?? {}) as {
    slug?: string;
    source?: string;
    iwi_gates?: string[];
    english_gloss?: string;
    cultural_flags?: string[];
    kinds?: string[];
  };

  return (
    <article className="prose prose-invert mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Link href="/records" className="text-sm text-bronze-300 hover:text-bronze-200">
        ← Back to Records
      </Link>

      <header className="mt-6">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-bronze-300" />
          <Badge variant="success">Released</Badge>
          {meta.kinds?.map((k) => (
            <Badge key={k} variant="outline" className="capitalize">{k}</Badge>
          ))}
        </div>
        <h1 className="mt-4 font-display">{release.title}</h1>
        {meta.english_gloss && (
          <p className="mt-2 text-lg italic text-muted-foreground">{meta.english_gloss}</p>
        )}
      </header>

      <section className="not-prose mt-8 grid gap-3 text-sm">
        {release.release_date && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Released {new Date(release.release_date).toLocaleDateString("en-NZ", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        )}
        {(release.upc || release.isrc) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hash className="h-4 w-4" />
            {release.upc && <span>UPC: <code className="font-mono text-xs">{release.upc}</code></span>}
            {release.upc && release.isrc && <span>·</span>}
            {release.isrc && <span>ISRC: <code className="font-mono text-xs">{release.isrc}</code></span>}
          </div>
        )}
      </section>

      {release.description && (
        <section className="not-prose mt-10">
          <h2 className="font-display text-2xl">About this waiata</h2>
          <p className="mt-3 text-muted-foreground">{release.description}</p>
          {meta.source && (
            <p className="mt-2 text-sm text-muted-foreground">
              Source: {meta.source}
            </p>
          )}
        </section>
      )}

      <section className="not-prose mt-10">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-pounamu-300" />
              <CardTitle className="text-lg">Cultural provenance</CardTitle>
            </div>
            <CardDescription>
              Every released waiata has a documented cultural-review lineage.
              This section surfaces that lineage from our live data — not a claim.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {gate && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Kaitiaki gate
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-medium">{gate.iwi_name}</span>
                  <Badge variant="outline" className="capitalize">
                    {gate.scope.replace("_", " ")}
                  </Badge>
                </div>
                {gate.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">{gate.notes}</p>
                )}
              </div>
            )}

            {meta.iwi_gates && meta.iwi_gates.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Attributed iwi
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {meta.iwi_gates.map((iwi) => (
                    <Badge key={iwi} variant="secondary">{iwi}</Badge>
                  ))}
                </div>
              </div>
            )}

            {meta.cultural_flags && meta.cultural_flags.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Cultural flags
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {meta.cultural_flags.map((flag) => (
                    <Badge key={flag} variant="outline">{flag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Cultural sensitivity
              </div>
              <div className="mt-1">
                <Badge variant={release.cultural_sensitivity === "open" ? "success" : "outline"} className="capitalize">
                  {release.cultural_sensitivity.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="not-prose mt-10">
        <h2 className="font-display text-2xl">Listen · Tautoko</h2>
        <p className="mt-3 text-muted-foreground">
          Streaming links populate here once distribution is wired up.
          Until then, the catalog metadata + cultural provenance above
          is the canonical record.
        </p>
      </section>
    </article>
  );
}
