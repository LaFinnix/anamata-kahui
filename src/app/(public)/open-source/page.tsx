import Link from "next/link";
import { Github, BookOpen, Code2, Heart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Open source" };

/**
 * Open-source positioning — differentiator per audit §2.7.
 *
 * Positions the Kāhui platform as cultural infrastructure that iwi /
 * hapū / community organisations can self-host. No NZ music label
 * currently makes this claim.
 */
export default function OpenSourcePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Positioning</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        The platform is open source
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Anamata Kāhui is built with open-source tools and the platform
        itself is released under a permissive licence. iwi, hapū, and
        community organisations can self-host the same infrastructure.
      </p>

      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <Github className="h-5 w-5 text-bronze-300" />
            <CardTitle>Source code</CardTitle>
            <CardDescription>
              Next.js 16 + React 19 + TypeScript + Supabase + Tailwind.
              Released under MIT.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="https://github.com/LaFinnix/anamata-kahui"
              className="text-sm font-medium text-bronze-300 hover:text-bronze-200 underline"
            >
              github.com/LaFinnix/anamata-kahui →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <BookOpen className="h-5 w-5 text-bronze-300" />
            <CardTitle>Documentation</CardTitle>
            <CardDescription>
              README covers GitHub → Vercel deploy and the full
              <code> .co.nz</code> DNS playbook for the apex + subdomains.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="https://github.com/LaFinnix/anamata-kahui#readme"
              className="text-sm font-medium text-bronze-300 hover:text-bronze-200 underline"
            >
              Read the README →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Code2 className="h-5 w-5 text-bronze-300" />
            <CardTitle>Self-host for your iwi</CardTitle>
            <CardDescription>
              Fork the repo. Point Supabase at your own project. Deploy
              on Vercel under your domain. You own the data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="text-xs text-muted-foreground">
              npx supabase link --project-ref &lt;your-ref&gt;
            </code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Heart className="h-5 w-5 text-bronze-300" />
            <CardTitle>Contributing</CardTitle>
            <CardDescription>
              Bug reports, accessibility improvements, and te reo Māori
              translations all welcome.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="https://github.com/LaFinnix/anamata-kahui/issues"
              className="text-sm font-medium text-bronze-300 hover:text-bronze-200 underline"
            >
              Open an issue →
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl">Why this matters for funders</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Open-source infrastructure is a long-term capability multiplier. A
          grant that funds this platform builds public-good infrastructure
          that other iwi can adopt. The same Creative NZ "investment feature
          outcomes" framework that scored the 2026 application also rewards
          systemic rather than one-off impact — open-source releases are the
          strongest possible evidence of systemic intent.
        </p>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          NZ On Air's 2026 language explicitly rewards projects that
          "leverage digital technologies" and "drive innovation in the
          sector". Open-source release of a working cultural-infrastructure
          platform is the literal fulfilment of that language.
        </p>
      </section>
    </div>
  );
}
