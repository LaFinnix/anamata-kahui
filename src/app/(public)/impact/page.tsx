import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Globe2, Mic, Languages, FileCheck2 } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";

export const metadata = { title: "Impact" };
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

  // Parallel count queries
  const [
    releasedResult,
    iwiGatesResult,
    consentLogResult,
    governanceLogResult,
  ] = await Promise.all([
    admin.from("releases").select("id", { count: "exact", head: true }).eq("status", "released"),
    admin.from("iwi_gates").select("id", { count: "exact", head: true }),
    admin.from("consent_log").select("id", { count: "exact", head: true }),
    admin.from("data_governance_log").select("id", { count: "exact", head: true }).eq("published", true),
  ]);

  const released = releasedResult.count ?? 0;
  const iwiGates = iwiGatesResult.count ?? 0;
  const consentLog = consentLogResult.count ?? 0;
  const governanceLog = governanceLogResult.count ?? 0;

  // Reach metrics require external ingestion (Spotify/Apple). Surfaced as
  // honest dashes until the pipeline lands — funders prefer "—" over
  // fabricated numbers.
  const reachUnavailable = true;

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Live · public outcomes</Badge>
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
            sublabel="NZ · AU · US · JP · CA"
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
            label="Active iwi gates"
            value={String(iwiGates)}
            icon={FileCheck2}
            sublabel="Per-iwi cultural authority"
          />
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
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Industry</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Industry advisor engagements" value="5" icon={Mic} />
          <Metric
            label="Sector affiliations"
            value="3"
            icon={Users}
            sublabel="MMIC · SoundCheck Aotearoa · APRA"
          />
          <Metric label="Public performances" value="—" icon={Mic} />
          <Metric
            label="Grants awarded"
            value="$10,000"
            icon={TrendingUp}
            variant="success"
            sublabel="Creative NZ 2026"
          />
        </div>
      </section>

      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Methodology</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Cultural + governance numbers are pulled live from Supabase. No
          special "impact narrative" — what you see is what the database
          says. When you see <code>{released}</code> released waiata, that's
          {released} rows in <code>public.releases</code> with{" "}
          <code>status = 'released'</code>.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Reach metrics shown as <code>—</code> are pending external data
          ingestion (Spotify Web API, Apple Music Reports). Infrastructure
          ships in migration 0004 (analytics ingestion tables).
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
  variant = "default",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  sublabel?: string;
  variant?: "default" | "success";
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon
          className={
            variant === "success"
              ? "h-4 w-4 text-pounamu-300"
              : "h-4 w-4 text-bronze-300"
          }
        />
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-semibold">{value}</div>
        {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}
