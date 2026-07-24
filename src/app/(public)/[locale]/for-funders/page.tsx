import Link from "next/link";
import { ArrowRight, Calendar, FileCheck2, Shield, GraduationCap, Building2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * /for-funders — public decision-support page.
 *
 * Most content is static translation. The two data-driven pieces are:
 *
 *   1. The "Released catalog" card (live `releases` count) — used to
 *      say "5 released, 24 in catalog" which was stale and wrong
 *      (DB has 4 released, 8 published, 24 total). Pulled live now.
 *
 *   2. The "Data as of" badge in the page header — the timestamp the
 *      funder can cite as "this is what the platform looked like at
 *      X o'clock on Y date." Refreshes on the 5-minute revalidate.
 */

interface ForFundersStats {
  releasedCount: number;
  scheduledCount: number;
  publishedCount: number; // released + scheduled
  catalogCount: number; // everything except draft
  totalReleases: number;
  dataAsOf: string;
}

async function getForFundersStats(): Promise<ForFundersStats> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("releases")
    .select("status", { count: "exact" });
  if (error || !data) {
    // If the query fails, return zeros — the page must render even
    // when the database is briefly unavailable.
    console.error("[/for-funders stats]", error?.message);
    return {
      releasedCount: 0,
      scheduledCount: 0,
      publishedCount: 0,
      catalogCount: 0,
      totalReleases: 0,
      dataAsOf: new Date().toISOString(),
    };
  }
  // data here is just an array of { status } rows; we count client-side.
  const counts = {
    draft: 0,
    scheduled: 0,
    released: 0,
    archived: 0,
  } as Record<string, number>;
  for (const row of data as Array<{ status: string }>) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  const released = counts.released ?? 0;
  const scheduled = counts.scheduled ?? 0;
  const draft = counts.draft ?? 0;
  const archived = counts.archived ?? 0;
  return {
    releasedCount: released,
    scheduledCount: scheduled,
    publishedCount: released + scheduled,
    catalogCount: released + scheduled + archived,
    totalReleases: released + scheduled + draft + archived,
    dataAsOf: new Date().toISOString(),
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "forFunders" });
  return {
    title: t("title"),
    description: t("lede").slice(0, 160),
  };
}

export const revalidate = 300; // 5-minute refresh of the live stats

export default async function ForFundersPage() {
  const t = await getTranslations("forFunders");
  const stats = await getForFundersStats();
  const dataAsOfDisplay = new Date(stats.dataAsOf).toLocaleString("en-NZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline">For funders · decision support</Badge>
        <Badge variant="secondary" className="text-xs font-normal">
          Data as of {dataAsOfDisplay} (NZST)
        </Badge>
      </div>
      <h1 className="text-balance text-4xl font-display text-foreground font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        {t("lede")}
      </p>

      <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <EvidenceCard
          href="/for-funders/tour"
          title="System tour"
          description="Six screens, end to end: how a waiata moves through the kāhui from kaikōrero joining to public cultural lineage."
          icon={Calendar}
        />
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
          title="Funders we work with"
          description="Creative NZ, Education NZ, NZ On Air, and takiridevelopments. Each funder with role, round, and platform alignment."
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
          description={`${stats.releasedCount} released waiata, ${stats.publishedCount} published (released + scheduled), ${stats.catalogCount} in catalog. Each release carries cultural-review lineage, kaitiaki gate, language code.`}
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
              {" "}— round dates announced on the Creative NZ website.
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
              Education NZ, NZ On Air, and takiridevelopments
              simultaneously. One investment serves many subsequent
              rounds.
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
            href="/press/funder-kit.pdf"
            download
            className="inline-flex items-center gap-2 rounded-md bg-bronze-400 px-4 py-2.5 text-sm font-medium text-background hover:bg-bronze-300 shadow"
          >
            Download Funder Pack (PDF) <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/press"
            className="inline-flex items-center gap-2 rounded-md border border-bronze-500/40 bg-transparent px-4 py-2.5 text-sm font-medium text-foreground hover:bg-bronze-900/40"
          >
            View Press Kit
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-md border border-bronze-500/40 bg-transparent px-4 py-2.5 text-sm font-medium text-foreground hover:bg-bronze-900/40"
          >
            Contact the Kāhui
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
