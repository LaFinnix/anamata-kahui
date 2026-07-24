import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Hash, Music, Shield } from "lucide-react";
import type { Metadata } from "next";

import { createAdminClient, createServerSupabase } from "@/lib/supabase/clients";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalContextsLabels } from "@/components/local-contexts/labels-display";
import { CulturalProvenanceHero } from "@/components/local-contexts/cultural-provenance-hero";
import { LocalContextsExplainer } from "@/components/local-contexts/explainer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anamatakahui.co.nz";

export const revalidate = 300; // refresh every 5 minutes

/**
 * Pre-render the slug list at build time using the service-role client.
 * Using createAdminClient avoids the cookies() call that runs at request time
 * — generateStaticParams executes at build time without an HTTP request, so
 * it can't use the regular server client that reads cookies.
 */
export async function generateStaticParams() {
  const admin = createAdminClient();
  const { data: released } = await admin
    .from("releases")
    .select("metadata")
    .eq("status", "released");

  return (released ?? [])
    .map((r) => (r.metadata as { slug?: string })?.slug)
    .filter((s): s is string => typeof s === "string")
    .map((slug) => ({ slug }));
}

/**
 * Per-waiata metadata — title, description, OG tags.
 *
 * Uses admin client (no cookie required) so it runs cleanly at build time
 * alongside generateStaticParams. Returns sensible defaults if the slug
 * isn't found (which would also trigger notFound()).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const admin = createAdminClient();
  const { data: release } = await admin
    .from("releases")
    .select("title, description, release_date, metadata")
    .eq("status", "released")
    .eq("metadata->>slug", slug)
    .maybeSingle();

  if (!release) {
    return {
      title: "Waiata not found",
      robots: { index: false, follow: false },
    };
  }

  const gloss =
    (release.metadata as { english_gloss?: string } | null)?.english_gloss ?? "";

  const description =
    release.description?.slice(0, 160) ??
    `${release.title}${gloss ? ` — ${gloss}` : ""}`;

  return {
    title: release.title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/waiata/${slug}`,
      languages: {
        en: `${SITE_URL}/en/waiata/${slug}`,
        mi: `${SITE_URL}/mi/waiata/${slug}`,
      },
    },
    openGraph: {
      type: "music.song",
      url: `${SITE_URL}/${locale}/waiata/${slug}`,
      siteName: "Anamata Kāhui",
      title: release.title,
      description,
      locale: locale === "mi" ? "mi_NZ" : "en_NZ",
      alternateLocale: locale === "mi" ? "en_NZ" : "mi_NZ",
    },
  };
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function WaiataPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabase();

  // Public read of released releases via the existing RLS policy
  // `releases_select_public`. We also pull the linked iwi_consent_id gate
  // so the cultural context is visible.
  const { data: release, error } = await supabase
    .from("releases")
    .select(
      "id, title, description, status, language_code, cultural_sensitivity, metadata, iwi_consent_id, release_date, upc, isrc, created_at",
    )
    .eq("metadata->>slug", slug)
    .eq("status", "released")
    .maybeSingle();

  if (error || !release) {
    notFound();
  }

  // Fetch the linked iwi gate if any.
  const { data: gate } = release.iwi_consent_id
    ? await supabase
        .from("iwi_gates")
        .select("iwi_name, scope, notes")
        .eq("id", release.iwi_consent_id)
        .maybeSingle()
    : { data: null };

  // Local Contexts labels for this release (active only, public-readable)
  const { data: labelLinks } = await supabase
    .from("lc_label_links")
    .select(
      "id, release_id, research_document_id, label_id, applied_by, applied_at, evidence_url, scope, status, label:lc_labels(id, slug, family, label, description, canonical_url, requires_attribution, is_non_commercial)",
    )
    .eq("release_id", release.id)
    .eq("status", "active");

  // Endorsements anchored to this work (release-anchored, active only).
  // RLS: endorsements_read_public allows anon read. Order most-recent-first.
  const { data: endorsements } = await supabase
    .from("endorsements")
    .select(
      `id, endorsement_type, knowledge_domain, scope_iwi, scope_region, status, notes, created_at,
       endorser:endorser_id ( id, full_name, role, iwi_affiliation_attested )`,
    )
    .eq("work_id", release.id)
    .eq("work_type", "release")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(20);

  const meta = (release.metadata ?? {}) as {
    slug?: string;
    source?: string;
    iwi_gates?: string[];
    english_gloss?: string;
    cultural_flags?: string[];
    kinds?: string[];
  };

  return (
    <article className="prose prose-invert mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Link href="/records" className="text-sm text-bronze-300 hover:text-bronze-200">
        ← Back to Records
      </Link>

      <header className="mt-6">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-bronze-300" />
          <Badge variant="success">Released</Badge>
          {meta.kinds?.map((k) => (
            <Badge key={k} variant="outline" className="capitalize">{k}</Badge>
          ))}
        </div>
        <h1 className="mt-4 font-display">{release.title}</h1>
        {meta.english_gloss && (
          <p className="mt-2 text-lg italic text-muted-foreground">{meta.english_gloss}</p>
        )}
      </header>

      <section className="not-prose mt-8 grid gap-3 text-sm">
        {release.release_date && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Released {new Date(release.release_date).toLocaleDateString("en-NZ", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        )}
        {(release.upc || release.isrc) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Hash className="h-4 w-4" />
            {release.upc && <span>UPC: <code className="font-mono text-xs">{release.upc}</code></span>}
            {release.upc && release.isrc && <span>·</span>}
            {release.isrc && <span>ISRC: <code className="font-mono text-xs">{release.isrc}</code></span>}
          </div>
        )}
      </section>

      {/* Endorsement ribbon — above the fold for funder visibility */}
      {(endorsements ?? []).length > 0 && (
        <section className="not-prose mt-6 rounded-lg border border-bronze-400/40 bg-bronze-400/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-bronze-300">
            <Shield className="h-4 w-4" />
            With cultural guidance from
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {(endorsements ?? []).slice(0, 4).map((e) => {
              const endorserRaw = e.endorser as unknown;
              const endorser = Array.isArray(endorserRaw) ? endorserRaw[0] : endorserRaw;
              const attested =
                (endorser as { iwi_affiliation_attested?: string[] | null } | null)
                  ?.iwi_affiliation_attested ?? [];
              const name =
                (endorser as { full_name?: string | null } | null)?.full_name ??
                "Anonymous kāhui member";
              const firstIwi = attested[0];
              return (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-medium">{name}</span>
                  {firstIwi && (
                    <Badge variant="secondary" className="text-xs">
                      {firstIwi}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {e.endorsement_type === "co_creator"
                      ? "co-creator"
                      : e.endorsement_type === "cultural_endorsement"
                        ? "cultural endorsement"
                        : e.endorsement_type === "blessing"
                          ? "blessing"
                          : e.endorsement_type === "source_of_knowledge"
                            ? "source of knowledge"
                            : e.endorsement_type === "verification"
                              ? "verification"
                              : e.endorsement_type === "translation"
                                ? "translation"
                                : "mentorship"}
                  </span>
                </li>
              );
            })}
          </ul>
          {(endorsements ?? []).length > 4 && (
            <p className="mt-2 text-xs text-muted-foreground">
              + {(endorsements ?? []).length - 4} more endorsement
              {(endorsements ?? []).length - 4 === 1 ? "" : "s"} on this waiata
            </p>
          )}
        </section>
      )}

      {/* Cultural provenance hero — above the fold for funder visibility */}
      {(labelLinks ?? []).length > 0 && (
        <section className="not-prose mt-8">
          <CulturalProvenanceHero
            labels={(labelLinks ?? []).map((l) => ({
              id: l.id,
              label_id: l.label_id,
              release_id: l.release_id ?? null,
              research_document_id: l.research_document_id ?? null,
              applied_by: l.applied_by ?? null,
              applied_at: l.applied_at ?? new Date().toISOString(),
              evidence_url: l.evidence_url ?? null,
              scope: l.scope ?? null,
              status: l.status ?? "active",
              label: Array.isArray(l.label)
                ? l.label[0] ?? undefined
                : ((l.label as unknown as {
                    id: string;
                    slug: string;
                    family: "tk" | "bc" | "notice";
                    label: string;
                    description: string | null;
                    canonical_url: string | null;
                    requires_attribution: boolean;
                    is_non_commercial: boolean;
                  } | null) ?? undefined),
            }))}
          />
        </section>
      )}

      {release.description && (
        <section className="not-prose mt-10">
          <h2 className="font-display text-2xl">About this waiata</h2>
          <p className="mt-3 text-muted-foreground">{release.description}</p>
          {meta.source && (
            <p className="mt-2 text-sm text-muted-foreground">
              Source: {meta.source}
            </p>
          )}
        </section>
      )}

      <section className="not-prose mt-10">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-pounamu-300" />
              <CardTitle className="text-lg">Cultural provenance</CardTitle>
            </div>
            <CardDescription>
              Every released waiata has a documented cultural-review lineage.
              This section surfaces that lineage from our live data — not a claim.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {gate && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Kaitiaki gate
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-medium">{gate.iwi_name}</span>
                  <Badge variant="outline" className="capitalize">
                    {gate.scope.replace("_", " ")}
                  </Badge>
                </div>
                {gate.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">{gate.notes}</p>
                )}
              </div>
            )}

            {meta.iwi_gates && meta.iwi_gates.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Attributed iwi
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {meta.iwi_gates.map((iwi) => (
                    <Badge key={iwi} variant="secondary">{iwi}</Badge>
                  ))}
                </div>
              </div>
            )}

            {meta.cultural_flags && meta.cultural_flags.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Cultural flags
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {meta.cultural_flags.map((flag) => (
                    <Badge key={flag} variant="outline">{flag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Local Contexts labels
              </div>
              <CardDescription className="mt-1 text-xs">
                Machine-readable provenance from{" "}
                <a
                  href="https://localcontexts.org/labels"
                  target="_blank"
                  rel="noreferrer"
                  className="text-bronze-300 hover:text-bronze-200 underline"
                >
                  localcontexts.org
                </a>
                .
              </CardDescription>
              <div className="mt-2">
                <LocalContextsLabels
                  labels={(labelLinks ?? []).map((l) => ({
                    id: l.id,
                    release_id: l.release_id,
                    research_document_id: l.research_document_id,
                    label_id: l.label_id,
                    applied_by: l.applied_by,
                    applied_at: l.applied_at,
                    evidence_url: l.evidence_url,
                    scope: l.scope,
                    status: l.status as "active",
                    label: Array.isArray(l.label)
                      ? l.label[0] ?? null
                      : (l.label as unknown as {
                          id: string;
                          slug: string;
                          family: "tk" | "bc" | "notice";
                          label: string;
                          description: string;
                          canonical_url: string | null;
                          requires_attribution: boolean;
                          is_non_commercial: boolean;
                        } | null) ?? undefined,
                  }))}
                />
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    What are these labels?
                  </summary>
                  <LocalContextsExplainer className="mt-2" />
                </details>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Cultural sensitivity
              </div>
              <div className="mt-1">
                <Badge variant={release.cultural_sensitivity === "open" ? "success" : "outline"} className="capitalize">
                  {release.cultural_sensitivity.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="not-prose mt-10">
        <h2 className="font-display text-2xl">Listen · Tautoko</h2>
        <p className="mt-3 text-muted-foreground">
          Streaming links populate here once distribution is wired up.
          Until then, the catalog metadata + cultural provenance above
          is the canonical record.
        </p>
      </section>
    </article>
  );
}
