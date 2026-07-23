import Link from "next/link";
import { ArrowRight, BookOpen, Code2, Music, Palette } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BRANCHES } from "@/lib/branches";
import type { BranchSlug } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/clients";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anamatakahui.co.nz";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: { absolute: "Anamata Kāhui" },
    description: t("lede").slice(0, 160),
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: { en: `${SITE_URL}/en`, mi: `${SITE_URL}/mi` },
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/${locale}`,
      siteName: "Anamata Kāhui",
      title: "Anamata Kāhui",
      description: t("lede").slice(0, 160),
      locale: locale === "mi" ? "mi_NZ" : "en_NZ",
      alternateLocale: locale === "mi" ? "en_NZ" : "mi_NZ",
    },
  };
}

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

export const revalidate = 60;

export default async function HomePage() {
  const t = await getTranslations("home");
  const tBranch = await getTranslations("branch");
  const admin = createAdminClient();
  const [released, iwiGates] = await Promise.all([
    admin.from("releases").select("id", { count: "exact", head: true }).eq("status", "released"),
    admin.from("iwi_gates").select("id", { count: "exact", head: true }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <Badge variant="outline" className="mb-6">
            {t("eyebrow")}
          </Badge>
          <h1 className="max-w-3xl text-balance text-5xl font-display font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            {t.rich("heroLine", {
              br: () => <br />,
              accent: (chunks) => <span className="text-bronze-300">{chunks}</span>,
            })}
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t("lede")}
          </p>

          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
            <Stat label={t("stats.released")} value={released.count ?? 0} />
            <Stat label={t("stats.iwiGates")} value={iwiGates.count ?? 0} />
            <Stat label={t("stats.liveBranches")} value={BRANCHES.length} />
          </dl>

          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                {t("joinCta")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/records">{t("exploreCta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Branch cards */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-3xl font-display font-semibold tracking-tight sm:text-4xl">
            {t("branchesTitle")}
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
                <Link href="/press">Press & Funder Pack</Link>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-display text-3xl font-semibold text-bronze-300">
        {value}
      </dd>
    </div>
  );
}
