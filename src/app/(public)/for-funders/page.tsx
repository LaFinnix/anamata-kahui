import Link from "next/link";
import { ArrowRight, Calendar, FileCheck2, Shield, GraduationCap, Building2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "For funders",
  description:
    "For people and organisations deciding whether to fund Anamata Kāhui. Live evidence, active funding rounds, and the cultural-governance posture that de-risks investment.",
};

export default function ForFundersPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">For funders · decision support</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        For funders
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        For people and organisations deciding whether to fund Anamata
        Kāhui. Every claim below links to a live evidence page — no PDFs
        to request, no follow-ups needed.
      </p>

      <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <EvidenceCard
          href="/kaitiakitanga"
          title="Cultural posture"
          description="Te Mana Raraunga CARE-aligned. Right of withdrawal published. Live data-governance changelog."
          icon={Shield}
        />
        <EvidenceCard
          href="/transparency"
          title="Operational evidence"
          description="Every iwi gate, every consent decision, every published governance entry — visible in real time."
          icon={FileCheck2}
        />
        <EvidenceCard
          href="/evidence"
          title="Named partners"
          description="Maurea, Arts Access Aotearoa, MMIC, SoundCheck Aotearoa, Otago Polytechnic, WordsWorth. Each with role, organisation, status."
          icon={Building2}
        />
        <EvidenceCard
          href="/research/papers"
          title="Published research"
          description="Working paper series with full cultural provenance on every page. DOI minted, cross-citations live."
          icon={GraduationCap}
        />
        <EvidenceCard
          href="/accessibility"
          title="Accessibility commitment"
          description="WCAG 2.2 AA target. Trilingual production (English, te reo Māori, NZSL). Quarterly external review."
          icon={Shield}
        />
        <EvidenceCard
          href="/waiata"
          title="Released catalog"
          description="5 released waiata, 24 in catalog. Each release carries cultural-review lineage, kaitiaki gate, language code."
          icon={Calendar}
        />
      </section>

      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">The 5-pillar evidence framework</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Anamata Kāhui's value proposition maps to five pillars that
          recur across NZ cultural funders' criteria. Each pillar is
          verifiable through the linked pages:
        </p>
        <ol className="mt-6 space-y-4">
          <Pillar
            n={1}
            title="Cultural Competency"
            body="Visible operational Tiriti integration. NZQA Level 4 Bicultural Competency. Kaitiaki rōpū governance body."
            links={[
              { href: "/governance", label: "Governance" },
              { href: "/kaitiakitanga", label: "Kaitiakitanga" },
            ]}
          />
          <Pillar
            n={2}
            title="Accessibility"
            body="WCAG 2.2 AA target. Trilingual production. Vibrotactile / haptic music production pipeline. NZSL hero in production."
            links={[
              { href: "/accessibility", label: "Accessibility statement" },
            ]}
          />
          <Pillar
            n={3}
            title="Māori Data Sovereignty"
            body="Supabase RLS enforced per-row. Te Mana Raraunga CARE principles operational. Append-only consent log. Withdrawal within 30 days."
            links={[
              { href: "/kaitiakitanga", label: "Kaitiakitanga" },
              { href: "/transparency", label: "Transparency" },
            ]}
          />
          <Pillar
            n={4}
            title="Outcomes & Evaluation"
            body="Live outcomes dashboard — reach, cultural, industry metrics. Real numbers from the database, not promises."
            links={[
              { href: "/impact", label: "Impact dashboard" },
            ]}
          />
          <Pillar
            n={5}
            title="Digital Infrastructure"
            body="Open-source platform. Iwi / hapū / community organisations can self-host. MIT-licensed."
            links={[
              { href: "/open-source", label: "Open source" },
            ]}
          />
        </ol>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Where to apply next</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Active opportunities Anamata researchers and partners monitor.
          Full eligibility + selection criteria + named precedents at{" "}
          <Link href="/research/scholarships/portfolio" className="text-bronze-300 hover:text-bronze-200 underline">
            /research/scholarships/portfolio
          </Link>.
        </p>
        <ul className="mt-6 space-y-2 text-sm">
          <li className="flex items-start gap-3 rounded-md border border-border bg-card p-4">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-bronze-300" />
            <div>
              <strong>Creative NZ International Arts Impact Fund</strong>
              {" "}— Round 2 opens 24 Aug 2026.
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-md border border-border bg-card p-4">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-bronze-300" />
            <div>
              <strong>Creative NZ International Engagement Fund</strong>
              {" "}— new for 2026, criteria TBA.
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-md border border-border bg-card p-4">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-bronze-300" />
            <div>
              <strong>NZ Music Commission Outward Sound</strong>
              {" "}— Round 4 closes Mon 27 Jul 2026 (5 days).
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-md border border-border bg-card p-4">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-bronze-300" />
            <div>
              <strong>Royal Society Te Apārangi — Tāwhia te Mana Fellowships</strong>
              {" "}— open rounds, VM-aligned.
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-md border border-border bg-card p-4">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-bronze-300" />
            <div>
              <strong>Asia New Zealand Foundation</strong>
              {" "}— multiple programmes, NZ-resident applicants.
            </div>
          </li>
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Why fund this</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-6">
            <h3 className="font-display text-xl">De-risked cultural investment</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Every cultural decision has a documented consent lineage.
              Kaitiaki rōpū governance means reviewers are accountable to
              iwi, not to the label. Withdrawal requests honoured within
              30 days. The risk profile is materially lower than ad-hoc
              cultural production.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-6">
            <h3 className="font-display text-xl">Open-source public good</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The platform itself is released under MIT. A grant that
              funds this platform builds public-good infrastructure that
              other iwi can adopt. Investment is permanent, not amortised
              into a single campaign.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-6">
            <h3 className="font-display text-xl">Multi-funder compatible</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Schema and evidence surface designed to satisfy Creative NZ,
              NZ On Air, Te Mātāwai, Asia NZ Foundation, Royal Society Te
              Apārangi, HRC, and Marsden Fund simultaneously. One
              investment serves many subsequent rounds.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-6">
            <h3 className="font-display text-xl">Tracked, not promised</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Every grant received, applied for, and pending is published
              at <Link href="/funding" className="text-bronze-300 hover:text-bronze-200 underline">/funding</Link>.
              No funder needs to ask where money went.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8 text-center">
        <h2 className="font-display text-2xl">Get in touch</h2>
        <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
          Ready to talk, or want a deeper dive on a specific pillar?
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-md bg-bronze-400 px-4 py-2.5 text-sm font-medium text-background hover:bg-bronze-300 shadow"
          >
            Contact the Kāhui <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/funding"
            className="inline-flex items-center gap-2 rounded-md border border-bronze-500/40 bg-transparent px-4 py-2.5 text-sm font-medium text-foreground hover:bg-bronze-900/40"
          >
            View funding history
          </Link>
        </div>
      </section>
    </div>
  );
}

function EvidenceCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-border bg-card p-6 transition-colors hover:border-bronze-500/50"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 text-bronze-300" />
        <div>
          <h3 className="font-display text-lg">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-bronze-300 group-hover:text-bronze-200">
            {href} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </p>
        </div>
      </div>
    </Link>
  );
}

function Pillar({
  n,
  title,
  body,
  links,
}: {
  n: number;
  title: string;
  body: string;
  links: { href: string; label: string }[];
}) {
  return (
    <li className="rounded-md border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bronze-400/15 font-display text-sm font-semibold text-bronze-300">
          {n}
        </span>
        <div className="flex-1">
          <h3 className="font-display text-lg">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          {links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex items-center gap-1 text-xs text-bronze-300 hover:text-bronze-200"
                >
                  {l.label} <ArrowRight className="h-3 w-3" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
