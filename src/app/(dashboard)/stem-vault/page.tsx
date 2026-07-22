import Link from "next/link";
import { HardDrive, Music, Lock, FileAudio } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Stem Vault · Music (Anamata Records)",
  description: "Audio stem storage for the Anamata Records branch. Private; gated on RLS.",
};

/**
 * /dashboard/stem-vault — central stem storage.
 *
 * Reads from the `stems` table. RLS scopes to branch membership + role.
 * The 'stems' Supabase Storage bucket is private with MIME restrictions
 * (audio/wav, audio/flac, audio/mpeg, audio/mp4, audio/aac).
 */
export default async function StemVaultPage() {
  const supabase = await createServerSupabase();
  const { data: stems } = await supabase
    .from("stems")
    .select("id, release_id, kind, instrument, storage_path, file_size_bytes, created_at, cultural_sensitivity")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Music (Anamata Records)</Badge>
            <Badge variant="secondary" className="text-xs">Sub-category</Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Stem Vault</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Centralised audio stem storage. Stems are private by default;
            access is gated on branch membership and role.
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Stems stored</CardDescription>
            <CardTitle className="text-3xl">{stems?.length ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Across all releases.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Storage used</CardDescription>
            <CardTitle className="text-3xl">
              {stems?.reduce((acc, s) => acc + (s.file_size_bytes ?? 0), 0)
                ? `${(stems.reduce((acc, s) => acc + (s.file_size_bytes ?? 0), 0) / 1_000_000).toFixed(1)} MB`
                : "0 MB"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Cumulative across all versions.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Cultural-sensitivity locks</CardDescription>
            <CardTitle className="text-3xl">
              {stems?.filter((s) => s.cultural_sensitivity !== "public").length ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Tied to iwi_gate scope.
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl">Recent stems</h2>
        {(!stems || stems.length === 0) ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground italic">
              <HardDrive className="mb-2 h-5 w-5 text-bronze-300" />
              No stems yet. Upload from a release page once a release exists.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {stems.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <FileAudio className="h-4 w-4 text-bronze-300" />
                    <div>
                      <div className="font-medium">
                        {s.kind ?? "stem"}{s.instrument ? ` · ${s.instrument}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(s.file_size_bytes ?? 0) > 0
                          ? `${(s.file_size_bytes! / 1_000_000).toFixed(1)} MB`
                          : "size unknown"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.cultural_sensitivity && s.cultural_sensitivity !== "public" && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Lock className="h-3 w-3" />
                        {s.cultural_sensitivity}
                      </Badge>
                    )}
                    {s.release_id && (
                      <Link
                        href={`/releases/${s.release_id}`}
                        className="text-xs text-bronze-300 hover:text-bronze-200"
                      >
                        View release →
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
