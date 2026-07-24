import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KaikoreroDirectoryFilters } from "@/components/kaikorero/directory-filters";
import { DOMAIN_LABEL, KNOWLEDGE_DOMAINS, type KnowledgeDomain } from "@/lib/kaikorero/types";

export const revalidate = 600;
export const metadata = { title: "Kaikōrero directory" };

interface SearchParams {
  domain?: string;
  iwi?: string;
}

/**
 * /[locale]/artist — public Kaikōrero directory.
 *
 * Surfaces profiles that have opted into BOTH the public directory
 * (existing `opted_in_public_directory` flag) AND the Kaikōrero
 * visibility flag. Each profile must have at least one knowledge area
 * to appear in this list — empty profiles don't help discovery.
 *
 * Filters (server-side via URL search params):
 *   - ?domain=purakau — filter to profiles with that knowledge area
 *   - ?iwi=Ngāti+Porou — filter to profiles with attested affiliation to that iwi
 *
 * v1 ships with ≤100 profiles expected; server-side filtering is fine.
 * If the directory grows, switch to a materialized view or full-text search.
 */
export default async function ArtistIndexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const admin = createAdminClient();

  // Validate the domain filter against the enum so a junk URL just returns
  // the unfiltered list rather than throwing.
  const domainFilter =
    params.domain && (KNOWLEDGE_DOMAINS as readonly string[]).includes(params.domain)
      ? (params.domain as KnowledgeDomain)
      : undefined;
  const iwiFilter = params.iwi?.trim() || undefined;

  // Step 1: get all public-visible profiles.
  // Both opt-in flags must be true (mirrors the [id] page's gates).
  const profilesQuery = admin
    .from("profiles")
    .select(
      "id, full_name, bio, role, kaikorero_bio, avatar_url, iwi_affiliation_attested, iwi_affiliation_claimed, contribution_count",
    )
    .eq("opted_in_public_directory", true)
    .eq("kaikorero_visible", true)
    .order("full_name");

  const { data: profiles } = await profilesQuery;

  // Step 2: load knowledge areas for the filtered profile set.
  const profileIds = (profiles ?? []).map((p) => p.id);
  let knowledgeByProfile = new Map<string, { domain: KnowledgeDomain; scope_iwi: string | null; scope_region: string | null }[]>();

  if (profileIds.length > 0) {
    let kaQuery = admin
      .from("profile_knowledge_areas")
      .select("profile_id, domain, scope_iwi, scope_region")
      .in("profile_id", profileIds)
      .order("attested_at", { ascending: true });

    if (domainFilter) {
      kaQuery = kaQuery.eq("domain", domainFilter);
    }
    if (iwiFilter) {
      // iwi_specific search: match against scope_iwi OR attested iwi list
      // Using OR via the filter on scope_iwi alone; the attested-iwi
      // overlap is filtered after the join below.
      kaQuery = kaQuery.ilike("scope_iwi", iwiFilter);
    }

    const { data: knowledgeAreas } = await kaQuery;

    for (const ka of knowledgeAreas ?? []) {
      const arr = knowledgeByProfile.get(ka.profile_id) ?? [];
      arr.push({
        domain: ka.domain as KnowledgeDomain,
        scope_iwi: ka.scope_iwi,
        scope_region: ka.scope_region,
      });
      knowledgeByProfile.set(ka.profile_id, arr);
    }
  }

  // Step 3: filter profiles by what's left.
  let filteredProfiles = profiles ?? [];

  if (domainFilter || iwiFilter) {
    filteredProfiles = filteredProfiles.filter((p) => {
      const kas = knowledgeByProfile.get(p.id);
      if (!kas || kas.length === 0) return false;
      // Domain filter: at least one knowledge area must match the requested domain.
      // (Already enforced by the SQL filter above — but defensive.)
      if (domainFilter && !kas.some((ka) => ka.domain === domainFilter)) return false;
      // Iwi filter: scope_iwi match OR attested iwi contains it.
      if (iwiFilter) {
        const attested = (p.iwi_affiliation_attested as string[] | null) ?? [];
        const scopeMatch = kas.some((ka) =>
          ka.scope_iwi?.toLowerCase().includes(iwiFilter.toLowerCase()),
        );
        const attestedMatch = attested.some((iwi) =>
          iwi.toLowerCase().includes(iwiFilter.toLowerCase()),
        );
        if (!scopeMatch && !attestedMatch) return false;
      }
      return true;
    });
  } else {
    // No filter: only show profiles that have at least one knowledge area.
    // Empty profiles don't help discovery.
    filteredProfiles = filteredProfiles.filter((p) =>
      knowledgeByProfile.has(p.id) && (knowledgeByProfile.get(p.id) ?? []).length > 0,
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Public directory</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        Kaikōrero directory
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Members of the kāhui who carry cultural knowledge across iwi.
        Discovery works by filter — find someone who carries the
        pūrākau, reo, or tikanga you're looking for, scoped to the
        iwi or region where they hold standing.
      </p>

      {/* Filters */}
      <KaikoreroDirectoryFilters
        domainOptions={KNOWLEDGE_DOMAINS}
        activeDomain={domainFilter}
        activeIwi={iwiFilter}
        domainLabel={DOMAIN_LABEL}
      />

      {/* Results */}
      {filteredProfiles.length === 0 ? (
        <Card className="mt-12 border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground italic">
            {domainFilter || iwiFilter
              ? "No kaikōrero match these filters. Try widening the iwi search or removing the domain filter."
              : "No public-directory profiles yet. Members can opt in via the dashboard Kaikōrero profile editor."}
          </CardContent>
        </Card>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map((p) => {
            const kas = knowledgeByProfile.get(p.id) ?? [];
            const attested = (p.iwi_affiliation_attested as string[] | null) ?? [];
            const claimed = (p.iwi_affiliation_claimed as string[] | null) ?? [];
            const isNewContributor =
              (p.contribution_count as number | null) !== null &&
              (p.contribution_count as number) < 3;
            return (
              <Link key={p.id} href={`/[locale]/artist/${p.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-bronze-500/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bronze-400/15 font-display text-lg font-semibold text-bronze-200">
                        {p.full_name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-lg">
                          {p.full_name ?? "Kāhui member"}
                        </CardTitle>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Badge variant="outline" className="capitalize text-xs">
                            {p.role}
                          </Badge>
                          {isNewContributor && (
                            <Badge variant="outline" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {(p.kaikorero_bio ?? p.bio) && (
                      <CardDescription className="line-clamp-3">
                        {p.kaikorero_bio ?? p.bio}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Knowledge areas — top 3 */}
                    {kas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {kas.slice(0, 3).map((ka, idx) => {
                          const label = ka.scope_iwi
                            ? `${DOMAIN_LABEL[ka.domain]} · ${ka.scope_iwi}`
                            : DOMAIN_LABEL[ka.domain];
                          return (
                            <Badge
                              key={`${ka.domain}-${idx}`}
                              variant="secondary"
                              className="text-xs"
                            >
                              {label}
                            </Badge>
                          );
                        })}
                        {kas.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{kas.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    {/* Iwi — attested first, claimed next */}
                    {(attested.length > 0 || claimed.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {attested.slice(0, 2).map((iwi) => (
                          <Badge key={`a-${iwi}`} variant="secondary" className="text-xs">
                            {iwi}
                          </Badge>
                        ))}
                        {claimed.slice(0, 2).map((iwi) => (
                          <Badge key={`c-${iwi}`} variant="outline" className="text-xs">
                            {iwi}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-end text-xs text-bronze-300 opacity-0 transition-opacity group-hover:opacity-100">
                      View kaikōrero
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
