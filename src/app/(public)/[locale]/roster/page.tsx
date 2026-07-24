import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Users,
  Sparkles,
  Music,
  BookOpen,
  Palette,
  Code2,
  ArrowRight,
  Info,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { listPublicRoster, countPublicRoster } from "@/lib/artist-roster/public-queries";

export const revalidate = 600; // 10-minute refresh
export const metadata = { title: "Roster · Anamata Kāhui" };

/**
 * /[locale]/roster — the public artist roster.
 *
 * Shows the signed-artist roster across all branches. Filterable by
 * branch. Only artists who have explicitly opted in to public display
 * (on_roster_publicly + opted_in_public, status=active) appear here.
 *
 * Cultural integrity: this is the "small-pool pressure" defence.
 * Showing the WHO of the roster publicly could amplify individual
 * influence, so we only show those who consent, and we don't show
 * counts/rankings — just names + role + branch.
 */
export default async function PublicRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const t = await getTranslations("publicRoster");
  const params = await searchParams;
  const branchFilter = params.branch as
    | "records"
    | "research"
    | "arts"
    | "dev"
    | undefined;

  const [roster, counts] = await Promise.all([
    listPublicRoster(branchFilter ? { branchSlug: branchFilter } : {}),
    countPublicRoster(),
  ]);

  const branchChips: Array<{
    slug: "records" | "research" | "arts" | "dev";
    name: string;
    icon: typeof Music;
    count: number;
  }> = [
    {
      slug: "records",
      name: t("branchRecords"),
      icon: Music,
      count: counts.byBranch.find((c) => c.branch_slug === "records")?.count ?? 0,
    },
    {
      slug: "research",
      name: t("branchResearch"),
      icon: BookOpen,
      count: counts.byBranch.find((c) => c.branch_slug === "research")?.count ?? 0,
    },
    {
      slug: "arts",
      name: t("branchArts"),
      icon: Palette,
      count: counts.byBranch.find((c) => c.branch_slug === "arts")?.count ?? 0,
    },
    {
      slug: "dev",
      name: t("branchDev"),
      icon: Code2,
      count: counts.byBranch.find((c) => c.branch_slug === "dev")?.count ?? 0,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">{t("badge")}</Badge>
        </div>
        <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {t("lede")}
        </p>
      </div>

      {/* Why this exists / privacy note */}
      <Card className="mt-8 border-bronze-500/30 bg-bronze-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-bronze-300" />
          <div className="text-sm">
            <p className="font-medium">{t("noteTitle")}</p>
            <p className="mt-1 text-muted-foreground">{t("noteBody")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Branch filter chips */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          <BranchChip
            href={"/roster"}
            active={!branchFilter}
            label={t("allBranches")}
            count={counts.total}
          />
          {branchChips.map((b) => (
            <BranchChip
              key={b.slug}
              href={`/roster?branch=${b.slug}`}
              active={branchFilter === b.slug}
              label={b.name}
              count={b.count}
              Icon={b.icon}
            />
          ))}
        </div>
      </section>

      {/* Roster list */}
      <section className="mt-10">
        {roster.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <Sparkles className="h-8 w-8 text-bronze-300" />
              <h2 className="font-display text-xl">{t("emptyTitle")}</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                {t("emptyBody")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roster.map((entry) => (
              <li key={entry.id}>
                <RosterCard entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BranchChip({
  href,
  active,
  label,
  count,
  Icon,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  Icon?: typeof Music;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-bronze-400 bg-bronze-500/10"
          : "border-border bg-card hover:border-bronze-400/30"
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </Link>
  );
}

function RosterCard({
  entry,
}: {
  entry: import("@/lib/artist-roster/public-queries").PublicRosterEntry;
}) {
  const name =
    entry.profile.full_name?.trim() || `(unnamed ${entry.profile.id.slice(0, 8)})`;
  return (
    <Card className="group h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">
            <Link
              href={`/artist/${entry.profile.id}`}
              className="hover:underline"
            >
              {name}
            </Link>
          </CardTitle>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        {entry.role_summary && (
          <CardDescription className="mt-1">{entry.role_summary}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {entry.branch.name}
          </Badge>
          {entry.profile.iwi_affiliation_attested && entry.profile.iwi_affiliation_attested.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Iwi: {entry.profile.iwi_affiliation_attested.join(", ")}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Joined {new Date(entry.joined_at).toLocaleDateString("en-NZ")}
        </p>
      </CardContent>
    </Card>
  );
}
