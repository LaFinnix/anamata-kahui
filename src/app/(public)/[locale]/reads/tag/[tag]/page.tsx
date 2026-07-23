import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Clock, ArrowRight } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ tag: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag, locale } = await params;
  return {
    title: `#${decodeURIComponent(tag)} · Reads`,
    alternates: { canonical: `/${locale}/reads/tag/${tag}` },
  };
}

export default async function ReadTagFilterPage({ params }: PageProps) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag);
  if (!tag || tag.length > 60) notFound();

  const admin = createAdminClient();
  const { data: reads } = await admin
    .from("reads_public")
    .select("id, slug, kind, title, subtitle, published_at, reading_time_minutes, tags, author_name")
    .contains("tags", [tag])
    .order("published_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href="/reads"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Reads
      </Link>

      <Badge variant="outline" className="mt-6 mb-4">Filter · Tag</Badge>
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        #{tag}
      </h1>
      <p className="mt-2 text-muted-foreground">
        All reads tagged <code className="font-mono">#{tag}</code>.
      </p>

      <div className="mt-10 space-y-6">
        {!reads || reads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No reads tagged{" "}
              <code className="font-mono">#{tag}</code> yet.
            </CardContent>
          </Card>
        ) : (
          reads.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{r.kind}</Badge>
                  {r.published_at && (
                    <span className="text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {new Date(r.published_at).toLocaleDateString("en-NZ")}
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
                  <Link href={`/reads/${r.slug}`} className="hover:text-bronze-200">
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
    </div>
  );
}