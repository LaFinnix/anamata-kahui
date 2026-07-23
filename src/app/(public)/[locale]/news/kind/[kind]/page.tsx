import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Calendar, ArrowRight, ExternalLink } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ kind: string; locale: string }>;
}

const VALID_KINDS = ["release", "feature", "milestone", "partner", "update"] as const;
const KIND_LABELS: Record<string, string> = {
  release: "Release",
  feature: "Feature",
  milestone: "Milestone",
  partner: "Partner",
  update: "Update",
};
const KIND_DESCRIPTIONS: Record<string, string> = {
  release: "New waiata added, partner releases, catalog updates.",
  feature: "New features shipped.",
  milestone: "Corpus size, audit numbers, partner onboarding counts.",
  partner: "New integrations, new funding rounds, new collaborations.",
  update: "Translations, fixes, infrastructure notes.",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kind, locale } = await params;
  if (!VALID_KINDS.includes(kind as (typeof VALID_KINDS)[number])) {
    return { title: "Not found" };
  }
  return {
    title: `${KIND_LABELS[kind] ?? kind} · News`,
    alternates: { canonical: `/${locale}/news/kind/${kind}` },
  };
}

export default async function NewsKindFilterPage({ params }: PageProps) {
  const { kind } = await params;
  if (!VALID_KINDS.includes(kind as (typeof VALID_KINDS)[number])) {
    notFound();
  }

  const admin = createAdminClient();
  const { data: items } = await admin
    .from("news_public")
    .select("id, slug, kind, title, summary, published_at, tags, external_url, author_name")
    .eq("kind", kind)
    .order("published_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href="/news"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to News
      </Link>

      <Badge variant="outline" className="mt-6 mb-4">
        Filter · {KIND_LABELS[kind]}
      </Badge>
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {KIND_LABELS[kind]}s
      </h1>
      <p className="mt-2 text-muted-foreground">
        {KIND_DESCRIPTIONS[kind]}
      </p>

      <div className="mt-10 space-y-6">
        {!items || items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No {KIND_LABELS[kind].toLowerCase()}s published yet.
            </CardContent>
          </Card>
        ) : (
          items.map((n) => (
            <Card key={n.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  {n.published_at && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(n.published_at).toLocaleDateString("en-NZ")}
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
                  <Link href={`/news/${n.slug}`} className="hover:text-bronze-200">
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
    </div>
  );
}