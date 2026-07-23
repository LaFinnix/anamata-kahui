import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Clock, ArrowRight } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const VALID_KINDS = ["note", "research", "data_drop"] as const;
const KIND_LABELS: Record<string, string> = {
  note: "Note",
  research: "Research",
  data_drop: "Data drop",
};

interface PageProps {
  params: Promise<{ kind: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kind, locale } = await params;
  if (!VALID_KINDS.includes(kind as (typeof VALID_KINDS)[number])) {
    return { title: "Not found" };
  }
  return {
    title: `${KIND_LABELS[kind] ?? kind} · Reads`,
    alternates: { canonical: `/${locale}/reads/kind/${kind}` },
  };
}

export default async function ReadKindFilterPage({ params }: PageProps) {
  const { kind } = await params;
  if (!VALID_KINDS.includes(kind as (typeof VALID_KINDS)[number])) {
    notFound();
  }

  const admin = createAdminClient();
  const { data: reads } = await admin
    .from("reads_public")
    .select("id, slug, kind, title, subtitle, published_at, reading_time_minutes, tags, author_name")
    .eq("kind", kind)
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

      <Badge variant="outline" className="mt-6 mb-4">
        Filter · {KIND_LABELS[kind]}
      </Badge>
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {KIND_LABELS[kind]}s
      </h1>
      <p className="mt-2 text-muted-foreground">
        {kind === "note" && "Mid-length analysis (1,500-3,000 words)."}
        {kind === "research" && "Multi-week research projects with original data (3,000-8,000 words)."}
        {kind === "data_drop" && "Quick-turnaround analysis tied to a downloadable dataset (500-1,500 words)."}
      </p>

      <div className="mt-10 space-y-6">
        {!reads || reads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No {KIND_LABELS[kind].toLowerCase()}s published yet.
            </CardContent>
          </Card>
        ) : (
          reads.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
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