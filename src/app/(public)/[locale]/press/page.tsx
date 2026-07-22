import Link from "next/link";
import { Download, Github, Mail, ExternalLink, Users, Music, BookOpen, Palette, Code2, Database, ShieldCheck, FileCheck2 } from "lucide-react";

import { getFunderKitData } from "@/lib/press/funder-kit-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Press & Funder Kit · Anamata Kāhui",
  description:
    "Live, public overview of Anamata Kāhui — branches, team, impact metrics, cultural provenance, and accountability. All data is current from the platform database.",
};

/**
 * /press — shareable public landing page that mirrors the PDF Funder Kit.
 *
 * Use cases:
 *   - Grant assessors who want a quick reference beyond the application
 *   - Journalists researching Anamata Kāhui before an interview
 *   - Partner organisations wanting to verify our public claims
 *
 * The page pulls the same data as the PDF, so a shareable URL always
 * shows the latest numbers.
 */
export default async function PressPage() {
  const data = await getFunderKitData();
  const generatedDate = new Date(data.generated_at);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header — logo, tagline, generated timestamp, PDF download */}
      <header className="mb-12 border-b border-border pb-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-bronze-400 shadow-[0_0_12px_var(--color-bronze-400)]" aria-hidden />
          <span className="text-sm font-semibold uppercase tracking-wider text-bronze-300">
            Press & Funder Kit
          </span>
        </div>
        <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
          {data.brand.name}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
          {data.brand.tagline}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <a href="/press/funder-kit.pdf" download>
              <Download className="h-4 w-4" />
              Download Funder Pack (PDF)
            </a>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <a href="mailto:press@anamatakahui.co.nz">
              <Mail className="h-4 w-4" />
              Request press assets
            </a>
          </Button>
          <Badge variant="outline" className="ml-auto">
            Generated {generatedDate.toLocaleDateString("en-NZ", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Badge>
        </div>
      </header>

      {/* Branches */}
      <section className="mb-12">
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">
          Four branches, one Kāhui
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.branches.map((branch) => {
            const Icon =
              branch.slug === "records" ? Music :
              branch.slug === "research" ? BookOpen :
              branch.slug === "arts" ? Palette : Code2;
            return (
              <Card key={branch.slug}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-bronze-300" />
                    <CardTitle>{branch.name}</CardTitle>
                  </div>
                  <CardDescription>{branch.one_liner}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={branch.public_url}
                    className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
                  >
                    Visit branch page <ExternalLink className="h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Impact metrics */}
      <section className="mb-12">
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">
          Live impact metrics
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          These figures are pulled directly from the platform database — the same numbers that appear on the public <Link href="/impact" className="text-bronze-300 hover:text-bronze-200 underline">/impact</Link> page.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Released waiata" value={data.impact.released_waiata} />
          <Stat label="Active iwi gates" value={data.impact.active_iwi_gates} />
          <Stat label="Research papers" value={data.impact.research_papers} />
          <Stat label="Field projects" value={data.impact.research_field_projects} />
          <Stat label="Scholarship engagements" value={data.impact.scholarship_engagements} />
          <Stat label="Local Contexts labels" value={data.impact.local_contexts_labels_applied} />
          <Stat label="Consent log entries" value={data.impact.consent_log_entries} />
          <Stat label="Data governance events" value={data.impact.data_governance_log_entries} />
        </div>
      </section>

      {/* Cultural provenance */}
      <section className="mb-12">
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">
          Cultural provenance — Local Contexts
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Every waiata and research output can carry machine-readable
          Traditional Knowledge (TK) and Biocultural (BC) labels via our
          integration with <a href="https://localcontexts.org" target="_blank" rel="noreferrer" className="text-bronze-300 hover:text-bronze-200 underline">Local Contexts Hub</a>.
          Labels travel with the file — see <Link href="/kaitiakitanga#local-contexts" className="text-bronze-300 hover:text-bronze-200 underline">/kaitiakitanga</Link>.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="TK labels applied" value={data.cultural_provenance.label_count_by_family.tk} />
          <Stat label="BC labels applied" value={data.cultural_provenance.label_count_by_family.bc} />
          <Stat label="Notices active" value={data.cultural_provenance.label_count_by_family.notice} />
        </div>
        {data.cultural_provenance.exemplar_projects.length > 0 && (
          <div className="mt-4 rounded-md border border-border bg-muted/30 p-4">
            <h3 className="mb-2 text-sm font-semibold">Exemplar projects</h3>
            <ul className="space-y-1 text-sm">
              {data.cultural_provenance.exemplar_projects.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate">{p.title}</span>
                  <Badge variant="secondary" className="shrink-0">
                    {p.hub_label_count} label{p.hub_label_count === 1 ? "" : "s"}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Funding status — counts only, no confidential funder names */}
      <section className="mb-12">
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">
          Funding posture
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Live status across our funding application pipeline. Funder names
          are deliberately not listed here — see our <Link href="/funding" className="text-bronze-300 hover:text-bronze-200 underline">funding page</Link> for the public portfolio.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Planned" value={data.funding_status.planned} />
          <Stat label="Pending" value={data.funding_status.pending} />
          <Stat label="Awarded" value={data.funding_status.awarded} />
          <Stat label="Declined" value={data.funding_status.declined} />
        </div>
      </section>

      {/* Team profiles */}
      {data.team.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">
            Team profiles
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.team.map((p, i) => (
              <div key={i} className="rounded-md border border-border p-4">
                <div className="mb-1 flex items-center gap-2">
                  <Users className="h-4 w-4 text-bronze-300" />
                  <span className="font-medium">{p.full_name}</span>
                </div>
                <Badge variant="outline" className="mb-2 capitalize">
                  {p.role.replace("_", " ")}
                </Badge>
                {p.bio && (
                  <p className="text-sm text-muted-foreground">{p.bio}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Accountability */}
      <section className="mb-12">
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">
          Audit &amp; accountability
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The platform is open-source. Every consent decision, data
          governance event, and cultural gate is recorded in an append-only
          audit log. Reviewers can read the source, run their own checks,
          and verify the numbers above match the database.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={data.accountability.github_repo}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md border border-border p-3 text-sm hover:bg-muted"
          >
            <Github className="h-4 w-4 text-bronze-300" />
            <span>Source code &amp; commit history</span>
            <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
          </a>
          <Link
            href={data.accountability.privacy_notice}
            className="flex items-center gap-2 rounded-md border border-border p-3 text-sm hover:bg-muted"
          >
            <ShieldCheck className="h-4 w-4 text-bronze-300" />
            <span>Privacy notice (NZ Privacy Act 2020)</span>
          </Link>
          <Link
            href={data.accountability.terms_of_use}
            className="flex items-center gap-2 rounded-md border border-border p-3 text-sm hover:bg-muted"
          >
            <FileCheck2 className="h-4 w-4 text-bronze-300" />
            <span>Terms of use</span>
          </Link>
          <Link
            href={data.accountability.accessibility_statement}
            className="flex items-center gap-2 rounded-md border border-border p-3 text-sm hover:bg-muted"
          >
            <Database className="h-4 w-4 text-bronze-300" />
            <span>Accessibility statement (WCAG 2.2 AA)</span>
          </Link>
        </div>
      </section>

      {/* Footer / contact */}
      <footer className="border-t border-border pt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            This page is regenerated on each visit. Numbers above reflect the
            platform database as of{" "}
            <time dateTime={data.generated_at}>
              {generatedDate.toLocaleString("en-NZ")}
            </time>.
          </div>
          <div className="flex items-center gap-3 text-sm">
            <a
              href={`mailto:${data.brand.email}`}
              className="inline-flex items-center gap-1 text-bronze-300 hover:text-bronze-200"
            >
              <Mail className="h-3 w-3" />
              {data.brand.email}
            </a>
            <a
              href={data.brand.url}
              className="inline-flex items-center gap-1 text-bronze-300 hover:text-bronze-200"
            >
              {data.brand.url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="text-2xl font-display font-semibold text-bronze-200">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}