import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Clock, Calendar, User } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
}

const KIND_LABELS: Record<string, string> = {
  note: "Note",
  research: "Research",
  data_drop: "Data drop",
};

/** Pre-render published reads at build time. */
export async function generateStaticParams() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("reads_public")
    .select("slug")
    .eq("status", "published");
  return (data ?? []).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const admin = createAdminClient();
  const { data: read } = await admin
    .from("reads_public")
    .select("title, subtitle, meta_description, author_name, published_at, featured_image_url, kind")
    .eq("slug", slug)
    .maybeSingle();

  if (!read) {
    return { title: "Not found" };
  }

  const description = read.meta_description ?? read.subtitle ?? undefined;

  return {
    title: read.title,
    description,
    authors: read.author_name ? [{ name: read.author_name }] : undefined,
    alternates: {
      canonical: `/${locale}/reads/${slug}`,
      languages: {
        en: `/en/reads/${slug}`,
        mi: `/mi/reads/${slug}`,
      },
    },
    openGraph: {
      type: "article",
      title: read.title,
      description,
      images: read.featured_image_url ? [read.featured_image_url] : undefined,
      publishedTime: read.published_at ?? undefined,
      locale: locale === "mi" ? "mi_NZ" : "en_NZ",
    },
    twitter: {
      card: "summary_large_image",
      title: read.title,
      description,
      images: read.featured_image_url ? [read.featured_image_url] : undefined,
    },
  };
}

/**
 * /[locale]/reads/[slug] — full read detail page.
 *
 * Pre-rendered at build time via generateStaticParams. Article
 * body is already sanitised HTML (rendered at publish time via the
 * markdown pipeline + DOMPurify).
 */
export default async function ReadDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: read } = await admin
    .from("reads_public")
    .select("id, slug, kind, title, subtitle, body_html, published_at, reading_time_minutes, tags, author_name, author_email, author_role, data_attachments, citations")
    .eq("slug", slug)
    .maybeSingle();

  if (!read) notFound();

  // JSON-LD: Article schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: read.title,
    description: read.subtitle ?? undefined,
    datePublished: read.published_at ?? undefined,
    author: read.author_name
      ? { "@type": "Person", name: read.author_name }
      : undefined,
    keywords: read.tags?.join(", ") ?? undefined,
    publisher: {
      "@type": "Organization",
      name: "Anamata Kāhui",
      url: "https://anamatakahui.co.nz",
    },
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href="/reads"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Reads
      </Link>

      <header className="mt-6 mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{KIND_LABELS[read.kind]}</Badge>
          {read.published_at && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(read.published_at).toLocaleDateString("en-NZ", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {read.reading_time_minutes ?? "—"} min read
          </span>
          {read.author_name && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {read.author_name}
            </span>
          )}
        </div>
        <h1 className="mt-3 text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {read.title}
        </h1>
        {read.subtitle && (
          <p className="mt-3 text-xl text-muted-foreground">
            {read.subtitle}
          </p>
        )}
      </header>

      {/* Body — already rendered + sanitised HTML */}
      <div
        className="prose prose-invert max-w-none
          prose-headings:font-display prose-headings:font-semibold
          prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
          prose-a:text-bronze-300 hover:prose-a:text-bronze-200
          prose-code:rounded prose-code:bg-muted prose-code:px-1.5
          prose-code:before:content-none prose-code:after:content-none
          prose-pre:border prose-pre:border-border
          prose-blockquote:border-l-bronze-300 prose-blockquote:text-muted-foreground
          prose-img:rounded-md"
        dangerouslySetInnerHTML={{ __html: read.body_html ?? "" }}
      />

      {/* Tags */}
      {read.tags && read.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Tags:
          </span>
          {read.tags.map((tag: string) => (
            <Link key={tag} href={`/reads/tag/${encodeURIComponent(tag)}`}>
              <Badge variant="outline" className="cursor-pointer text-xs">
                #{tag}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Data attachments */}
      {Array.isArray(read.data_attachments) && read.data_attachments.length > 0 && (
        <Card className="mt-8">
          <CardContent className="p-4">
            <h2 className="mb-2 font-display text-lg">Datasets</h2>
            <ul className="space-y-1 text-sm">
              {read.data_attachments.map((att: { label: string; url: string; format?: string }, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {att.format ?? "file"}
                  </Badge>
                  <Link
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-bronze-300 hover:text-bronze-200 underline"
                  >
                    {att.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Citations */}
      {Array.isArray(read.citations) && read.citations.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <h2 className="mb-2 font-display text-lg">Citations</h2>
            <ol className="space-y-1 text-sm">
              {read.citations.map((c: string | { ref: string; note?: string }, i: number) => (
                <li key={i} className="text-muted-foreground">
                  <span className="font-mono text-xs">[{i + 1}]</span>{" "}
                  {typeof c === "string" ? c : `${c.ref}${c.note ? ` — ${c.note}` : ""}`}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}