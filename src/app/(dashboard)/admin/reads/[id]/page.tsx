import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";
import { EditReadForm } from "@/components/admin/edit-read-form";

export const dynamic = "force-dynamic";

/**
 * /admin/reads/[id] — edit a read.
 *
 * Authors can edit drafts. Super admins can edit anything.
 * Published reads are immutable to authors.
 */
export default async function ReadEditPage({
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

  const { data: read } = await supabase
    .from("reads")
    .select("id, slug, kind, title, subtitle, body_md, status, tags, meta_description, author_id")
    .eq("id", id)
    .single();

  if (!read) notFound();

  const isOwner = read.author_id === user.id;
  if (!isOwner && !isSuperAdmin) {
    redirect("/admin/reads");
  }

  const isImmutable = read.status === "published" && !isSuperAdmin;

  return (
    <div className="space-y-8">
      <ActiveContextBanner />

      <div>
        <Link
          href="/admin/reads"
          className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Reads
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{read.kind}</Badge>
          <Badge variant="secondary">{read.status}</Badge>
          {isImmutable && (
            <Badge variant="destructive">Immutable (published)</Badge>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-display font-semibold tracking-tight">
          {read.title}
        </h1>
        <code className="mt-1 block font-mono text-xs text-muted-foreground">
          /reads/{read.slug}
        </code>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit content</CardTitle>
          <CardDescription>
            Markdown source. The body_html field is regenerated on every
            save. Published reads are immutable to authors; super admins
            can still edit for corrections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditReadForm
            id={read.id}
            slug={read.slug}
            initialTitle={read.title}
            initialSubtitle={read.subtitle ?? ""}
            initialBodyMd={read.body_md}
            initialTags={(read.tags ?? []).join(", ")}
            initialMetaDescription={read.meta_description ?? ""}
            disabled={isImmutable}
          />
        </CardContent>
      </Card>
    </div>
  );
}