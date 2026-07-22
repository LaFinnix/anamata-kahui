import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Hash, Music, Upload } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Release" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReleaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: release, error } = await supabase
    .from("releases")
    .select(
      "id, title, description, release_date, upc_isrc, cover_art_url, status, metadata, created_at, updated_at, artist_id, branch_id",
    )
    .eq("id", id)
    .single();

  if (error || !release) {
    notFound();
  }

  const { data: stems } = await supabase
    .from("stems")
    .select("id, file_name, mime_type, size_bytes, created_at")
    .eq("release_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/releases">
            <ArrowLeft className="h-4 w-4" />
            Back to pipeline
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-semibold tracking-tight">
              {release.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {release.release_date && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(release.release_date).toLocaleDateString("en-NZ", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
              {release.upc_isrc && (
                <span className="inline-flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  {release.upc_isrc}
                </span>
              )}
            </div>
          </div>
          <Badge variant={release.status === "released" ? "success" : "outline"} className="capitalize">
            {release.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About this release</CardTitle>
              {release.description && (
                <CardDescription>{release.description}</CardDescription>
              )}
            </CardHeader>
            {!release.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground italic">
                  No description yet — add one to give reviewers and distributors context.
                </p>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Stems</CardTitle>
                <Button size="sm" variant="secondary">
                  <Upload className="h-4 w-4" />
                  Upload stem
                </Button>
              </div>
              <CardDescription>
                Audio stem vault. RLS scopes reads to branch members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!stems || stems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No stems uploaded yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {stems.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="truncate">{s.file_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.size_bytes
                          ? `${(Number(s.size_bytes) / 1024 / 1024).toFixed(1)} MB`
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Release ID" value={release.id} mono />
              <Row label="Artist ID" value={release.artist_id} mono />
              <Row label="Branch ID" value={release.branch_id} mono />
              <Row
                label="Created"
                value={new Date(release.created_at).toLocaleString("en-NZ")}
              />
              <Row
                label="Updated"
                value={new Date(release.updated_at).toLocaleString("en-NZ")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-bronze-300" />
                <CardTitle className="text-lg">Cultural review</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Per-release cultural metadata will surface here once the{" "}
                <code>iwi_gates</code> and <code>consent_log</code> tables ship
                in migration <code>0002_cultural_governance.sql</code>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all text-right" : "text-right"}>{value}</dd>
    </div>
  );
}
