import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Clock, CheckCircle2, XCircle, ArrowRight, AlertTriangle } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";

export const metadata = {
  title: "Cultural review · Admin",
  description:
    "Kaitiaki review queue — every release requires cultural sign-off before it can be scheduled or released.",
};

export const revalidate = 30; // refresh every 30s so reviewers see updates

/**
 * /admin/kaitiaki — cultural review dashboard.
 *
 * Audience: super_admin + kaitiaki (anyone with `profiles.role IN ('kaitiaki', 'super_admin')`).
 *
 * Shows releases that need cultural review:
 *   - **Pending** — `cultural_review_status = 'pending'`, awaiting kaitiaki decision
 *   - **Approved** — `cultural_review_status = 'approved'`, can move to scheduled/released
 *   - **Rejected** — `cultural_review_status = 'rejected'`, blocked from scheduling
 *
 * Each release links to its detail page where the kaitiaki records the
 * decision via culturalReviewAction.
 *
 * RLS: cultural_review_cycles reads are scoped to branch members +
 * super_admin. Writes require `profiles.role IN ('kaitiaki', 'super_admin')`.
 */
export default async function CulturalReviewDashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  if (role !== "kaitiaki" && role !== "super_admin") {
    // Not authorized — kaitiaki review is gated
    return (
      <div className="space-y-8">
        <ActiveContextBanner />
        <Card>
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>
              Cultural review requires the <code>kaitiaki</code> or{" "}
              <code>super_admin</code> role. Your account is{" "}
              <Badge variant="outline">{role ?? "no role assigned"}</Badge>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you should have access, contact a super admin. Audit trail
              of who can perform cultural reviews is recorded in{" "}
              <code>data_governance_log</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch all releases with their cultural review state.
  // Service-role reads the full table; RLS would only show branch-scoped
  // for branch_admin (which we deliberately bypass here for kaitiaki review
  // across all branches).
  const { data: releases, error: releasesErr } = await supabase
    .from("releases")
    .select(
      "id, title, status, cultural_review_status, iwi_consent_id, branch_id, metadata, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (releasesErr) {
    return (
      <div className="space-y-8">
        <ActiveContextBanner />
        <Card>
          <CardHeader>
            <CardTitle>Could not load releases</CardTitle>
            <CardDescription>{releasesErr.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Group by review state
  const buckets = {
    pending: (releases ?? []).filter((r) => r.cultural_review_status === "pending"),
    approved: (releases ?? []).filter((r) => r.cultural_review_status === "approved"),
    rejected: (releases ?? []).filter((r) => r.cultural_review_status === "rejected"),
  };

  // Fetch latest cultural_review_cycle for each release to show most-recent decision
  const { data: recentCycles } = await supabase
    .from("cultural_review_cycles")
    .select("id, release_id, decision, kaitiaki_id, notes, decided_at")
    .order("decided_at", { ascending: false })
    .limit(20);

  const lastDecisionByRelease = new Map<
    string,
    {
      id: string;
      release_id: string;
      decision: "approved" | "rejected" | "pending";
      kaitiaki_id: string;
      notes: string | null;
      decided_at: string;
    }
  >();
  for (const c of recentCycles ?? []) {
    if (!lastDecisionByRelease.has(c.release_id)) {
      lastDecisionByRelease.set(c.release_id, c);
    }
  }

  return (
    <div className="space-y-8">
      <ActiveContextBanner />

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Admin · Kaitiaki</Badge>
            <Badge variant="secondary" className="text-xs">
              {role === "super_admin" ? "Super admin" : "Kaitiaki"}
            </Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">
            Cultural review queue
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Every release requires kaitiaki sign-off before it can be
            scheduled or released. Decisions are append-only — once
            recorded, a decision is part of the audit trail and cannot be
            edited.
          </p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending review"
          value={buckets.pending.length}
          icon={Clock}
          tone="warning"
          hint="Awaiting a kaitiaki decision"
        />
        <StatCard
          label="Approved"
          value={buckets.approved.length}
          icon={CheckCircle2}
          tone="success"
          hint="Cleared to schedule / release"
        />
        <StatCard
          label="Rejected"
          value={buckets.rejected.length}
          icon={XCircle}
          tone="destructive"
          hint="Blocked from scheduling"
        />
      </div>

      {/* Pending queue */}
      <section>
        <h2 className="mb-3 font-display text-2xl">
          Awaiting your review ({buckets.pending.length})
        </h2>
        {buckets.pending.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No releases are waiting for review. The cultural-review
              queue is clear.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {buckets.pending.map((r) => {
              const lastDecision = lastDecisionByRelease.get(r.id);
              return (
                <Card key={r.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {r.status}
                        </Badge>
                        <Badge variant="secondary">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending review
                        </Badge>
                      </div>
                      <h3 className="mt-2 truncate font-display text-lg">
                        {r.title}
                      </h3>
                      {lastDecision && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last decision:{" "}
                          <span className="capitalize">{lastDecision.decision}</span>
                          {" · "}
                          {new Date(lastDecision.decided_at).toLocaleString(
                            "en-NZ",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      )}
                    </div>
                    <Button asChild>
                      <Link href={`/admin/kaitiaki/${r.id}`}>
                        Review <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Approved */}
      <section>
        <h2 className="mb-3 font-display text-2xl">
          Approved ({buckets.approved.length})
        </h2>
        {buckets.approved.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No approved releases yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {buckets.approved.map((r) => (
              <CompactRow
                key={r.id}
                title={r.title}
                status={r.status}
                decision="approved"
                href={`/admin/kaitiaki/${r.id}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Rejected */}
      <section>
        <h2 className="mb-3 font-display text-2xl">
          Rejected ({buckets.rejected.length})
        </h2>
        {buckets.rejected.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No rejected releases.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {buckets.rejected.map((r) => (
              <CompactRow
                key={r.id}
                title={r.title}
                status={r.status}
                decision="rejected"
                href={`/admin/kaitiaki/${r.id}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Methodology footer */}
      <section className="rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-6 text-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-bronze-300" />
          <div>
            <h3 className="font-display text-base">How review decisions work</h3>
            <p className="mt-1 text-muted-foreground">
              A release can only be moved to <code>scheduled</code> or{" "}
              <code>released</code> when its{" "}
              <code>cultural_review_status</code> is{" "}
              <code>approved</code>. The check is enforced at the database
              layer — even direct SQL updates can't bypass it. Review
              decisions are recorded in <code>cultural_review_cycles</code>{" "}
              with append-only semantics: a decision can't be edited, only
              superseded by a new cycle.
            </p>
            <p className="mt-2 text-muted-foreground">
              Historical data: some releases may show{" "}
              <code>cultural_review_status = 'pending'</code> with{" "}
              <code>status = 'released'</code>. This reflects records seeded
              before the gating trigger was installed in migration 0010.
              They can be brought into compliance by recording a
              back-dated review cycle.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "warning" | "success" | "destructive";
  hint: string;
}) {
  const toneClass =
    tone === "warning"
      ? "border-yellow-500/30 bg-yellow-500/5"
      : tone === "success"
        ? "border-pounamu-500/30 bg-pounamu-500/5"
        : "border-destructive/30 bg-destructive/5";
  const iconClass =
    tone === "warning"
      ? "text-yellow-300"
      : tone === "success"
        ? "text-pounamu-300"
        : "text-destructive";
  return (
    <Card className={toneClass}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Icon className={`h-3 w-3 ${iconClass}`} />
          {label}
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function CompactRow({
  title,
  status,
  decision,
  href,
}: {
  title: string;
  status: string;
  decision: "approved" | "rejected";
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/50 p-3 text-sm hover:bg-muted/30"
    >
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="capitalize">
          {status}
        </Badge>
        {decision === "approved" ? (
          <Badge variant="secondary" className="gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3 text-pounamu-300" />
            Approved
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />
            Rejected
          </Badge>
        )}
      </div>
      <span className="truncate flex-1">{title}</span>
      <ArrowRight className="h-3 w-3 opacity-60" />
    </Link>
  );
}