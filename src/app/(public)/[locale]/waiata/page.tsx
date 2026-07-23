import Link from "next/link";
import { Music, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "waiata" });
  return {
    title: t("title"),
    description: t("lede").slice(0, 160),
  };
}

export default async function WaiataIndexPage() {
  // Service-role client — same RLS-safe read (released releases are public
  // anyway) but doesn't depend on request-time cookies.
  const admin = createAdminClient();
  const t = await getTranslations("waiata");
  const { data: releases } = await admin
    .from("releases")
    .select("title, metadata, iwi_consent_id, status")
    .eq("status", "released")
    .order("title");

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-12">
        <Badge variant="outline" className="mb-4">Released waiata</Badge>
        <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("lede")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(releases ?? []).map((r) => {
          const meta = (r.metadata ?? {}) as { slug?: string; english_gloss?: string };
          const slug = meta.slug;
          if (!slug) return null;
          return (
            <Card key={slug} className="group transition-colors hover:border-bronze-500/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-bronze-300" />
                  <Badge variant="success">Released</Badge>
                </div>
                <CardTitle className="text-xl">{r.title}</CardTitle>
                {meta.english_gloss && (
                  <CardDescription className="italic">{meta.english_gloss}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Link
                  href={`/waiata/${slug}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-bronze-300 hover:text-bronze-200"
                >
                  View cultural provenance <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!releases || releases.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground italic">
            No released waiata yet. Drafts and in-progress releases live in the
            catalog but are not surfaced publicly.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
