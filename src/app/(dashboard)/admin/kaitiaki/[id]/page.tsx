import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Clock, CheckCircle2, XCircle, Calendar } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";
import { CulturalReviewForm } from "@/components/admin/cultural-review-form";

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * /admin/kaitiaki/[id] — release-level cultural review detail.
 *
 * Shows:
 *   - Release metadata (title, status, iwi gate, current review state)
 *   - Previous review cycles for this release (append-only history)
 *   - Form to record a new decision (kaitiaki / super_admin only)
 *
 * Authorization:
 *   - The form only renders for users with role kaitiaki or super_admin
 *   - Server action re-verifies role server-side
 */
export default async function CulturalReviewDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  const role = profile?.role;

  // Fetch release + cycles in parallel
  const [{ data: release }, { data: cycles }] = await Promise.all([
    supabase
      .from("releases")
      .select("id, title, status, cultural_review_status, iwi_consent_id, description, release_date, updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("cultural_review_cycles")
      .select("id, decision, notes, kaitiaki_id, decided_at")
      .eq("release_id", id)
      .order("decided_at", { ascending: false }),
  ]);

  if (!release) notFound();

  // Fetch iwi gate info (best-effort)
  let gate: { iwi_name: string; scope: string } | null = null;
  if (release.iwi_consent_id) {
    const { data: g } = await supabase
      .from("iwi_gates")
      .select("iwi_name, scope")
      .eq("id", release.iwi_consent_id)
      .maybeSingle();
    gate = g;
  }

  // Last cycle drives default-form state
  const lastCycle = (cycles ?? [])[0] ?? null;
  const canReview = role === "kaitiaki" || role === "super_admin";

  return (
    <div className="space-y-8">
      <ActiveContextBanner />

      <Link
        href="/admin/kaitiaki"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to cultural review queue
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {release.status}
            </Badge>
            {release.cultural_review_status === "approved" ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Approved
              </Badge>
            ) : release.cultural_review_status === "rejected" ? (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Rejected
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Pending review
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">
            {release.title}
          </h1>
          {gate && (
            <p className="mt-2 text-sm text-muted-foreground">
              Iwi gate:{" "}
              <span className="font-medium">{gate.iwi_name}</span>
              {gate.scope && (
                <>
                  {" · "}
                  <span className="text-xs uppercase tracking-wider">
                    {gate.scope}
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {release.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{release.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Review form */}
        <section className="lg:col-span-2">
          {canReview ? (
            <CulturalReviewForm
              releaseId={release.id}
              releaseTitle={release.title}
              lastDecision={lastCycle?.decision ?? null}
              parentCycleId={lastCycle?.id ?? null}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>View-only access</CardTitle>
                <CardDescription>
                  Your account is <Badge variant="outline">{role ?? "no role"}</Badge>.
                  Only kaitiaki and super admins can record review
                  decisions. Existing cycles below show the history.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </section>

        {/* Audit history */}
        <aside>
          <h2 className="mb-3 font-display text-lg">Review history</h2>
          {!cycles || cycles.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No reviews recorded yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {cycles.map((c) => (
                <Card key={c.id}>
                  <CardContent className="space-y-1 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      {c.decision === "approved" ? (
                        <CheckCircle2 className="h-4 w-4 text-pounamu-300" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-medium capitalize">{c.decision}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <Calendar className="mr-1 inline h-3 w-3" />
                      {new Date(c.decided_at).toLocaleString("en-NZ", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {c.notes && (
                      <p className="mt-1 text-xs">{c.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Methodology footer */}
      <section className="rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-4 text-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-bronze-300" />
          <p className="text-muted-foreground">
            Decisions are append-only. Once you record a decision, you
            can't edit it — only supersede it with a new cycle. This is
            enforced by the <code>deny_modification()</code> trigger on
            <code>cultural_review_cycles</code>.
          </p>
        </div>
      </section>
    </div>
  );
}