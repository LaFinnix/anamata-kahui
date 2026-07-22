import Link from "next/link";
import { Shield, ExternalLink, Calendar } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateIwiGateForm } from "@/components/music/create-iwi-gate-form";

export const metadata = { title: "Iwi gates" };
export const revalidate = 0; // always fresh for kaitiaki

/**
 * Kaitiaki / admin view of every iwi gate on the platform.
 *
 * Access: requires role in (kaitiaki, branch_admin, super_admin) per the
 * iwi_gates RLS policy. The dashboard layout already gates this route
 * group; if the user lands here without kaitiaki permission the query
 * returns empty.
 */
export default async function IwiGatesAdminPage() {
  const supabase = await createServerSupabase();
  const { data: gates } = await supabase
    .from("iwi_gates")
    .select(
      "id, iwi_name, hapu_name, scope, applies_to_kind, applies_to_id, granted_at, expires_at, revoked_at, notes",
    )
    .order("iwi_name");

  // Fetch linked release titles for context
  const releaseIds = (gates ?? [])
    .map((g) => g.applies_to_id)
    .filter((id): id is string => id !== null);

  const { data: releases } = releaseIds.length
    ? await supabase.from("releases").select("id, title").in("id", releaseIds)
    : { data: [] };

  const releaseTitleById = Object.fromEntries(
    (releases ?? []).map((r) => [r.id, r.title]),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">
            Iwi gates
          </h1>
          <p className="mt-1 text-muted-foreground">
            Every cultural-authority gate on the platform. Use these to
            track consent decisions, expiry, and iwi contact.
          </p>
        </div>
        <CreateIwiGateForm />
      </div>

      {(!gates || gates.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground italic">
            No gates visible. Either no gates exist, or your role doesn't
            have access to the visible ones.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {gates.map((g) => (
            <Card key={g.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-bronze-300" />
                      <CardTitle className="text-lg">{g.iwi_name}</CardTitle>
                      {g.hapu_name && (
                        <span className="text-sm text-muted-foreground">/ {g.hapu_name}</span>
                      )}
                      <Badge
                        variant={
                          g.scope === "restricted"
                            ? "destructive"
                            : g.scope === "iwi_only" || g.scope === "hapu_only"
                              ? "outline"
                              : "secondary"
                        }
                        className="capitalize"
                      >
                        {g.scope.replace("_", " ")}
                      </Badge>
                      {g.revoked_at && (
                        <Badge variant="destructive">Revoked</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      Applies to: <span className="capitalize">{g.applies_to_kind}</span>
                      {g.applies_to_id && (
                        <>
                          {" · "}
                          {releaseTitleById[g.applies_to_id] ?? g.applies_to_id.slice(0, 8)}
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/admin/iwi-gate/${g.id}`}>
                      Manage <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {g.notes && <p className="text-sm text-muted-foreground">{g.notes}</p>}
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Granted{" "}
                    {new Date(g.granted_at).toLocaleDateString("en-NZ", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {g.expires_at && (
                    <span>
                      Expires{" "}
                      {new Date(g.expires_at).toLocaleDateString("en-NZ")}
                    </span>
                  )}
                  {g.revoked_at && (
                    <span>
                      Revoked{" "}
                      {new Date(g.revoked_at).toLocaleDateString("en-NZ")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
