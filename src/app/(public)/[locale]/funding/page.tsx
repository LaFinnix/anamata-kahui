import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle2, Clock } from "lucide-react";

export const metadata = { title: "Funding" };

/**
 * Public funding transparency — funder signal.
 *
 * Per audit §2.14. Every grant received, applied for, and pending is
 * surfaced here. Auto-populated from `funding_outcomes` table once that
 * ships; this page is the static display.
 */
export default function FundingPage() {
  const grants = [
    {
      year: "2026",
      round: "Organizations and Groups Development Fund",
      body: "Creative New Zealand",
      amount: "NZD $10,000",
      status: "won",
      programme: "Cultural Competency + Accessibility (12-month capability build)",
      summary: "NZQA Level 4 Bicultural Competency + Accessibility Charter + Māori & Disabled Advisory Board. Application analysis at /opt/data/anamata/funding/past-applications/analysis/2026-04-CreativeNZ-DevelopmentFund-analysis.md.",
    },
  ];

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
                        {g.status === "won" ? "Awarded" : g.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{g.year}</span>
                    </div>
                    <CardTitle className="mt-2 text-xl">{g.round}</CardTitle>
                    <CardDescription>{g.body}</CardDescription>
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
                  We track 19 active NZ funding rounds in our internal
                  <code> TRACKER.md</code>. Active applications populate this
                  page once the cron-driven funding radar ships.
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
