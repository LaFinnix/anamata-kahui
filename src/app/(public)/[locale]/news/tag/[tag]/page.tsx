import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Calendar, ArrowRight, ExternalLink } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ tag: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag, locale } = await params;
  return {
    title: `#${decodeURIComponent(tag)} · News`,
    alternates: { canonical: `/${locale}/news/tag/${tag}` },
  };
}

export default async function NewsTagFilterPage({ params }: PageProps) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);
  if (!tag || tag.length > 60) notFound();

  const admin = createAdminClient();
  const { data: items } = await admin
    .from("news_public")
    .select("id, slug, kind, title, summary, published_at, tags, external_url, author_name")
    .contains("tags", [tag])
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

      <Badge variant="outline" className="mt-6 mb-4">Filter · Tag</Badge>
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        #{tag}
      </h1>
      <p className="mt-2 text-muted-foreground">
        All news tagged <code className="font-mono">#{tag}</code>.
      </p>

      <div className="mt-10 space-y-6">
        {!items || items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No news tagged{" "}
              <code className="font-mono">#{tag}</code> yet.
            </CardContent>
          </Card>
        ) : (
          items.map((n) => (
            <Card key={n.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{n.kind}</Badge>
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