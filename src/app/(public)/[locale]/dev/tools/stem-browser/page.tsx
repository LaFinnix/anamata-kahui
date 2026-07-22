import Link from "next/link";
import { ArrowLeft, AudioLines, ExternalLink, FileAudio, Download } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Waiata stem browser · Dev tools",
  description:
    "Interactive tool — browse the released waiata catalogue and inspect stem files in storage.",
};

/**
 * /dev/tools/stem-browser
 *
 * Real, public tool: queries `releases` + `stems` tables for released
 * waiata with at least one stem. Renders links to the public storage
 * bucket for each stem.
 *
 * For tech-funding assessors: demonstrates that the platform's storage
 * layer is real, queryable, and serves actual audio files.
 */
export default async function StemBrowserPage() {
  const admin = createAdminClient();

  const { data: releases } = await admin
    .from("releases")
    .select("id, title, upc, isrc, stems(id, file_name, mime_type, size_bytes, bucket, created_at)")
    .eq("status", "released")
    .order("title");

  const totalStems = (releases ?? []).reduce(
    (sum, r) => sum + ((r.stems as unknown[]) ?? []).length,
    0,
  );
  const totalBytes = (releases ?? []).reduce((sum, r) => {
    return (
      sum +
      ((r.stems as Array<{ size_bytes?: number | null }>) ?? []).reduce(
        (s, stem) => s + (stem.size_bytes ?? 0),
        0,
      )
    );
  }, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href="/dev"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Dev & Tech
      </Link>

      <Badge variant="outline" className="mt-6 mb-4">
        Interactive tool · Music branch
      </Badge>
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Waiata stem browser
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Real query against the released waiata catalogue. Shows every
        stem file in the public <code className="font-mono text-xs">stems</code> storage
        bucket. Click a stem to open the public download URL.
      </p>

      <dl className="mt-8 grid grid-cols-3 gap-4 sm:max-w-2xl">
        <Stat label="Released waiata" value={String((releases ?? []).length)} />
        <Stat label="Stems on file" value={String(totalStems)} />
        <Stat
          label="Total bytes"
          value={
            totalBytes > 0
              ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
              : "—"
          }
        />
      </dl>

      <div className="mt-10 space-y-6">
        {((releases ?? []).length === 0) && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No released waiata yet. Once releases are created with
              stems attached, they will appear here.
            </CardContent>
          </Card>
        )}
        {(releases ?? []).map((release) => {
          const stems = (release.stems ?? []) as Array<{
            id: string;
            file_name: string | null;
            mime_type: string | null;
            size_bytes: number | null;
            bucket: string | null;
            created_at?: string | null;
          }>;
          return (
            <Card key={release.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AudioLines className="h-5 w-5 text-bronze-300" />
                  <CardTitle className="text-xl">{release.title}</CardTitle>
                </div>
                <CardDescription>
                  {release.upc && (
                    <span className="font-mono text-xs">
                      UPC {release.upc}
                    </span>
                  )}
                  {release.upc && release.isrc && " · "}
                  {release.isrc && (
                    <span className="font-mono text-xs">
                      ISRC {release.isrc}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stems.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">
                    No stems uploaded for this release yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {stems.map((stem) => {
                      const url =
                        stem.bucket && stem.file_name
                          ? `https://fydhhyakfkceupibqnps.supabase.co/storage/v1/object/public/${stem.bucket}/${stem.file_name}`
                          : null;
                      return (
                        <li
                          key={stem.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileAudio className="h-4 w-4 shrink-0 text-bronze-300" />
                            <div className="min-w-0">
                              <p className="truncate font-mono text-xs">
                                {stem.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {stem.mime_type ?? "unknown"}
                                {stem.size_bytes !== null && (
                                  <>
                                    {" · "}
                                    {(stem.size_bytes / (1024 * 1024)).toFixed(
                                      2,
                                    )}{" "}
                                    MB
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex shrink-0 items-center gap-1 text-xs text-bronze-300 hover:text-bronze-200"
                            >
                              <Download className="h-3 w-3" />
                              Open
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="font-display text-2xl">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}