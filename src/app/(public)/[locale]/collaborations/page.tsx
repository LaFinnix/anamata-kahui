import Link from "next/link";
import { Megaphone, ArrowRight, Users } from "lucide-react";

import {
  listPublicCollaborationActivity,
  getCollaborationStats,
  type CollaborationFilters,
} from "@/lib/queries/collaborations";
import { CollaborationsFilters } from "@/components/collaborations/collaborations-filters";
import { CollaborationActivityRow } from "@/components/collaborations/collaboration-activity-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DOMAIN_LABEL, KNOWLEDGE_DOMAINS, type KnowledgeDomain } from "@/lib/kaikorero/types";

export const revalidate = 300;
export const metadata = {
  title: "Collaborations · Anamata Kāhui",
  description:
    "Public view of cross-iwi collaboration activity: endorsements given and received, and resolved tono across the kāhui.",
};

interface SearchParams {
  kind?: "endorsement" | "tono" | "all";
  domain?: string;
  iwi?: string;
}

/**
 * /[locale]/collaborations — public index of cross-iwi collaboration activity.
 *
 * Cultural-integrity rules:
 *   - Only resolved tono (fulfilled / closed / withdrawn) appear. Open and
 *     in_conversation stay dashboard-private.
 *   - Only tono with visibility='open' surface here. iwi_specific and invited
 *     tono appear only on the relevant profiles.
 *   - Endorsements are public by design — both active and revoked (revoked
 *     carries a status badge; never hidden).
 *   - No aggregate counts on individuals. Community-wide counts (total
 *     endorsements, total resolved tono) appear in the page header as
 *     context for the kāhui.
 *   - Strict chronological ordering, no ranking.
 */
export default async function CollaborationsIndexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const filters: CollaborationFilters = {
    kind: params.kind && ["endorsement", "tono", "all"].includes(params.kind)
      ? params.kind
      : "all",
    knowledgeDomain:
      params.domain && (KNOWLEDGE_DOMAINS as readonly string[]).includes(params.domain)
        ? (params.domain as KnowledgeDomain)
        : null,
    iwi: params.iwi?.trim() || null,
  };

  const [entries, stats] = await Promise.all([
    listPublicCollaborationActivity(filters),
    getCollaborationStats(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-bronze-300">
          <Users className="h-4 w-4" />
          Cross-iwi collaboration
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Collaborations across the kāhui
        </h1>
        <p className="text-muted-foreground">
          Endorsements given and received, and resolved help requests between
          kaikōrero across iwi. This index shows the contribution lineage that
          holds the kāhui together — append-only, revocable, and never ranked.
        </p>
      </header>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Total endorsements" value={stats.totalEndorsements} />
        <StatTile label="Resolved tono" value={stats.totalResolvedTono} />
        <StatTile label="Browse kaikōrero" value="→" href={"/artist"} />
      </div>

      {/* Filters */}
      <CollaborationsFilters
        domainOptions={KNOWLEDGE_DOMAINS}
        domainLabel={DOMAIN_LABEL}
        activeKind={filters.kind ?? "all"}
        activeDomain={filters.knowledgeDomain ?? null}
        activeIwi={filters.iwi ?? null}
      />

      {/* Activity list */}
      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">No public collaboration activity yet</CardTitle>
            <CardDescription>
              Endorsements and resolved tono appear here as they happen. As
              the kāhui grows, this index will fill in with the cultural
              lineage that holds it together.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/[locale]/artist"
              className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
            >
              Browse the Kaikōrero directory
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <CollaborationActivityRow key={entry.key} entry={entry} />
          ))}
        </div>
      )}

      {/* Cultural transparency note */}
      <div className="mt-8 rounded-lg border border-bronze-400/30 bg-bronze-400/5 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <Megaphone className="h-4 w-4 text-bronze-300" />
          What you see here
        </div>
        <p className="mt-1">
          Endorsements are public and append-only — once given, the only
          change is revocation (with reason). Tono are private while open
          and only appear here once they&rsquo;ve been resolved. We do not rank,
          score, or surface aggregate counts on individuals.
        </p>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href?: string;
}) {
  const inner = (
    <Card className="transition-colors hover:bg-muted/30">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}
