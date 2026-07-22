import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Library } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Research & Language",
  description:
    "Research division of Anamata Kāhui — published papers with cultural provenance, and active scholarship opportunities for cross-border research involving Aotearoa.",
};

export default function ResearchAboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Research branch</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Research & Language
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Knowledge vault, document archives, and field projects. Published
        research outputs carry full cultural provenance — iwi consent
        lineage, language, and access tier are visible on every page.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="group transition-colors hover:border-bronze-500/50">
          <CardHeader>
            <Library className="h-5 w-5 text-bronze-300" />
            <CardTitle>Document vault</CardTitle>
            <CardDescription>
              Searchable archive of primary sources, transcripts, and field notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Scaffold — coming soon</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              Surfaces documents with iwi consent lineage and cultural
              access tier. Schema ships in migration 0006 once scope is
              confirmed with kaitiaki rōpū.
            </p>
          </CardContent>
        </Card>

        <Card className="group transition-colors hover:border-bronze-500/50">
          <CardHeader>
            <BookOpen className="h-5 w-5 text-bronze-300" />
            <CardTitle>Field projects</CardTitle>
            <CardDescription>
              Live tracker for in-progress fieldwork with iwi-gate and
              consent metadata.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Scaffold — coming soon</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              Each project tracks lead researcher, iwi partner, location,
              dates, methodology, and outputs.
            </p>
          </CardContent>
        </Card>

        <Card className="group transition-colors hover:border-bronze-500/50">
          <CardHeader>
            <GraduationCap className="h-5 w-5 text-bronze-300" />
            <CardTitle>Language tools</CardTitle>
            <CardDescription>
              Reo Māori corpus utilities — concordance, frequency, dialect
              markers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Scaffold — coming soon</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              Build target for post-MVP. Useful as iwi-mandated
              language-revitalisation evidence.
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Live surfaces</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          What's already on the platform:
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href="/research/papers"
            className="group block rounded-lg border border-border bg-card p-6 transition-colors hover:border-bronze-500/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-bronze-300" />
                  <h3 className="font-display text-lg">Published papers</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every published research document with full cultural
                  provenance, DOI, citations cross-linked to waiata.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 mt-1 text-bronze-300 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          <Link
            href="/research/scholarships"
            className="group block rounded-lg border border-border bg-card p-6 transition-colors hover:border-bronze-500/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-bronze-300" />
                  <h3 className="font-display text-lg">Scholarships & research mobility</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Active alternatives to the discontinued PMSA + named
                  cultural-research precedents.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 mt-1 text-bronze-300 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>
      </section>

      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Why the platform is the proof</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Funders ask: "where are your research outputs?" We answer with a
          live page — not a PDF attachment. Every paper's cultural
          provenance, iwi consent lineage, and access tier are visible
          without sending a separate document. That's the difference
          between "we do cultural research" and "here is our cultural
          research, verifiable by visiting the URL."
        </p>
      </section>
    </div>
  );
}
