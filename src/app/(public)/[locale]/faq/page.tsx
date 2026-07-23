import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Metadata } from "next";
import { HelpCircle, BookOpen, Music, Building2, ShieldCheck, Languages, GitBranch } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "FAQ · Anamata Kāhui",
    description:
      "Common questions about Anamata Kāhui — the cultural-platform collective unifying music, research, creative arts, and technology for Aotearoa.",
    alternates: {
      canonical: `/${locale}/faq`,
      languages: {
        en: "/en/faq",
        mi: "/mi/faq",
      },
    },
  };
}

interface FAQItem {
  q: string;
  a: React.ReactNode;
}

interface FAQCategory {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  items: FAQItem[];
}

const FAQ: FAQCategory[] = [
  {
    title: "About Anamata Kāhui",
    description: "What the platform is, who it's for, and how it's governed.",
    icon: HelpCircle,
    items: [
      {
        q: "What is Anamata Kāhui?",
        a: (
          <>
            Anamata Kāhui is a collective platform unifying four branches
            of work for Aotearoa: <Link href="/records" className="text-bronze-300 hover:text-bronze-200 underline">Anamata Records</Link> (music label),{" "}
            <Link href="/research" className="text-bronze-300 hover:text-bronze-200 underline">Research & Language Preservation</Link>,{" "}
            <Link href="/arts" className="text-bronze-300 hover:text-bronze-200 underline">Creative Arts</Link>, and{" "}
            <Link href="/dev" className="text-bronze-300 hover:text-bronze-200 underline">Technology & Development</Link>.
            {" "}It runs entirely on infrastructure we own and operate. The platform itself is open source at{" "}
            <a
              href="https://github.com/LaFinnix/anamata-kahui"
              target="_blank"
              rel="noreferrer"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              github.com/LaFinnix/anamata-kahui
            </a>.
          </>
        ),
      },
      {
        q: "Is this a music label, a research project, a tech platform, or what?",
        a: (
          <>
            All four. The Kāhui (collective) structure means each branch
            has its own purpose, but they share infrastructure, governance,
            and an audience. The platform is one place; the four branches
            are four ways to engage with the work.
          </>
        ),
      },
      {
        q: "Who is this for?",
        a: (
          <>
            Researchers, musicians, kaitiaki, designers, and developers
            working on indigenous data governance, music metadata, or
            cultural-platform publishing. Also: anyone who wants to read
            the long-form research on{" "}
            <Link href="/reads" className="text-bronze-300 hover:text-bronze-200 underline">/reads</Link>{" "}
            or the time-sensitive updates on{" "}
            <Link href="/news" className="text-bronze-300 hover:text-bronze-200 underline">/news</Link>.
          </>
        ),
      },
    ],
  },
  {
    title: "Music & cultural metadata",
    description: "How Anamata Records treats waiata, iwi consent, and Local Contexts labels.",
    icon: Music,
    items: [
      {
        q: "What is the cultural-fidelity metadata schema?",
        a: (
          <>
            Every release includes not just standard fields (title, ISRC,
            duration) but also: kinds (mihi, waiata, haka, poi), cultural
            flags (e.g. iwi_consent_required), iwi_consent (linked to the
            iwi who consented, scope, when), and Local Contexts labels
            (TK Attribution, BC Provenance, Caring notice). The schema is
            described in detail at <Link href="/governance" className="text-bronze-300 hover:text-bronze-200 underline">/governance</Link>.
          </>
        ),
      },
      {
        q: "What is Local Contexts?",
        a: (
          <>
            Local Contexts is a non-profit that maintains 42 standard
            labels for indigenous data. Anamata Kāhui is wired to the
            Hub as an Integration Partner, which means our labels
            (TK Attribution, BC Provenance, Caring notice, etc.) are
            canonical and linked to the Hub. See{" "}
            <Link href="/kaitiakitanga" className="text-bronze-300 hover:text-bronze-200 underline">/kaitiakitanga</Link>{" "}
            for our governance approach.
          </>
        ),
      },
      {
        q: "How is iwi consent handled?",
        a: (
          <>
            Every waiata that requires iwi consent has a linked iwi_gates
            row with the iwi name, scope (e.g. release-wide), and granted
            date. Releases cannot transition to <code className="font-mono">status=scheduled</code> or{" "}
            <code className="font-mono">status=released</code> unless{" "}
            <code className="font-mono">cultural_review_status=approved</code>{" "}
            — enforced by a PostgreSQL trigger, not application code.
          </>
        ),
      },
    ],
  },
  {
    title: "Funding & access",
    description: "Who pays for this, and who can use the tools.",
    icon: Building2,
    items: [
      {
        q: "Who funds Anamata Kāhui?",
        a: (
          <>
            The platform tracks active applications at{" "}
            <Link href="/funding" className="text-bronze-300 hover:text-bronze-200 underline">/funding</Link>{" "}
            and the funder-facing brief at{" "}
            <Link href="/for-funders" className="text-bronze-300 hover:text-bronze-200 underline">/for-funders</Link>.
            The funder pack PDF is at{" "}
            <Link href="/press/funder-kit.pdf" className="text-bronze-300 hover:text-bronze-200 underline">/press/funder-kit.pdf</Link>.
          </>
        ),
      },
      {
        q: "Are the dev tools really free?",
        a: (
          <>
            Yes. The cron parser, JSON viewer/diff, and regex playground
            at <Link href="/dev/tools" className="text-bronze-300 hover:text-bronze-200 underline">/dev/tools</Link>{" "}
            run entirely in your browser. No accounts, no API calls, no
            tracking. They're useful well beyond the Anamata context —
            the goal is to be the cleanest version of these tools on the
            web, not to capture leads.
          </>
        ),
      },
      {
        q: "Can I sign up?",
        a: (
          <>
            Yes —{" "}
            <Link href="/register" className="text-bronze-300 hover:text-bronze-200 underline">/register</Link>{" "}
            creates an account. Currently only the Anamata Records label
            is on the platform, but the structure is designed for multiple
            labels and partners.
          </>
        ),
      },
    ],
  },
  {
    title: "Privacy & data",
    description: "What data we keep, what we don't, and your rights.",
    icon: ShieldCheck,
    items: [
      {
        q: "What data do you collect?",
        a: (
          <>
            Just what's needed to run the platform: account info (email,
            name), content you create (drafts, releases, comments), and
            standard request logs. See{" "}
            <Link href="/legal/privacy-notice" className="text-bronze-300 hover:text-bronze-200 underline">/legal/privacy-notice</Link>{" "}
            for the full statement. Manage your data at{" "}
            <Link href="/privacy-controls" className="text-bronze-300 hover:text-bronze-200 underline">/privacy-controls</Link>.
          </>
        ),
      },
      {
        q: "How is iwi consent data stored?",
        a: (
          <>
            iwi_consent records are stored in a separate <code className="font-mono">iwi_gates</code> table
            with append-only <code className="font-mono">consent_log</code> and <code className="font-mono">data_governance_log</code>{" "}
            audit trails. Anyone with branch access can read iwi consent
            state, but only kaitiaki (cultural reviewers) and super admins
            can modify it. The cultural-review UI is at{" "}
            <Link href="/admin/kaitiaki" className="text-bronze-300 hover:text-bronze-200 underline">/admin/kaitiaki</Link>.
          </>
        ),
      },
      {
        q: "What if I want my data deleted?",
        a: (
          <>
            Sign in and go to{" "}
            <Link href="/privacy-controls" className="text-bronze-300 hover:text-bronze-200 underline">/privacy-controls</Link>{" "}
            for the self-service data subject rights tool. The full data
            subject rights process (NZ Privacy Act 2020 compliant) is
            documented at{" "}
            <Link href="/legal/privacy-notice" className="text-bronze-300 hover:text-bronze-200 underline">/legal/privacy-notice</Link>.
          </>
        ),
      },
    ],
  },
  {
    title: "Open source & code",
    description: "How the platform is built and how to inspect it.",
    icon: GitBranch,
    items: [
      {
        q: "Is Anamata Kāhui open source?",
        a: (
          <>
            Yes. Source at{" "}
            <a
              href="https://github.com/LaFinnix/anamata-kahui"
              target="_blank"
              rel="noreferrer"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              github.com/LaFinnix/anamata-kahui
            </a>. Stack: Next.js 16 + Supabase (Postgres + RLS + Storage) +
            Tailwind v4 + shadcn/ui. See{" "}
            <Link href="/dev" className="text-bronze-300 hover:text-bronze-200 underline">/dev</Link>{" "}
            for a stack audit.
          </>
        ),
      },
      {
        q: "What about the auto-generated research articles?",
        a: (
          <>
            They're drafted via the{" "}
            <Link href="/reads" className="text-bronze-300 hover:text-bronze-200 underline">/reads</Link>{" "}
            system. The model (Claude 3.5 Sonnet via OpenRouter) is
            prompted with cultural-fidelity rules, and the output is
            scrubbed for AI tells before publication. Every draft is
            human-edited before it goes live. See{" "}
            <Link href="/transparency" className="text-bronze-300 hover:text-bronze-200 underline">/transparency</Link>{" "}
            for the methodology.
          </>
        ),
      },
    ],
  },
  {
    title: "Te reo Māori & translation",
    description: "Bilingual support and what's in scope for translation.",
    icon: Languages,
    items: [
      {
        q: "Is Anamata Kāhui bilingual?",
        a: (
          <>
            Partially. Some pages (cookie banner, three legal pages,
            /about, /waiata, /for-funders, contact form) are wired with
            te reo Māori translations via <code className="font-mono">useTranslations</code>.
            The other 28 public pages still show English body content
            under <code className="font-mono">/mi/...</code> URLs. Translations are
            in progress.
          </>
        ),
      },
      {
        q: "What about the long legal pages?",
        a: (
          <>
            The legal prose (privacy notice, cookie policy, terms) has a
            te reo Māori summary block at the top of each page. Full
            bilingual legal prose requires a professional human
            translator and is a separate budget item.
          </>
        ),
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Common questions</Badge>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        FAQ
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Common questions about Anamata Kāhui — what it is, how it
        works, who funds it, and how to engage.
      </p>

      <div className="mt-12 space-y-10">
        {FAQ.map((category) => {
          const Icon = category.icon;
          return (
            <section key={category.title}>
              <div className="mb-4 flex items-center gap-2">
                <Icon className="h-5 w-5 text-bronze-300" />
                <h2 className="font-display text-2xl">{category.title}</h2>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                {category.description}
              </p>
              <div className="space-y-3">
                {category.items.map((item, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <CardTitle className="text-base font-medium">
                        {item.q}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.a}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Card className="mt-12 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-bronze-300" />
            More questions?
          </CardTitle>
          <CardDescription>
            These are the questions we get most often. If you have
            a specific one not covered here, contact us at{" "}
            <Link
              href="/contact"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              /contact
            </Link>.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}