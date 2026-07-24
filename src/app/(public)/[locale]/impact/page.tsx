import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Globe2, Mic, Languages, FileCheck2, CheckCircle2, BookOpen } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";

export const metadata = {
  title: "Impact",
  description:
    "Outcomes dashboard for Anamata Kāhui — cultural, governance, and industry metrics. Real numbers from our Supabase tables, not fabricated.",
};
export const revalidate = 300; // 5-minute refresh

/**
 * Public outcomes dashboard — live data from Supabase.
 *
 * Per audit §2.2 — fixes the #1 weakness of the 2026 winning Creative NZ
 * application ("no evaluation metrics"). Numbers come straight from the
 * database so funders see real evidence.
 */
export default async function ImpactPage() {
  const admin = createAdminClient();

  // Parallel count queries — every metric is grounded in a real row.
  const [
    releasedResult,
    releasedWithConsentResult,
    iwiGatesResult,
    consentLogResult,
    governanceLogResult,
    fieldProjectsResult,
    scholarshipResult,
    lcLabelsResult,
    fundingResult,
    splitParticipantsResult,
  ] = await Promise.all([
    admin.from("releases").select("id", { count: "exact", head: true }).eq("status", "released"),
    admin
      .from("releases")
      .select("id", { count: "exact", head: true })
      .eq("status", "released")
      .not("iwi_consent_id", "is", null),
    // NB: iwi_gates has no `status` column. "Active" is implicit:
    // a gate is active when it has not been revoked AND it has not
    // passed its expiry (expires_at is nullable for never-expiring gates).
    // The previous .eq("status", "active") filter was a silent no-op
    // because the column doesn't exist.
    admin
      .from("iwi_gates")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null)
      .or("expires_at.is.null,expires_at.gt.now()"),
    admin.from("consent_log").select("id", { count: "exact", head: true }),
    admin.from("data_governance_log").select("id", { count: "exact", head: true }).eq("published", true),
    admin.from("research_field_projects").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("scholarship_engagements").select("id", { count: "exact", head: true }),
    admin.from("lc_label_links").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("funding_applications").select("status, amount_awarded_nzd, funder_name").eq("is_public", true),
    admin.from("split_participants").select("id", { count: "exact", head: true }),
  ]);

  const released = releasedResult.count ?? 0;
  const releasedWithConsent = releasedWithConsentResult.count ?? 0;
  const iwiGates = iwiGatesResult.count ?? 0;
  const consentLog = consentLogResult.count ?? 0;
  const governanceLog = governanceLogResult.count ?? 0;
  const fieldProjects = fieldProjectsResult.count ?? 0;
  const scholarship = scholarshipResult.count ?? 0;
  const lcLabels = lcLabelsResult.count ?? 0;
  const splitParticipants = splitParticipantsResult.count ?? 0;

  // Aggregate funding posture from public rows
  const fundingRows = fundingResult.data ?? [];
  const fundingCounts = {
    planned: fundingRows.filter((r) => r.status === "planned").length,
    pending: fundingRows.filter((r) => r.status === "pending").length,
    awarded: fundingRows.filter((r) => r.status === "awarded").length,
    declined: fundingRows.filter((r) => r.status === "declined").length,
  };
  const totalAwardedNzd = fundingRows
    .filter((r) => r.status === "awarded" && r.amount_awarded_nzd !== null)
    .reduce((sum, r) => sum + (r.amount_awarded_nzd ?? 0), 0);

  // Reach metrics require external ingestion (Spotify/Apple). Surfaced as
  // honest dashes until the pipeline lands — funders prefer "—" over
  // fabricated numbers.
  const reachUnavailable = true;

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline">Live · public outcomes</Badge>
        <Badge variant="secondary" className="text-xs font-normal">
          Refreshed {new Date().toLocaleString("en-NZ", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })} (NZST) — re-runs every 5 min
        </Badge>
      </div>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Impact
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Outcomes, not output counts. We track what's changed for communities,
        not just what we shipped.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Reach</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Streams (lifetime)"
            value={reachUnavailable ? "—" : "0"}
            icon={TrendingUp}
            sublabel="Awaiting Spotify + Apple ingestion"
          />
          <Metric
            label="Audience size"
            value={reachUnavailable ? "—" : "0"}
            icon={Users}
            sublabel="Top-10 countries, weighted by listen-time"
          />
          <Metric
            label="Top markets"
            value={reachUnavailable ? "—" : "—"}
            icon={Globe2}
            sublabel="Awaiting Spotify + Apple ingestion"
          />
          <Metric
            label="Active listeners / 30d"
            value={reachUnavailable ? "—" : "0"}
            icon={TrendingUp}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Cultural</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Released waiata"
            value={String(released)}
            icon={FileCheck2}
            variant="success"
            sublabel={`${released} of catalog publicly available`}
          />
          <Metric
            label="Released with iwi consent"
            value={String(releasedWithConsent)}
            icon={CheckCircle2}
            variant="success"
            sublabel={
              released > 0
                ? `${Math.round((releasedWithConsent / released) * 100)}% of released waiata`
                : "No released waiata yet"
            }
          />
          <Metric
            label="Active iwi gates"
            value={String(iwiGates)}
            icon={FileCheck2}
            sublabel="Per-iwi cultural authority"
          />
          <Metric
            label="Local Contexts labels"
            value={String(lcLabels)}
            icon={Languages}
            variant="success"
            sublabel="TK · BC · Notice badges applied"
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Governance</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Consent log entries"
            value={String(consentLog)}
            icon={FileCheck2}
            variant="success"
            sublabel="Append-only audit trail"
          />
          <Metric
            label="Governance entries"
            value={String(governanceLog)}
            icon={FileCheck2}
            sublabel="Public changelog of decisions"
          />
          <Metric
            label="Active field projects"
            value={String(fieldProjects)}
            icon={BookOpen}
            sublabel="Live research engagements"
          />
          <Metric
            label="Scholarship engagements"
            value={String(scholarship)}
            icon={Users}
            sublabel="Industry portfolio engagements"
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Industry</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Cross-branch collaborators"
            value={String(splitParticipants)}
            icon={Users}
            sublabel="Distinct collaborator entries on splits"
          />
          <Metric
            label="Funding applications"
            value={String(fundingCounts.planned + fundingCounts.pending + fundingCounts.awarded + fundingCounts.declined)}
            icon={TrendingUp}
            sublabel={`${fundingCounts.planned} planned · ${fundingCounts.pending} pending · ${fundingCounts.awarded} awarded`}
          />
          <Metric
            label="Awarded (NZD)"
            value={totalAwardedNzd > 0 ? `$${totalAwardedNzd.toLocaleString("en-NZ")}` : "—"}
            icon={TrendingUp}
            variant={totalAwardedNzd > 0 ? "success" : undefined}
            sublabel="Across all branches"
          />
          <Metric
            label="Public performances"
            value="—"
            icon={Mic}
            sublabel="Awaiting performance tracking"
          />
        </div>
      </section>

      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Methodology</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Every number above is pulled live from Supabase via{" "}
          <code>createAdminClient()</code>. No special "impact narrative" —
          what you see is what the database says. When you see{" "}
          <code>{released}</code> released waiata, that's {released} rows in{" "}
          <code>public.releases</code> with <code>status = 'released'</code>.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Reach metrics shown as <code>—</code> are pending external data
          ingestion. We surface them honestly rather than fabricate. The
          funding posture section reads from{" "}
          <code>public.funding_applications</code> where funders are
          anonymised and only public rows (the default) appear here.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          This page is regenerated every 5 minutes.{" "}
          <a
            href="/press"
            className="text-bronze-300 hover:text-bronze-200 underline"
          >
            Download a PDF Funder Pack with the same data
          </a>
          .
        </p>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  sublabel,
  variant,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  sublabel?: string;
  variant?: "success";
}) {
  return (
    <Card
      className={
        variant === "success"
          ? "border-pounamu-500/30 bg-pounamu-500/5"
          : undefined
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="font-display text-3xl">{value}</CardTitle>
        {sublabel && (
          <CardDescription className="mt-1 text-xs">{sublabel}</CardDescription>
        )}
      </CardContent>
    </Card>
  );
}