import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Music, BookOpen, Palette, Code2 } from "lucide-react";

import { BRANCHES, BRANCH_BY_SLUG } from "@/lib/branches";
import type { BranchSlug } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BRANCH_ICONS: Record<BranchSlug, LucideIcon> = {
  records: Music,
  research: BookOpen,
  arts: Palette,
  dev: Code2,
};

interface BranchLandingConfig {
  tagline: string;
  highlights: { title: string; body: string }[];
  cta: { label: string; href: string };
}

const BRANCH_LANDING: Record<BranchSlug, BranchLandingConfig> = {
  records: {
    tagline:
      "Music branch — artist portal, release pipeline, stem vault, and royalty analytics.",
    highlights: [
      { title: "Artist portal",        body: "Each artist manages their roster, releases, and royalties in one place." },
      { title: "Release pipeline",     body: "Track a release from draft through scheduled drop to post-release analytics." },
      { title: "Stem vault",           body: "Secure, versioned storage for masters, stems, and supporting artwork." },
      { title: "Stream & royalty",     body: "Performance metrics from Spotify, Apple Music, and the local distributors." },
    ],
    cta: { label: "Open the Records dashboard", href: "/records/dashboard" },
  },
  research: {
    tagline:
      "Knowledge vault, document archives, and field projects for language preservation.",
    highlights: [
      { title: "Document vault",        body: "Searchable archive of primary sources, transcripts, and field notes." },
      { title: "Field projects",        body: "Live tracker for in-progress fieldwork with iwi-gate and consent metadata." },
      { title: "Language tools",        body: "Reo Māori corpus utilities — concordance, frequency, and dialect markers." },
      { title: "Publications",          body: "Peer-reviewed and community publications with DOI minting." },
    ],
    cta: { label: "Open the Research portal", href: "/research/dashboard" },
  },
  arts: {
    tagline:
      "Visual arts, digital media showcase, and cultural design portfolios.",
    highlights: [
      { title: "Galleries",       body: "Curated collections of visual work — high-resolution, slow-loaded, captioned." },
      { title: "Digital media",   body: "Generative, motion, and interactive pieces served from edge-cached storage." },
      { title: "Portfolios",      body: "Each artist or designer has a portfolio with provenance and exhibition history." },
      { title: "Commissions",     body: "Brief intake and project tracking for commissioned work." },
    ],
    cta: { label: "Open the Arts dashboard", href: "/arts/dashboard" },
  },
  dev: {
    tagline:
      "Software projects, client tools, and internal automation for the Kāhui.",
    highlights: [
      { title: "Client tools",     body: "Dashboards and utilities built for the Kāhui's partners." },
      { title: "Open source",      body: "Reusable libraries and starters released under permissive licences." },
      { title: "Automation",       body: "Internal scripts and pipelines for catalog, release, and analytics work." },
      { title: "API console",      body: "Authenticated route to manage API keys and integration secrets." },
    ],
    cta: { label: "Open the Dev console", href: "/dev/dashboard" },
  },
};

export function generateStaticParams() {
  return BRANCHES.map((b) => ({ slug: b.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BranchLandingPage({ params }: PageProps) {
  const { slug } = await params;
  if (!(["records", "research", "arts", "dev"] as const).includes(slug as BranchSlug)) {
    notFound();
  }

  const branchSlug = slug as BranchSlug;
  const branch = BRANCH_BY_SLUG[branchSlug];
  const config = BRANCH_LANDING[branchSlug];
  const Icon = BRANCH_ICONS[branchSlug];

  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="flex items-center gap-3 text-bronze-300">
            <Icon className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              {branch.name}
            </span>
          </div>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
            {config.tagline}
          </h1>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href={config.cta.href}>
                {config.cta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2">
          {config.highlights.map((h) => (
            <Card key={h.title}>
              <CardHeader>
                <CardTitle className="text-xl">{h.title}</CardTitle>
                <CardDescription>{h.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

export type { ReactNode };
