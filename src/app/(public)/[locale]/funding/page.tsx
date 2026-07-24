import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle2, Clock } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";

export const metadata = { title: "Funding" };
export const revalidate = 300; // 5-minute refresh

/**
 * Public funding transparency — funder signal.
 *
 * Per audit §2.14. Every grant received, applied for, and pending is
 * surfaced here. Auto-populated from `funding_applications` where
 * `is_public = true`. The year is derived from `decision_date` (or
 * `submitted_date` if no decision yet) so it always reflects the live
 * data, not a hand-typed string.
 */

interface GrantRow {
  id: string;
  funder_name: string;
  round: string | null;
  status: "planned" | "pending" | "awarded" | "declined";
  amount_requested_nzd: number | null;
  amount_awarded_nzd: number | null;
  submitted_date: string | null;
  decision_date: string | null;
  title: string | null;
  public_summary: string | null;
  artist_roster_id: string | null;
  /** When artist_roster_id is set, the artist name for display. */
  artist_name: string | null;
}

interface DisplayGrant {
  year: string;
  round: string;
  funder: string;
  amount: string;
  status: string;
  programme: string;
  summary: string;
  artist_name: string | null;
}

function deriveYear(g: GrantRow): string {
  const d = g.decision_date ?? g.submitted_date;
  if (!d) return "—";
  return d.slice(0, 4);
}

function formatAmount(g: GrantRow): string {
  const n = g.amount_awarded_nzd ?? g.amount_requested_nzd;
  if (n === null) return "—";
  return `NZD $${n.toLocaleString("en-NZ")}`;
}

function statusLabel(s: GrantRow["status"]): string {
  if (s === "awarded") return "Awarded";
  if (s === "pending") return "Pending";
  if (s === "planned") return "Planned";
  return "Declined";
}

function toDisplay(g: GrantRow & { artist_name?: string | null }): DisplayGrant {
  return {
    year: deriveYear(g),
    round: g.round ?? g.title ?? "—",
    funder: g.funder_name,
    amount: formatAmount(g),
    status: statusLabel(g.status),
    programme: g.title ?? "—",
    summary: g.public_summary ?? "—",
    artist_name: g.artist_name ?? null,
  };
}

async function getGrants(): Promise<DisplayGrant[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("funding_applications")
    .select(
      `id, funder_name, round, status, amount_requested_nzd, amount_awarded_nzd,
       submitted_date, decision_date, title, public_summary, artist_roster_id,
       roster:artist_roster!funding_applications_artist_roster_id_fkey (
         profile:profiles!artist_roster_profile_id_fkey (full_name)
       )`,
    )
    .eq("is_public", true)
    .order("decision_date", { ascending: false, nullsFirst: false })
    .order("submitted_date", { ascending: false, nullsFirst: false })
    .limit(50);
  if (error || !data) {
    console.error("[/funding]", error?.message);
    return [];
  }
  // PostgREST returns FK joins as either object or array; normalise.
  return ((data ?? []) as unknown as Array<GrantRow & {
    roster: { profile: { full_name: string | null } | { full_name: string | null }[] | null } | null;
  }>).map((g) => {
    const profile = g.roster?.profile;
    const profileObj = Array.isArray(profile) ? profile[0] : profile;
    const artistName = profileObj?.full_name?.trim() || null;
    return toDisplay({ ...g, artist_name: artistName });
  });
}
export default async function FundingPage() {
  const grants = await getGrants();

  return (
    <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Public transparency</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Funding
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Every grant received, applied for, and pending — for funder
        due-diligence and community accountability.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Grants received</h2>
        <div className="mt-6 space-y-4">
          {grants.map((g) => (
            <Card key={`${g.year}-${g.round}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {g.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{g.year}</span>
                    </div>
                    <CardTitle className="mt-2 text-xl">{g.round}</CardTitle>
                    <CardDescription>{g.funder}</CardDescription>
                    {g.artist_name && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        For <span className="font-medium">{g.artist_name}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl text-bronze-300">{g.amount}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Programme
                  </div>
                  <p className="mt-1 text-sm">{g.programme}</p>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Use of funds
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{g.summary}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {grants.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            No public grants yet. As the platform ships, every grant —
            awarded, pending, or declined — will surface here from
            {" "}<code>funding_applications</code>.
          </p>
        )}
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Active applications</h2>
        <Card className="mt-6 border-dashed">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-bronze-300" />
              <div>
                <p className="font-medium">Live application pipeline</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Active applications surface here as they move through
                  the pipeline. See the
                  {" "}<a href="/transparency" className="text-bronze-300 underline hover:text-bronze-200">transparency</a> page for
                  the full changelog.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Operating principles</h2>
        <ul className="mt-6 space-y-3 text-sm">
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Public accountability:</strong> Every grant, including the
            amount, the round, the body, and the programme, is listed here.
          </li>
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Use of funds:</strong> We publish how the money is spent —
            consultant fees, training, audits, accessibility tools.
          </li>
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Acknowledgement:</strong> Funded work acknowledges the
            funder publicly (footer + relevant pages).
          </li>
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Co-funding:</strong> We disclose matched cash / in-kind on
            every application to make matching requirements transparent.
          </li>
        </ul>
      </section>
    </div>
  );
}
