import { redirect } from "next/navigation";
import Link from "next/link";
import { Newspaper, Calendar, ArrowRight } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";
import { CreateNewsForm } from "@/components/admin/create-news-form";
import { NewsAdminRow } from "@/components/admin/news-admin-row";

export const metadata = {
  title: "News · Admin",
  description:
    "Authoring tool for short-form news entries — announcements, milestones, releases, features, partner updates.",
};

export const revalidate = 30;

/**
 * /admin/news — authoring dashboard for news entries.
 *
 * Lists all news (own + super-admin-visible) bucketed by status.
 * Same pattern as /admin/reads. Authors can edit their own drafts.
 */
export default async function NewsAdminPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isSuperAdmin = profile?.role === "super_admin";

  let query = supabase
    .from("news")
    .select("id, slug, kind, title, summary, status, published_at, updated_at, tags, author_id")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (!isSuperAdmin) {
    query = query.or(`author_id.eq.${user.id},status.eq.draft`);
  }

  const { data: items } = await query;

  const buckets = {
    draft: items?.filter((n) => n.status === "draft") ?? [],
    in_review: items?.filter((n) => n.status === "in_review") ?? [],
    published: items?.filter((n) => n.status === "published") ?? [],
    archived: items?.filter((n) => n.status === "archived") ?? [],
  };

  return (
    <div className="space-y-8">
      <ActiveContextBanner />

      <div>
        <Badge variant="outline" className="mb-4">Admin · News</Badge>
        <h1 className="text-3xl font-display font-semibold tracking-tight">
          News
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Short-form updates. Five kinds: release, feature, milestone,
          partner, update. Not a blog — time-sensitive content with SEO
          metadata + RSS syndication.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Newspaper className="h-4 w-4 text-bronze-300" />
            New entry
          </CardTitle>
          <CardDescription>
            Drafts are private until published. The summary shows on
            the news index; the body is the article.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateNewsForm />
        </CardContent>
      </Card>

      <BucketSection
        title="Drafts"
        status="draft"
        items={buckets.draft}
        canEdit
      />
      <BucketSection
        title="In review"
        status="in_review"
        items={buckets.in_review}
        canEdit
      />
      <BucketSection
        title="Published"
        status="published"
        items={buckets.published}
        canEdit={isSuperAdmin}
      />
      {isSuperAdmin && (
        <BucketSection
          title="Archived"
          status="archived"
          items={buckets.archived}
          canEdit
        />
      )}
    </div>
  );
}

function BucketSection({
  title,
  status,
  items,
  canEdit,
}: {
  title: string;
  status: string;
  items: Array<{
    id: string;
    slug: string;
    kind: string;
    title: string;
    summary: string | null;
    status: string;
    published_at: string | null;
    updated_at: string;
    tags: string[];
    author_id: string;
  }>;
  canEdit: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 font-display text-2xl">
        {title} <span className="text-muted-foreground">({items.length})</span>
      </h2>
      <div className="space-y-2">
        {items.map((n) => (
          <NewsAdminRow
            key={n.id}
            id={n.id}
            slug={n.slug}
            kind={n.kind}
            title={n.title}
            summary={n.summary}
            status={n.status}
            publishedAt={n.published_at}
            updatedAt={n.updated_at}
            tags={n.tags}
            canEdit={canEdit}
          />
        ))}
      </div>
    </section>
  );
}