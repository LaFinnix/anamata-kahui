import Link from "next/link";
import { Newspaper, ArrowRight, Calendar, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "News · Anamata Kāhui",
    description:
      "Time-sensitive updates from Anamata Kāhui — new releases, feature ships, milestones, partner integrations, and infrastructure updates.",
    alternates: {
      canonical: `/${locale}/news`,
      languages: {
        en: "/en/news",
        mi: "/mi/news",
      },
    },
  };
}

const KIND_LABELS: Record<string, string> = {
  release: "Release",
  feature: "Feature",
  milestone: "Milestone",
  partner: "Partner",
  update: "Update",
};

const KIND_DESCRIPTIONS: Record<string, string> = {
  release: "New waiata added, partner releases, catalog updates.",
  feature: "New features shipped (cultural review, stem upload, Local Contexts sync).",
  milestone: "Corpus size, audit numbers, partner onboarding counts.",
  partner: "New integrations, new funding rounds, new collaborations.",
  update: "Translations, fixes, infrastructure notes, dependency updates.",
};

/**
 * /[locale]/news — index of published news, sorted by published_at desc.
 */
export default async function NewsIndexPage() {
  const admin = createAdminClient();

  const { data: items } = await admin
    .from("news_public")
    .select("id, slug, kind, title, summary, published_at, tags, external_url, author_name")
    .order("published_at", { ascending: false })
    .limit(50);

  const counts = {
    release: items?.filter((n) => n.kind === "release").length ?? 0,
    feature: items?.filter((n) => n.kind === "feature").length ?? 0,
    milestone: items?.filter((n) => n.kind === "milestone").length ?? 0,
    partner: items?.filter((n) => n.kind === "partner").length ?? 0,
    update: items?.filter((n) => n.kind === "update").length ?? 0,
  };

  const tagSet = new Set<string>();
  for (const n of items ?? []) {
    for (const t of n.tags ?? []) tagSet.add(t);
  }
  const topTags = Array.from(tagSet).sort().slice(0, 12);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Time-sensitive · Updates</Badge>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        News
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        What's new from Anamata Kāhui — releases, feature ships,
        milestones, partner integrations, and infrastructure updates.
        Search-engine and RSS friendly.
      </p>

      {/* Kind filter chips */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Link href="/news">
          <Badge variant="default" className="cursor-pointer">
            All ({items?.length ?? 0})
          </Badge>
        </Link>
        {(["release", "feature", "milestone", "partner", "update"] as const).map((kind) => (
          <Link key={kind} href={`/news/kind/${kind}`}>
            <Badge variant="secondary" className="cursor-pointer">
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
            <Link key={tag} href={`/news/tag/${encodeURIComponent(tag)}`}>
              <Badge variant="outline" className="cursor-pointer text-xs">
                #{tag}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* List */}
      <div className="mt-10 space-y-6">
        {!items || items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              <Newspaper className="mx-auto mb-2 h-6 w-6 text-bronze-300" />
              No news published yet. Check back soon — or subscribe to the
              <Link href="/news/rss.xml" className="ml-1 text-bronze-300 hover:text-bronze-200 underline">
                RSS feed
              </Link>.
            </CardContent>
          </Card>
        ) : (
          items.map((n) => (
            <Card key={n.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{KIND_LABELS[n.kind] ?? n.kind}</Badge>
                  {n.published_at && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(n.published_at).toLocaleDateString("en-NZ", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {n.author_name && (
                    <span className="text-xs text-muted-foreground">
                      · by {n.author_name}
                    </span>
                  )}
                  {n.external_url && (
                    <a
                      href={n.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-bronze-300 hover:text-bronze-200"
                    >
                      <ExternalLink className="h-3 w-3" />
                      External
                    </a>
                  )}
                </div>
                <CardTitle className="font-display text-2xl">
                  <Link
                    href={`/news/${n.slug}`}
                    className="hover:text-bronze-200"
                  >
                    {n.title}
                  </Link>
                </CardTitle>
                {n.summary && <CardDescription>{n.summary}</CardDescription>}
              </CardHeader>
              <CardContent>
                <Link href={`/news/${n.slug}`}>
                  <button className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-3 text-sm hover:bg-muted">
                    Read
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="mt-12 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Newspaper className="h-4 w-4 text-bronze-300" />
            About News
          </CardTitle>
          <CardDescription>
            Five kinds: <strong>Release</strong> ({KIND_DESCRIPTIONS.release}),{" "}
            <strong>Feature</strong> ({KIND_DESCRIPTIONS.feature}),{" "}
            <strong>Milestone</strong> ({KIND_DESCRIPTIONS.milestone}),{" "}
            <strong>Partner</strong> ({KIND_DESCRIPTIONS.partner}),{" "}
            <strong>Update</strong> ({KIND_DESCRIPTIONS.update}).
            Distinct from <strong>Reads</strong> (long-form) — News is
            short, time-sensitive, and SEO-optimised.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Subscribe via{" "}
            <Link
              href="/news/rss.xml"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              RSS
            </Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}