import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Shield, Eye, FileText, Download, XCircle, Globe } from "lucide-react";
import { LocalContextsExplainer } from "@/components/local-contexts/explainer";

export const metadata = {
  title: "Kaitiakitanga",
  description:
    "How Anamata Kāhui holds cultural data on behalf of the communities it comes from — Te Mana Raraunga CARE principles, iwi consent lineage, and right of withdrawal.",
};

const PRINCIPLES = [
  {
    icon: Shield,
    title: "CARE — Authority to control",
    body: "Māori data is subject to the rights articulated in Te Tiriti o Waitangi and the UN Declaration on the Rights of Indigenous Peoples. Iwi and hapū retain authority over data about them.",
  },
  {
    icon: Eye,
    title: "CARE — Collective benefit",
    body: "Data ecosystems must enable communities to derive benefit from their own data. We design storage, access patterns, and analytics to flow benefit back to source communities.",
  },
  {
    icon: Database,
    title: "CARE — Responsibility",
    body: "Those working with Māori data are responsible for nurturing relationships, not just transactions. Every kaiwaiata, kaimātai, and partner we work with signs onto this principle.",
  },
  {
    icon: FileText,
    title: "CARE — Ethics",
    body: "Minimise harm; maximise wellbeing. Cultural review precedes any public release, and we honour the right of withdrawal at any point.",
  },
] as const;

const COMMITMENTS = [
  "Waiata with iwi gates are not released without written consent from named iwi representatives.",
  "Cultural metadata is held in a separate Supabase schema with row-level security scoped to iwi-recognised reviewers.",
  "We do not sell, license, or aggregate waiata data to third parties without iwi approval.",
  "Right of withdrawal: any iwi can request takedown; we honour it within 30 days.",
  "All consent decisions are logged in an append-only consent_log visible to kaitiaki.",
  "We publish a data governance changelog at /data-governance.",
] as const;

export default function KaitiakitangaPage() {
  return (
    <article className="prose prose-invert mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <header>
        <Badge variant="outline" className="mb-4">Te Mana Raraunga · CARE-aligned</Badge>
        <h1 className="font-display">Kaitiakitanga</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          How the Kāhui holds cultural data on behalf of the communities it comes from.
        </p>
      </header>

      <section className="not-prose mt-12">
        <h2 className="font-display text-2xl">Our commitments</h2>
        <p className="mt-3 text-muted-foreground">
          Anamata Kāhui applies Te Mana Raraunga's Māori data sovereignty principles
          to every dataset we hold. The CARE principles (Collective benefit,
          Authority to control, Responsibility, Ethics) were developed
          specifically to complement FAIR for Indigenous data — Te Mana
          Raraunga is the Aotearoa custodian.
        </p>
        <ul className="mt-6 space-y-3">
          {COMMITMENTS.map((c) => (
            <li key={c} className="flex items-start gap-3 rounded-md border border-border bg-card p-4">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-pounamu-300" />
              <span className="text-sm">{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="not-prose mt-16">
        <h2 className="font-display text-2xl">The four CARE principles in practice</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="h-5 w-5 text-pounamu-300" />
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="not-prose mt-16">
        <h2 className="font-display text-2xl">Your data, your rights</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <Eye className="h-5 w-5 text-bronze-300" />
              <CardTitle className="text-lg">See what we hold</CardTitle>
              <CardDescription>
                Any iwi or named contributor can request a full export of data
                attributed to them, in open formats (JSON / CSV).
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Download className="h-5 w-5 text-bronze-300" />
              <CardTitle className="text-lg">Export your data</CardTitle>
              <CardDescription>
                A signed data export request is processed within 30 days. We
                deliver a portable archive plus a metadata manifest.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <XCircle className="h-5 w-5 text-bronze-300" />
              <CardTitle className="text-lg">Withdraw</CardTitle>
              <CardDescription>
                Any iwi can request takedown of a release, document, or
                attribution. Honoured within 30 days, no questions asked.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="not-prose mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">He taonga te data</h2>
        <blockquote className="mt-4 border-l-2 border-bronze-400 pl-4 italic text-muted-foreground">
          "All data is potential taonga in relation to its utility, through
          technology or usefulness to the collective."
          <footer className="mt-2 not-italic text-sm">— Dr Will Edwards, Ngāruahine</footer>
        </blockquote>
        <blockquote className="mt-4 border-l-2 border-bronze-400 pl-4 italic text-muted-foreground">
          "He taonga te data i tangohia mai i te tangata, i te mea ora."
          <footer className="mt-2 not-italic text-sm">— Moe Milne, Ngāti Hine</footer>
        </blockquote>
        <p className="mt-6 text-sm text-muted-foreground">
          Source: <a className="text-bronze-300 hover:text-bronze-200 underline" href="https://www.temanararaunga.maori.nz/our-charter" rel="noreferrer">Te Mana Raraunga Charter</a>.
        </p>
      </section>

      <section id="local-contexts" className="not-prose mt-16">
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="outline" className="mb-0">Machine-readable provenance</Badge>
        </div>
        <h2 className="font-display text-2xl">Local Contexts Hub integration</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Anamata Kāhui is integrated with the{" "}
          <a
            href="https://localcontexts.org"
            target="_blank"
            rel="noreferrer"
            className="text-bronze-300 hover:text-bronze-200 underline"
          >
            Local Contexts Hub
          </a>{" "}
          — the international standard for Traditional Knowledge (TK),
          Biocultural (BC), and notice labels. Every waiata, stem, and
          research paper can carry machine-readable provenance metadata
          that travels with the file.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Database className="h-5 w-5 text-pounamu-300" />
              <CardTitle className="text-lg">11 TK labels</CardTitle>
              <CardDescription>
                Traditional Knowledge usage protocols. TK Attribution,
                Non-Commercial, Clan, Family, Outreach, Verified, Creative,
                Secret/Sacred, plus gender / age gates.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Globe className="h-5 w-5 text-bronze-300" />
              <CardTitle className="text-lg">5 BC labels</CardTitle>
              <CardDescription>
                Biocultural origin. BC Provenance, BC Consent Verified,
                BC Open to Collaboration, BC Consent Optional, BC Creative.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Shield className="h-5 w-5 text-bronze-300" />
              <CardTitle className="text-lg">5 Notices</CardTitle>
              <CardDescription>
                Researcher / community / kaitiaki notices. Open with CARE,
                Open with Attribution, Research Only, Community Voice,
                Kaitiaki Consultation.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-8">
          <LocalContextsExplainer />
        </div>

        <div className="mt-8 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-6">
          <h3 className="font-display text-lg">How labels travel with assets</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Labels attached to a release are emitted as{" "}
            <strong>XMP (Extensible Metadata Platform) metadata</strong> in
            PDFs, audio files, and image exports. Adobe tools, DaVinci
            Resolve, web crawlers, and archival systems all parse XMP.
            The labels therefore persist with the file wherever it goes —
            not locked inside the platform.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Active labels are also visible to every visitor on the
            relevant public page (e.g.{" "}
            <a href="/waiata" className="text-bronze-300 hover:text-bronze-200 underline">
              /waiata
            </a>
            ,{" "}
            <a href="/research/papers" className="text-bronze-300 hover:text-bronze-200 underline">
              /research/papers
            </a>
            ) — funders and partners can verify provenance without
            signing in.
          </p>
        </div>
      </section>
    </article>
  );
}
