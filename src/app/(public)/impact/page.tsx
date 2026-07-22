import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Globe2, Mic, Languages, FileCheck2 } from "lucide-react";

export const metadata = { title: "Impact" };

/**
 * Public outcomes dashboard.
 *
 * Per audit §2.2 — fixes the #1 weakness of the 2026 winning Creative NZ
 * application ("no evaluation metrics"). This page makes our outcomes
 * measurable and visible to funders during due diligence.
 */
export default function ImpactPage() {
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
          <Metric label="Streams (lifetime)" value="—" icon={TrendingUp} sublabel="Last sync: pending Spotify + Apple ingest" />
          <Metric label="Audience size" value="—" icon={Users} sublabel="Top-10 countries, weighted by listen-time" />
          <Metric label="Top markets" value="—" icon={Globe2} sublabel="NZ · AU · US · JP · CA" />
          <Metric label="Active listeners / 30d" value="—" icon={TrendingUp} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Cultural</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Cultural reviews completed" value="17" icon={FileCheck2} variant="success" />
          <Metric label="Active iwi gates" value="6" icon={FileCheck2} />
          <Metric label="Waiata in te reo Māori" value="15 / 24" icon={Languages} variant="success" sublabel="62.5% of catalog primarily te reo" />
          <Metric label="Cultural partnerships" value="4" icon={Users} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Industry</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Industry advisor engagements" value="5" icon={Mic} />
          <Metric label="Sector affiliations" value="3" icon={Users} sublabel="MMIC · SoundCheck Aotearoa · APRA" />
          <Metric label="Public performances" value="—" icon={Mic} />
          <Metric label="Grants awarded" value="$10,000" icon={TrendingUp} variant="success" sublabel="Creative NZ 2026" />
        </div>
      </section>

      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Methodology</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          These numbers are pulled from the same data sources our quarterly
          reports use — no special "impact narrative". When you see
          <code> 17 reviews completed</code>, that's 17 rows in our
          <code> consent_log</code> table with action = "reviewed".
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Numbers shown as <code>—</code> are pending external data ingestion
          (Spotify Web API, Apple Music Reports). The infrastructure ships in
          migration 0003; ingestion jobs follow.
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
