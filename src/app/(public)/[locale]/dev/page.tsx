import Link from "next/link";
import {
  Code2,
  Github,
  AudioLines,
  Search,
  Database,
  ExternalLink,
  Wrench,
  Clock,
  Braces,
  Regex,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Built by us · Dev & Tech",
  description:
    "Anamata Kāhui is built in-house. This page documents the stack, lists every public interactive tool, and links to the auditable source code.",
};

/**
 * /dev — public "Built by us" infrastructure showcase.
 *
 * For tech/digital funders: every claim here links to an auditable
 * source. The platform itself proves the infrastructure is real.
 *
 * Three sections:
 *   1. Interactive tools — real, working demos against the live database
 *   2. Stack audit — every technology choice with rationale
 *   3. Source code — GitHub repo, contribution policy, license
 */
export default function DevPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Dev & Tech · Built by us</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Built by us, in-house
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Most arts organisations outsource their digital infrastructure. We
        built ours. Every page, query, and rendering decision on this
        platform is open-source — auditable by funders, partners, and the
        community.
      </p>

      {/* Interactive tools */}
      <section className="mt-12">
        <h2 className="font-display text-2xl">Interactive tools</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Each tool below runs against the live platform database. No
          mockups, no fabricated data.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <ToolCard
            icon={AudioLines}
            title="Waiata stem browser"
            description="Browse released waiata with stems in the public storage bucket. Preview metadata, click through to the full release detail page."
            href="/dev/tools/stem-browser"
            badge="Music branch"
          />
          <ToolCard
            icon={Search}
            title="Reo Māori concordance"
            description="Search the released waiata catalogue by te reo Māori terms found in metadata, kinds, and cultural flags. Returns matching waiata with context."
            href="/dev/tools/concordance"
            badge="Research branch"
          />
          <ToolCard
            icon={Database}
            title="Audit log viewer"
            description="Live view of consent_log + data_governance_log. Every consent decision and governance event. Append-only, public-readable."
            href="/dev/tools/audit"
            badge="Governance"
          />
          <ToolCard
            icon={Clock}
            title="Cron expression parser"
            description="Paste a cron expression, see what it does in plain English, and calculate the next 5 runs in any timezone. Standard 5-field syntax."
            href="/dev/tools/cron"
            badge="DevOps · Universal"
          />
          <ToolCard
            icon={Braces}
            title="JSON viewer / formatter / diff"
            description="Paste JSON to view as a tree, format with 2-space indent, or diff two JSONs side-by-side. Pure client-side, no eval."
            href="/dev/tools/json"
            badge="Universal"
          />
          <ToolCard
            icon={Regex}
            title="Regex playground"
            description="Type a regex pattern, paste a test string, see matches highlighted with capture groups. Native browser regex, no server."
            href="/dev/tools/regex"
            badge="Universal"
          />
        </div>
      </section>

      {/* Stack audit */}
      <section className="mt-16">
        <h2 className="font-display text-2xl">Stack audit</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every layer of the platform, why we chose it, and what it costs.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <StackRow
            layer="Framework"
            tech="Next.js 16 (App Router, RSC, Server Actions)"
            why="Server components keep sensitive queries server-side. App Router gives us route groups for public/auth/dashboard separation."
          />
          <StackRow
            layer="Styling"
            tech="Tailwind CSS v4 + Shadcn UI"
            why="Tokenised design system — palette swap is one file edit. No hardcoded colours anywhere in component code."
          />
          <StackRow
            layer="Database + Auth"
            tech="Supabase (Postgres + Auth + Storage + RLS)"
            why="Row-level security scopes every record. No service-role keys in client code. Storage buckets are MIME-whitelisted."
          />
          <StackRow
            layer="TypeScript"
            tech="Strict mode, 0 `any` in core types"
            why="Single source of truth for branch_slug, role, cultural-review status. RLS helpers return boolean functions, not raw SQL."
          />
          <StackRow
            layer="i18n"
            tech="next-intl 4.13.3 (en + mi, 12 future locales pre-wired)"
            why="Locale routing via /en/... and /mi/... URLs. NZSL video slot reserved."
          />
          <StackRow
            layer="Cultural provenance"
            tech="Local Contexts Hub v2 API integration (custom client)"
            why="Machine-readable TK/BC/Notice labels that travel with files. XMP sidecar + PDF /Info dict + ID3 emitters."
          />
          <StackRow
            layer="PDF rendering"
            tech="@react-pdf/renderer (no headless Chrome)"
            why="Server-side PDF generation for the Funder Pack. Pure data-driven from SQL queries."
          />
          <StackRow
            layer="Background jobs"
            tech="Vercel Cron (every 6 hours for Hub revalidation)"
            why="Lightweight. No queue worker needed for our scale."
          />
        </div>
      </section>

      {/* Source code */}
      <section className="mt-16">
        <h2 className="font-display text-2xl">Source code &amp; contribution</h2>
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5 text-bronze-300" />
              <CardTitle>github.com/LaFinnix/anamata-kahui</CardTitle>
            </div>
            <CardDescription>
              Public repository, MIT-licensed. PRs welcome from artists,
              researchers, and developers. Cultural-review contributions
              require kaitiaki sign-off.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <a
                href="https://github.com/LaFinnix/anamata-kahui"
                target="_blank"
                rel="noreferrer"
              >
                <Github className="h-4 w-4" />
                View on GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/open-source">Open source policy</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/transparency">Transparency index</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* What this proves for funders */}
      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <div className="flex items-start gap-3">
          <Wrench className="mt-1 h-6 w-6 shrink-0 text-bronze-300" />
          <div>
            <h2 className="font-display text-2xl">Why this matters for funders</h2>
            <p className="mt-3 text-muted-foreground">
              When you fund digital infrastructure at an arts
              organisation, the question is: does the money build a
              lasting asset, or does it disappear into a third-party SaaS
              contract?
            </p>
            <p className="mt-3 text-muted-foreground">
              At Anamata Kāhui, <strong>100% of tech funding builds
              locally-owned assets</strong>: code, data, content. The
              platform is open-source and the database is portable.
              There is no SaaS subscription to lose access to.
            </p>
            <p className="mt-3 text-muted-foreground">
              For a tech grant assessor: every claim above links to a
              real file in the source repository, with a public commit
              history. If something is broken, you can see exactly when
              and why.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ToolCard({
  icon: Icon,
  title,
  description,
  href,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  badge: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-bronze-500/50 hover:bg-bronze-900/10"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bronze-400/15">
          <Icon className="h-5 w-5 text-bronze-300" />
        </div>
        <Badge variant="outline" className="ml-auto text-xs">
          {badge}
        </Badge>
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight group-hover:text-bronze-200">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <p className="mt-3 text-xs text-bronze-300 group-hover:text-bronze-200">
        Open tool →
      </p>
    </Link>
  );
}

function StackRow({
  layer,
  tech,
  why,
}: {
  layer: string;
  tech: string;
  why: string;
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {layer}
      </div>
      <div className="mt-1 font-mono text-sm">{tech}</div>
      <p className="mt-2 text-sm text-muted-foreground">{why}</p>
    </div>
  );
}