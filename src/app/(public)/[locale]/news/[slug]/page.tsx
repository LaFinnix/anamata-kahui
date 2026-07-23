import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Calendar, User, ExternalLink, Newspaper } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewsHero } from "@/components/news/news-hero";

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
}

const KIND_LABELS: Record<string, string> = {
  release: "Release",
  feature: "Feature",
  milestone: "Milestone",
  partner: "Partner",
  update: "Update",
};

const KIND_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  release: "default",
  feature: "default",
  milestone: "secondary",
  partner: "secondary",
  update: "outline",
};

/** Pre-render published news at build time. */
export async function generateStaticParams() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("news_public")
    .select("slug")
    .order("published_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const admin = createAdminClient();
  const { data: news } = await admin
    .from("news_public")
    .select("title, summary, meta_description, author_name, published_at, kind, external_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!news) {
    return { title: "Not found" };
  }

  const description = news.meta_description ?? news.summary ?? undefined;

  return {
    title: news.title,
    description,
    alternates: {
      canonical: `/${locale}/news/${slug}`,
      languages: {
        en: `/en/news/${slug}`,
        mi: `/mi/news/${slug}`,
      },
    },
    openGraph: {
      type: "article",
      title: news.title,
      description,
      publishedTime: news.published_at ?? undefined,
      locale: locale === "mi" ? "mi_NZ" : "en_NZ",
    },
    twitter: {
      card: "summary_large_image",
      title: news.title,
      description,
    },
  };
}

/**
 * /[locale]/news/[slug] — full news entry detail page.
 */
export default async function NewsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: news } = await admin
    .from("news_public")
    .select("id, slug, kind, title, summary, body_html, published_at, tags, external_url, author_name, author_role, featured_image_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!news) notFound();

  // JSON-LD: NewsArticle schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: news.title,
    description: news.summary ?? undefined,
    datePublished: news.published_at ?? undefined,
    author: news.author_name
      ? { "@type": "Person", name: news.author_name }
      : undefined,
    keywords: news.tags?.join(", ") ?? undefined,
    publisher: {
      "@type": "Organization",
      name: "Anamata Kāhui",
      url: "https://anamatakahui.co.nz",
    },
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href="/news"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to News
      </Link>

      <header className="mt-6 mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={KIND_VARIANTS[news.kind] ?? "outline"}>
            {KIND_LABELS[news.kind] ?? news.kind}
          </Badge>
          {news.published_at && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(news.published_at).toLocaleDateString("en-NZ", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
          {news.author_name && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {news.author_name}
            </span>
          )}
        </div>
        <h1 className="mt-3 text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {news.title}
        </h1>
        {news.summary && (
          <p className="mt-3 text-xl text-muted-foreground">
            {news.summary}
          </p>
        )}
      </header>

      {/* Hero — uses a different gradient per kind */}
      <div className="mb-8">
        <NewsHero
          kind={news.kind as "release" | "feature" | "milestone" | "partner" | "update"}
          title={news.title}
          summary={news.summary}
          authorName={news.author_name}
          publishedAt={news.published_at}
        />
      </div>

      {/* Body — already rendered + sanitised HTML */}
      <div
        className="prose prose-invert max-w-none
          prose-headings:font-display prose-headings:font-semibold
          prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
          prose-a:text-bronze-300 hover:prose-a:text-bronze-200
          prose-code:rounded prose-code:bg-muted prose-code:px-1.5
          prose-code:before:content-none prose-code:after:content-none
          prose-pre:border prose-pre:border-border
          prose-blockquote:border-l-bronze-300 prose-blockquote:text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: news.body_html ?? "" }}
      />

      {/* External link */}
      {news.external_url && (
        <Card className="mt-8">
          <CardContent className="p-4">
            <h2 className="mb-2 font-display text-lg">Read more</h2>
            <a
              href={news.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-bronze-300 hover:text-bronze-200 underline"
            >
              <ExternalLink className="h-3 w-3" />
              {news.external_url}
            </a>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {news.tags && news.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Tags:
          </span>
          {news.tags.map((tag: string) => (
            <Link key={tag} href={`/news/tag/${encodeURIComponent(tag)}`}>
              <Badge variant="outline" className="cursor-pointer text-xs">
                #{tag}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}