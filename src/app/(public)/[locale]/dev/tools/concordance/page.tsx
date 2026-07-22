import Link from "next/link";
import { ArrowLeft, Search, Music } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Reo Māori concordance · Dev tools",
  description:
    "Interactive tool — search the released waiata catalogue for te reo Māori terms found in metadata.",
};

interface Props {
  searchParams: Promise<{ q?: string }>;
}

/**
 * /dev/tools/concordance
 *
 * Real search over the released waiata catalogue. Searches through:
 *   - title (ilike %term%)
 *   - metadata kinds[]
 *   - metadata cultural_flags[]
 *   - metadata english_gloss
 *
 * For research funders: demonstrates that the platform's metadata
 * schema is queryable and the catalogue is a usable research corpus.
 */
export default async function ConcordancePage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const admin = createAdminClient();

  // Always show full catalogue when no query
  const { data: releases } = await admin
    .from("releases")
    .select("id, title, status, metadata")
    .eq("status", "released")
    .order("title");

  type ReleaseRow = {
    id: string;
    title: string;
    metadata: {
      kinds?: string[];
      cultural_flags?: string[];
      english_gloss?: string;
      [k: string]: unknown;
    } | null;
  };

  const allReleases = (releases ?? []) as ReleaseRow[];

  const matches = q
    ? allReleases.filter((r) => {
        const ql = q.toLowerCase();
        if (r.title.toLowerCase().includes(ql)) return true;
        const meta = r.metadata ?? {};
        if ((meta.english_gloss ?? "").toLowerCase().includes(ql)) return true;
        if ((meta.kinds ?? []).some((k) => k.toLowerCase().includes(ql))) return true;
        if ((meta.cultural_flags ?? []).some((f) => f.toLowerCase().includes(ql))) return true;
        return false;
      })
    : allReleases;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href="/dev"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Dev & Tech
      </Link>

      <Badge variant="outline" className="mt-6 mb-4">
        Interactive tool · Research branch
      </Badge>
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Reo Māori concordance
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Real query over the released waiata catalogue. Searches te reo
        Māori terms in titles, kinds, cultural flags, and English
        glosses. Try <code className="font-mono text-xs">waiata</code>,
        <code className="font-mono text-xs">mihi</code>, or
        <code className="font-mono text-xs">karanga</code>.
      </p>

      {/* Search form */}
      <form action="" method="get" className="mt-8 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search term (te reo Māori or English)..."
            className="h-10 w-full rounded-md border border-border bg-input pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="h-10 rounded-md bg-bronze-400 px-4 text-sm font-medium text-background hover:bg-bronze-300"
        >
          Search
        </button>
      </form>

      <p className="mt-3 text-sm text-muted-foreground">
        {q ? (
          <>
            <strong>{matches.length}</strong>{" "}
            match{matches.length === 1 ? "" : "es"} for{" "}
            <code className="font-mono">"{q}"</code>
          </>
        ) : (
          <>
            Showing all <strong>{allReleases.length}</strong> released waiata
          </>
        )}
      </p>

      {/* Results */}
      <div className="mt-6 space-y-3">
        {matches.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No matches. Try a different term.
            </CardContent>
          </Card>
        )}
        {matches.map((r) => {
          const meta = r.metadata ?? {};
          return (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-bronze-300" />
                  <CardTitle className="text-base">{r.title}</CardTitle>
                </div>
                {meta.english_gloss && (
                  <CardDescription>{meta.english_gloss}</CardDescription>
                )}
              </CardHeader>
              {(meta.kinds?.length ?? 0) + (meta.cultural_flags?.length ?? 0) > 0 && (
                <CardContent className="flex flex-wrap gap-1.5">
                  {(meta.kinds ?? []).map((k) => (
                    <Badge key={`k-${k}`} variant="outline" className="text-xs">
                      {k}
                    </Badge>
                  ))}
                  {(meta.cultural_flags ?? []).map((f) => (
                    <Badge key={`f-${f}`} variant="secondary" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}