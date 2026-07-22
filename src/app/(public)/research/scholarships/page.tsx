import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BookOpen, ExternalLink, GraduationCap, Globe } from "lucide-react";

export const metadata = {
  title: "Scholarships & research mobility",
  description:
    "Active alternatives to the discontinued Prime Minister's Scholarship for Asia — Anamata's historical eligibility, precedents, and where to apply now for cross-border research involving Aotearoa.",
};

/**
 * Active alternatives + historical context for cross-border research.
 *
 * Per PMSA-RESEARCH.md (2026-07-22), the Prime Minister's Scholarship for
 * Asia was discontinued effective 1 July 2025. This page documents the
 * historical eligibility + precedents and points researchers at the active
 * alternatives that replace it.
 */
export default function ScholarshipsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="destructive" className="mb-4 gap-1">
        <AlertTriangle className="h-3 w-3" />
        PMSA discontinued 1 July 2025
      </Badge>

      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Scholarships & research mobility
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Active funding sources for cross-border research involving Aotearoa —
        and a historical record of the Prime Minister's Scholarship for
        Asia (PMSA), the strongest precedent for Anamata's cultural-research
        scope.
      </p>

      <section className="mt-12 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Important note</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Education New Zealand discontinued the{" "}
          <strong>Prime Minister's Scholarship for Asia (PMSA)</strong> and{" "}
          <strong>PMSLA</strong> effective 1 July 2025. ENZ supported existing
          recipients through 30 June 2026. There is no 2026 application round.
          The full archived eligibility analysis — including the 50-point
          selection rubric, historical funding amounts, and named cultural /
          Indigenous precedents (Rangaranga, Xavier Muao Breed, marae-led
          groups) — is at{" "}
          <code>docs/PMSA-RESEARCH.md</code> in this repository.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Active alternatives</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Cross-border research involving Aotearoa still has multiple live
          pathways. These are the funders Anamata researchers and partners
          monitor. Final list at <a href="/funding" className="text-bronze-300 hover:text-bronze-200 underline">/funding</a>.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <GraduationCap className="h-5 w-5 text-bronze-300" />
              <CardTitle>Creative NZ International Arts Impact Fund</CardTitle>
              <CardDescription>
                Round 2 opens 24 Aug 2026. International projects with
                cross-cultural exchange. Direct fit for Anamata's
                Kurokoru/Japan collaboration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Already in TRACKER.md</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Globe className="h-5 w-5 text-bronze-300" />
              <CardTitle>Asia New Zealand Foundation</CardTitle>
              <CardDescription>
                Asia grants + leadership programmes + language
                scholarships. Active. NZ-focused, indigenous-eligible.
                Strongest live alternative to PMSA for Japan fieldwork.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href="https://www.asianz.org.nz"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
              >
                asianz.org.nz <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BookOpen className="h-5 w-5 text-bronze-300" />
              <CardTitle>Royal Society Te Apārangi — Tāwhia te Mana</CardTitle>
              <CardDescription>
                Three-tier fellowship programme (Mana Tūāpapa / Mana
                Tūānuku / Mana Tūārangi). Vision Mātauranga-aligned.
                NZ-based researchers going overseas explicitly eligible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href="https://www.royalsociety.org.nz/what-we-do/funds-and-opportunities/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
              >
                royalsociety.org.nz <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Globe className="h-5 w-5 text-bronze-300" />
              <CardTitle>Te Mātāwai Te Reo Matatini / Pae Motuhake</CardTitle>
              <CardDescription>
                Te reo Māori content + iwi-mandated cultural research. Direct
                fit for Anamata's language-revitalisation work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href="https://www.tematawai.maori.nz"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
              >
                tematawai.maori.nz <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <GraduationCap className="h-5 w-5 text-bronze-300" />
              <CardTitle>Creative NZ International Engagement Fund</CardTitle>
              <CardDescription>
                New for 2026. International engagement. Criteria TBA
                before open.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Already in TRACKER.md</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BookOpen className="h-5 w-5 text-bronze-300" />
              <CardTitle>MFAT — Short Term Training Awards</CardTitle>
              <CardDescription>
                Indigenous Peoples' Capacity Building programme includes
                cultural-research mobility. Active.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href="https://www.mfat.govt.nz/en/aid-and-development/our-aid-partnerships/in-the-pacific/pacific-capability-development"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
              >
                mfat.govt.nz <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Historical precedents worth knowing</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          These are the named recipients from PMSA's archived alumni archive.
          Each demonstrates a category of work Anamata's cultural-research
          scope fits:
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Rangaranga rōpū (12 Māori graduates, Japan)</strong> —
            eight-week indigenous-to-indigenous cultural exchange with
            Ainu / Japanese Indigenous communities. Strongest precedent
            for Anamata's Māori–Japan work.
          </li>
          <li className="rounded-md border border-border bg-card p-4">
            <strong>First marae-led PMSA group</strong> — confirmed marae-led
            (non-university) Indigenous programming was fundable.
          </li>
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Xavier Muao Breed</strong> — Master of Dance Studies,
            research at Taipei National University of the Arts. Arts-based
            postgraduate research precedent.
          </li>
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Nakita Wiperi</strong> — Spanish + Indigenous integration
            with Maya tribe, Mexico. Linguistic + cultural + Indigenous
            comparative.
          </li>
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Hone Morris + Massey cohort (Colombia)</strong> — 12
            students + 6 Indigenous groups, 4-week exchange. Cross-cultural
            Indigenous pedagogy.
          </li>
          <li className="rounded-md border border-border bg-card p-4">
            <strong>Harrison Gibb-Faumuina</strong> — Pasifika Japan precedent.
            Tokyo exchange + language + internship.
          </li>
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Use the precedent in your application</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          The 50-point PMSA scoring rubric is a useful mirror for any
          cultural-research funder's evaluation. The criteria were:
          programme fit (20), community (15), institutional/workplace (5),
          national (5), diversity (5). Māori + Pasifika were explicit in
          the under-represented demographic criterion.
        </p>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          When applying to live alternatives (Asia NZ Foundation, Royal
          Society, Te Mātāwai, CNZ International Arts Impact), mirror this
          structure: lead with programme fit, prove community benefit,
          show institutional leverage, name national and reciprocal-network
          outcomes.
        </p>
      </section>
    </div>
  );
}
