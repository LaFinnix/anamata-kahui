import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";
import { EditNewsForm } from "@/components/admin/edit-news-form";

export const dynamic = "force-dynamic";

/**
 * /admin/news/[id] — edit a news entry.
 */
export default async function NewsEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isSuperAdmin = profile?.role === "super_admin";

  const { data: news } = await supabase
    .from("news")
    .select("id, slug, kind, title, summary, body_md, status, tags, meta_description, external_url, author_id")
    .eq("id", id)
    .single();

  if (!news) notFound();

  const isOwner = news.author_id === user.id;
  if (!isOwner && !isSuperAdmin) {
    redirect("/admin/news");
  }

  const isImmutable = news.status === "published" && !isSuperAdmin;

  return (
    <div className="space-y-8">
      <ActiveContextBanner />

      <div>
        <Link
          href="/admin/news"
          className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to News
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{news.kind}</Badge>
          <Badge variant="secondary">{news.status}</Badge>
          {isImmutable && (
            <Badge variant="destructive">Immutable (published)</Badge>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-display font-semibold tracking-tight">
          {news.title}
        </h1>
        <code className="mt-1 block font-mono text-xs text-muted-foreground">
          /news/{news.slug}
        </code>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit content</CardTitle>
          <CardDescription>
            Markdown source. The body_html field is regenerated on
            every save. Published news is immutable to authors; super
            admins can still edit for corrections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditNewsForm
            id={news.id}
            slug={news.slug}
            initialKind={news.kind}
            initialTitle={news.title}
            initialSummary={news.summary ?? ""}
            initialBodyMd={news.body_md}
            initialTags={(news.tags ?? []).join(", ")}
            initialMetaDescription={news.meta_description ?? ""}
            initialExternalUrl={news.external_url ?? ""}
            disabled={isImmutable}
          />
        </CardContent>
      </Card>
    </div>
  );
}