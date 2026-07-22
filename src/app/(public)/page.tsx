import Link from "next/link";
import { ArrowRight, BookOpen, Code2, Music, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BRANCHES } from "@/lib/branches";
import type { BranchSlug } from "@/lib/types";

const BRANCH_HOMES: Record<BranchSlug, string> = {
  records:  "/records",
  research: "/research",
  arts:     "/arts",
  dev:      "/dev",
};

const ICONS = {
  records: Music,
  research: BookOpen,
  arts: Palette,
  dev: Code2,
} as const;

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <Badge variant="outline" className="mb-6">
            Aotearoa · Māori-led ecosystem
          </Badge>
          <h1 className="max-w-3xl text-balance text-5xl font-display font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Four branches.<br />
            <span className="text-bronze-300">One kāhui.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Anamata Kāhui is the collective platform unifying Anamata Records,
            Research & Language Preservation, Creative Arts, and Technology &
            Development. Built for artists, researchers, and clients who want
            everything in one place — and nothing held back.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                Join the Kāhui <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/records">Explore Anamata Records</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Branch cards */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-3xl font-display font-semibold tracking-tight sm:text-4xl">
            The four branches
          </h2>
          <p className="mt-4 text-muted-foreground">
            Each branch has its own team, tooling, and dashboard — but they all
            share the same auth, the same data model, and the same cultural
            foundation.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {BRANCHES.map((branch) => {
            const Icon = ICONS[branch.slug];
            return (
              <Card key={branch.slug} className="group transition-colors hover:border-bronze-500/50">
                <CardHeader>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-bronze-400/10 text-bronze-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{branch.name}</CardTitle>
                  <CardDescription>{branch.description}</CardDescription>
                </CardHeader>
                <div className="px-6 pb-6">
                  <Link
                    href={BRANCH_HOMES[branch.slug]}
                    className="inline-flex items-center gap-1 text-sm font-medium text-bronze-300 hover:text-bronze-200"
                  >
                    Visit branch <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Footer-style closer */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h3 className="text-2xl font-display font-semibold tracking-tight">
                Built on Supabase + Next.js. Deployed on Vercel.
              </h3>
              <p className="mt-3 text-muted-foreground">
                Row-level security scopes every record to its owner. Branch
                membership controls the dashboards you see. Public routes stay
                fast with edge caching.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button asChild variant="secondary">
                <Link href="/about">About the Kāhui</Link>
              </Button>
              <Button asChild>
                <Link href="/contact">Get in touch</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
