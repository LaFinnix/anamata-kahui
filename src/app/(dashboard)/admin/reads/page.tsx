import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Clock, ArrowRight } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";
import { CreateReadForm } from "@/components/admin/create-read-form";
import { ReadAdminRow } from "@/components/admin/read-admin-row";

export const metadata = {
  title: "Reads · Admin",
  description: "Authoring tool for long-form research notes, research pieces, and data drops.",
};

export const revalidate = 30;

/**
 * /admin/reads — authoring dashboard for the reads system.
 *
 * Lists all reads (drafts, in_review, published, archived) and lets
 * the current user create a new draft. Authors can edit their own
 * drafts. Super admins can edit any read.
 */
export default async function ReadsAdminPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isSuperAdmin = profile?.role === "super_admin";

  // Authors see their own + published; super admin sees everything.
  let query = supabase
    .from("reads")
    .select("id, slug, kind, title, status, published_at, updated_at, reading_time_minutes, tags, author_id")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (!isSuperAdmin) {
    // RLS will filter to author's own + published; explicit filter
    // narrows further to user's own drafts (we don't need to list
    // everyone's published reads on this page)
    query = query.or(`author_id.eq.${user.id},status.eq.draft`);
  }

  const { data: reads } = await query;

  // Bucket by status
  const buckets = {
    draft: reads?.filter((r) => r.status === "draft") ?? [],
    in_review: reads?.filter((r) => r.status === "in_review") ?? [],
    published: reads?.filter((r) => r.status === "published") ?? [],
    archived: reads?.filter((r) => r.status === "archived") ?? [],
  };

  return (
    <div className="space-y-8">
      <ActiveContextBanner />

      <div>
        <Badge variant="outline" className="mb-4">Admin · Reads</Badge>
        <h1 className="text-3xl font-display font-semibold tracking-tight">
          Reads
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Authoring tool for long-form research notes, research pieces,
          and data drops. Not a blog — research-grade content with
          citable methodology and downloadable datasets.
        </p>
      </div>

      {/* Create new */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-bronze-300" />
            New read
          </CardTitle>
          <CardDescription>
            Drafts are private until published. Choose the content type:
            note (mid-length analysis), research (multi-week project),
            or data_drop (analysis + downloadable dataset).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateReadForm />
        </CardContent>
      </Card>

      {/* Bucket lists */}
      <BucketSection
        title="Drafts"
        status="draft"
        reads={buckets.draft}
        canEdit
      />
      <BucketSection
        title="In review"
        status="in_review"
        reads={buckets.in_review}
        canEdit
      />
      <BucketSection
        title="Published"
        status="published"
        reads={buckets.published}
        canEdit={isSuperAdmin}
      />
      {isSuperAdmin && (
        <BucketSection
          title="Archived"
          status="archived"
          reads={buckets.archived}
          canEdit
        />
      )}
    </div>
  );
}

function BucketSection({
  title,
  status,
  reads,
  canEdit,
}: {
  title: string;
  status: string;
  reads: Array<{
    id: string;
    slug: string;
    kind: string;
    title: string;
    status: string;
    published_at: string | null;
    updated_at: string;
    reading_time_minutes: number | null;
    tags: string[];
    author_id: string;
  }>;
  canEdit: boolean;
}) {
  if (reads.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 font-display text-2xl">
        {title} <span className="text-muted-foreground">({reads.length})</span>
      </h2>
      <div className="space-y-2">
        {reads.map((r) => (
          <ReadAdminRow
            key={r.id}
            id={r.id}
            slug={r.slug}
            kind={r.kind}
            title={r.title}
            status={r.status}
            publishedAt={r.published_at}
            updatedAt={r.updated_at}
            readingTime={r.reading_time_minutes ?? 0}
            tags={r.tags}
            canEdit={canEdit}
          />
        ))}
      </div>
    </section>
  );
}