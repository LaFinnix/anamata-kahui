import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Vote, FileText } from "lucide-react";

export const metadata = {
  title: "Governance",
  description:
    "How Anamata Kāhui is governed — board composition, decision rights, kaitiaki rōpū, meeting cadence, and operational Tiriti o Waitangi integration.",
};

/**
 * Public governance page.
 *
 * Per audit §2.6, this is a funder signal: "Māori-led but inclusive" made
 * operational. Lists governance structure, decision rights, meeting cadence,
 * and conflict-of-interest policy. Live roster once `kaitiaki_roopu` has data.
 */
export default function GovernancePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Public governance</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Governance
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        How Anamata Kāhui is governed, who decides what, and how to engage.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl">Operating principles</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Anamata Kāhui Limited is a New Zealand-registered company governed
          under Te Tiriti o Waitangi. The board holds ultimate responsibility
          for strategic direction, financial stewardship, and cultural
          integrity. Day-to-day operations are delegated to branch leads
          within a published delegation policy.
        </p>
      </section>

      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <Users className="h-5 w-5 text-bronze-300" />
            <CardTitle>Board composition</CardTitle>
            <CardDescription>
              Minimum 5 directors; majority Māori. At least one director with
              cultural review credentials (e.g. Ngāi Tahu, Tainui, Tūhoe,
              Kahungunu whakapapa). At least one director from outside the
              music sector.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Vote className="h-5 w-5 text-bronze-300" />
            <CardTitle>Decision rights</CardTitle>
            <CardDescription>
              Strategic &gt; $50k, all iwi-gate decisions, all cultural
              policy: board. Operational &lt; $50k and within policy: branch
              lead. Cultural review veto: kaitiaki rōpū.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Calendar className="h-5 w-5 text-bronze-300" />
            <CardTitle>Meeting cadence</CardTitle>
            <CardDescription>
              Board: quarterly, with one hui-a-tau per year. Kaitiaki rōpū:
              monthly. Branch leads: fortnightly.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <FileText className="h-5 w-5 text-bronze-300" />
            <CardTitle>Public minutes</CardTitle>
            <CardDescription>
              Board meeting summaries (excluding confidential personnel /
              commercial items) published within 14 days. Kaitiaki rōpū
              decisions logged in <code>consent_log</code> and surfaced via
              <code>/transparency</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Kaitiaki rōpū</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          A standing cultural review body with veto authority over any release,
          document, or design that touches taonga. Members hold weighted
          votes reflecting their whakapapa and review credentials.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Live roster and meeting minutes will surface here once the
          <code>kaitiaki_roopu</code> table is populated (migration 0002 ships
          the schema; engagement letters are pending).
        </p>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Operational Tiriti integration</h2>
        <ul className="mt-6 space-y-3 text-sm">
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Procurement:</strong> Māori-owned suppliers prioritised for
            design, printing, catering, and venue hire.
          </li>
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Hiring:</strong> Cultural competency (NZQA Level 4 minimum)
            required for all roles; te reo Māori proficiency weighted in
            recruitment for client-facing roles.
          </li>
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Partnerships:</strong> iwi relationships formalised via
            MoUs. Partnership register at <code>/evidence</code>.
          </li>
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Decision-making:</strong> Cultural review required before
            any release, design, or policy decision that touches taonga.
          </li>
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Conflict of interest:</strong> Declared in writing at
            every board meeting; recusals minuted.
          </li>
        </ul>
      </section>
    </div>
  );
}
