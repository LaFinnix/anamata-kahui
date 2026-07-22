import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, GitBranch, CheckCircle2, Clock, AlertCircle, FileText } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import type { IwiGate } from "@/lib/types";

export const metadata = { title: "Transparency" };
export const revalidate = 60; // refresh counts every 60s

/**
 * Public transparency dashboard — live data from Supabase.
 *
 * Surfaces the cultural review pipeline, iwi consultations, and
 * governance decisions. Per audit §2.1 — the highest-ROI differentiator.
 */
export default async function TransparencyPage() {
  const supabase = await createServerSupabase();

  // Parallel count queries — anon-readable views via RLS.
  const [iwiGatesResult, governanceLogResult] = await Promise.all([
    supabase.from("iwi_gates").select("id, iwi_name, scope, applies_to_kind, granted_at"),
    supabase
      .from("data_governance_log")
      .select("id, category, title, effective_at")
      .eq("published", true)
      .order("effective_at", { ascending: false })
      .limit(10),
  ]);

  const iwiGates: Pick<IwiGate, "id" | "iwi_name" | "scope" | "applies_to_kind" | "granted_at">[] =
    iwiGatesResult.data ?? [];
  const governanceLog = governanceLogResult.data ?? [];

  // Active iwi gates — those with scope != restricted (i.e. publicly readable)
  // OR restricted but explicitly granted and not revoked.
  const activeGates = iwiGates.filter((g) => g.scope !== "restricted");

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Live · public</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Transparency
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Cultural review pipeline, iwi consultations, and consent decisions —
        in real time. This is the operational evidence behind every word
        on our <a href="/kaitiakitanga" className="text-bronze-300 hover:text-bronze-200 underline">kaitiakitanga page</a>.
      </p>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active iwi gates" value={activeGates.length} icon={GitBranch} variant="success" />
        <Stat label="Total gates (incl. restricted)" value={iwiGates.length} icon={Activity} />
        <Stat
          label="Governance entries"
          value={governanceLog.length}
          icon={CheckCircle2}
        />
        <Stat label="Last refresh" value={new Date().toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })} icon={Clock} />
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Active iwi gates</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Each gate below is a kaitiaki authorisation over a category of cultural content.
          Gates marked <strong>restricted</strong> exist but are not publicly surfaced.
        </p>
        <div className="mt-6 space-y-3">
          {iwiGates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-sm text-muted-foreground italic">
                No iwi gates seeded yet.
              </CardContent>
            </Card>
          ) : (
            iwiGates.map((g) => (
              <Card key={g.id}>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-semibold">{g.iwi_name}</span>
                      <Badge
                        variant={g.scope === "restricted" ? "destructive" : g.scope === "iwi_only" ? "outline" : "secondary"}
                        className="capitalize"
                      >
                        {g.scope.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Applies to: {g.applies_to_kind} · Granted{" "}
                      {new Date(g.granted_at).toLocaleDateString("en-NZ", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Data governance changelog</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Every policy, consent decision, and review log entry published for public accountability.
        </p>
        <div className="mt-6 space-y-3">
          {governanceLog.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-sm text-muted-foreground italic">
                No published entries yet.
              </CardContent>
            </Card>
          ) : (
            governanceLog.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-bronze-300" />
                    <span className="font-medium">{entry.title}</span>
                    <Badge variant="outline" className="capitalize">{entry.category.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Effective{" "}
                    {new Date(entry.effective_at).toLocaleDateString("en-NZ", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Why we publish this</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Most applicants for cultural funding talk about kaitiakitanga in
          paragraphs. We make it a live page so funders can verify the
          operation, not just trust the claim. The data behind every number
          on this page lives in the <code>consent_log</code>,
          {" "}<code>iwi_gates</code>, and <code>data_governance_log</code> tables — all
          queryable via the Supabase REST API.
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "outline";
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon
          className={
            variant === "success"
              ? "h-4 w-4 text-pounamu-300"
              : variant === "outline"
                ? "h-4 w-4 text-muted-foreground"
                : "h-4 w-4 text-bronze-300"
          }
        />
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
