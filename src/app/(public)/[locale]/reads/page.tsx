import Link from "next/link";
import { FileText, Clock, ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Reads · Anamata Kāhui",
    description:
      "Research-grade long-form content from Anamata Kāhui — analysis, methodology, and original datasets on Māori music, indigenous data governance, and the cultural tech sector.",
    alternates: {
      canonical: `/${locale}/reads`,
      languages: {
        en: "/en/reads",
        mi: "/mi/reads",
      },
    },
  };
}

const KIND_LABELS: Record<string, string> = {
  note: "Note",
  research: "Research",
  data_drop: "Data drop",
};

const KIND_DESCRIPTIONS: Record<string, string> = {
  note: "Mid-length analysis (1,500-3,000 words) of a question, with methodology + sources.",
  research: "Multi-week research projects with original data (3,000-8,000 words).",
  data_drop: "Quick-turnaround analysis tied to a downloadable dataset (500-1,500 words).",
};

/**
 * /[locale]/reads — index of published reads, sorted by published_at.
 *
 * Uses the admin client because the public `reads_public` view doesn't
 * allow filtering by status from anon role (RLS on base table does).
 * The view is exposed to anon via grant — let me just use the view.
 */
export default async function ReadsIndexPage() {
  const admin = createAdminClient();

  const { data: reads } = await admin
    .from("reads_public")
    .select("id, slug, kind, title, subtitle, published_at, reading_time_minutes, tags, author_name, author_role")
    .order("published_at", { ascending: false })
    .limit(50);

  // Bucket by kind for the index header
  const counts = {
    note: reads?.filter((r) => r.kind === "note").length ?? 0,
    research: reads?.filter((r) => r.kind === "research").length ?? 0,
    data_drop: reads?.filter((r) => r.kind === "data_drop").length ?? 0,
  };

  // Collect unique tags
  const tagSet = new Set<string>();
  for (const r of reads ?? []) {
    for (const t of r.tags ?? []) tagSet.add(t);
  }
  const topTags = Array.from(tagSet).sort().slice(0, 12);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Long-form · Research-grade</Badge>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Reads
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Not a blog. Research-grade long-form — original analysis,
        methodology, and downloadable datasets. Cited by other
        researchers; archival, not disposable.
      </p>

      {/* Kind filter chips */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Link href="/reads">
          <Badge variant="default" className="cursor-pointer">
            All ({reads?.length ?? 0})
          </Badge>
        </Link>
        {(["note", "research", "data_drop"] as const).map((kind) => (
          <Link key={kind} href={`/reads/kind/${kind}`}>
            <Badge variant="secondary" className="cursor-pointer capitalize">
              {KIND_LABELS[kind]} ({counts[kind]})
            </Badge>
          </Link>
        ))}
      </div>

      {/* Tag chips */}
      {topTags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Tags:
          </span>
          {topTags.map((tag) => (
            <Link key={tag} href={`/reads/tag/${encodeURIComponent(tag)}`}>
              <Badge variant="outline" className="cursor-pointer text-xs">
                #{tag}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* List */}
      <div className="mt-10 space-y-6">
        {!reads || reads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              <BookOpen className="mx-auto mb-2 h-6 w-6 text-bronze-300" />
              No reads published yet. Check back soon — or subscribe to the
              <Link href="/reads/rss.xml" className="ml-1 text-bronze-300 hover:text-bronze-200 underline">
                RSS feed
              </Link>.
            </CardContent>
          </Card>
        ) : (
          reads.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{KIND_LABELS[r.kind]}</Badge>
                  {r.published_at && (
                    <span className="text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {new Date(r.published_at).toLocaleDateString("en-NZ", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {r.reading_time_minutes ?? "—"} min read
                  </span>
                  {r.author_name && (
                    <span className="text-xs text-muted-foreground">
                      · by {r.author_name}
                    </span>
                  )}
                </div>
                <CardTitle className="font-display text-2xl">
                  <Link
                    href={`/reads/${r.slug}`}
                    className="hover:text-bronze-200"
                  >
                    {r.title}
                  </Link>
                </CardTitle>
                {r.subtitle && <CardDescription>{r.subtitle}</CardDescription>}
              </CardHeader>
              <CardContent>
                <Link href={`/reads/${r.slug}`}>
                  <Button variant="ghost" size="sm">
                    Read
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="mt-12 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-bronze-300" />
            About Reads
          </CardTitle>
          <CardDescription>
            Three content types: <strong>Note</strong> ({KIND_DESCRIPTIONS.note}),{" "}
            <strong>Research</strong> ({KIND_DESCRIPTIONS.research}),{" "}
            <strong>Data drop</strong> ({KIND_DESCRIPTIONS.data_drop}).
            Every published read goes through cultural review (when
            applicable) and is citeable — a permanent URL with author,
            date, and dataset links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Subscribe via{" "}
            <Link
              href="/reads/rss.xml"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              RSS
            </Link>{" "}
            (most feed readers). i18n: te reo Māori translations coming.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}