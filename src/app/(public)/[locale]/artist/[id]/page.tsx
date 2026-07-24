import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Globe, Sparkles, Users, ShieldCheck, Award, ShieldOff, Megaphone } from "lucide-react";

import { createAdminClient, createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DOMAIN_LABEL, KNOWLEDGE_DOMAINS, type KnowledgeDomain } from "@/lib/kaikorero/types";
import {
  ENDORSEMENT_TYPE_LABEL,
  type EndorsementType,
  type EndorsementWorkType,
} from "@/lib/endorsements/types";
import { EndorseButton } from "@/components/endorsements/endorse-button";

export const revalidate = 600;

/**
 * /[locale]/artist/[id] — public Kaikōrero profile.
 *
 * Critical: this route 404s (does NOT show "private") when:
 *   - the user does not exist
 *   - the user has not opted into the public directory (opted_in_public_directory)
 *   - the user has not made their Kaikōrero profile visible (kaikorero_visible)
 *
 * The reason for 404 over a "private" message: a "private" page leaks the
 * existence of opted-out users. 404 makes existence itself invisible.
 *
 * Both gates must pass for the profile to render — this is the explicit
 * "two-toggle opt-in" pattern from the design doc (§5.1).
 */
export default async function PublicKaikoreroProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();
  const supabase = await createServerSupabase();
  const { data: { user: viewer } } = await supabase.auth.getUser();
  const t = await getTranslations("endorsements");

  // Single fetch — both opt-in flags must be true.
  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      `
      id,
      full_name,
      role,
      avatar_url,
      kaikorero_bio,
      kaikorero_visible,
      opted_in_public_directory,
      iwi_affiliation,
      iwi_affiliation_claimed,
      iwi_affiliation_attested,
      contribution_count
    `,
    )
    .eq("id", id)
    .eq("kaikorero_visible", true)
    .eq("opted_in_public_directory", true)
    .maybeSingle();

  if (error || !profile) {
    notFound();
  }

  // Knowledge areas for this profile (publicly readable — RLS allows).
  const { data: knowledgeAreas } = await admin
    .from("profile_knowledge_areas")
    .select("id, domain, scope_iwi, scope_region, attested_at")
    .eq("profile_id", id)
    .order("attested_at", { ascending: true });

  // Endorsements received (publicly readable — endorsements_read_public).
  // Grouped by (knowledge_domain, scope_iwi) per PLAN §4.3 — specificity
  // over aggregation. We never show a single "47 endorsements" count.
  const { data: endorsementsRaw } = await admin
    .from("endorsements")
    .select(
      `id, endorsement_type, knowledge_domain, scope_iwi, scope_region, status,
       revoked_reason, revoked_at, created_at, work_id, notes,
       endorser:endorser_id ( id, full_name, role, iwi_affiliation_attested ),
       work:work_id ( id, title, metadata )`,
    )
    .eq("recipient_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  // ----- Viewer context -----
  // Is the viewer authed? Is it someone other than the profile owner? Have
  // they already endorsed this person on a profile-anchored endorsement?
  // Used to decide whether to render the <EndorseButton/>.
  const isViewerAuthed = !!viewer;
  const isOwnProfile = viewer?.id === id;
  let viewerHasEndorsed = false;
  if (viewer && !isOwnProfile) {
    const { count } = await admin
      .from("endorsements")
      .select("id", { count: "exact", head: true })
      .eq("endorser_id", viewer.id)
      .eq("recipient_id", id)
      .eq("status", "active");
    viewerHasEndorsed = (count ?? 0) > 0;
  }
  const showEndorseButton = isViewerAuthed && !isOwnProfile && !viewerHasEndorsed;

  // Fulfilled tono — the public resolution trail. Per PLAN §5.1, OPEN tono
  // are NEVER public; only fulfilled/closed/withdrawn tono surface. This is
  // what makes the public profile show resolved outcomes, not requests.
  const { data: fulfilledTonos } = await admin
    .from("tono")
    .select(
      `id, help_type, knowledge_domain, scope_iwi, scope_region,
       request_body, status, fulfilled_at, fulfilled_by,
       fulfiller:fulfilled_by ( id, full_name, iwi_affiliation_attested )`,
    )
    .eq("creator_id", id)
    .in("status", ["fulfilled", "closed", "withdrawn"])
    .order("fulfilled_at", { ascending: false, nullsFirst: false })
    .limit(50);

  // Group knowledge areas by domain for the UI. Specificity over
  // aggregation: we never display a single count; each (domain, scope)
  // pair is its own entry.
  const groupedByDomain = new Map<
    KnowledgeDomain,
    { domain: KnowledgeDomain; entries: { scope_iwi: string | null; scope_region: string | null }[] }
  >();
  for (const ka of knowledgeAreas ?? []) {
    const dom = ka.domain as KnowledgeDomain;
    if (!groupedByDomain.has(dom)) {
      groupedByDomain.set(dom, { domain: dom, entries: [] });
    }
    groupedByDomain.get(dom)!.entries.push({
      scope_iwi: ka.scope_iwi,
      scope_region: ka.scope_region,
    });
  }
  const grouped = Array.from(groupedByDomain.values());

  // Normalize endorsements into the shape the UI expects.
  type LineageEntry = {
    id: string;
    endorsement_type: EndorsementType;
    knowledge_domain: KnowledgeDomain | null;
    scope_iwi: string | null;
    scope_region: string | null;
    status: "active" | "revoked" | "superseded";
    revoked_reason: string | null;
    revoked_at: string | null;
    created_at: string;
    notes: string;
    endorser: {
      id: string;
      full_name: string | null;
      role: string | null;
      iwi_affiliation_attested: string[] | null;
    } | null;
    work: {
      id: string;
      title: string;
      slug: string | null;
    } | null;
  };

  const endorsements: LineageEntry[] = (endorsementsRaw ?? []).map((row) => {
    const endorserRaw = row.endorser as unknown;
    const workRaw = row.work as unknown;
    const endorser = Array.isArray(endorserRaw) ? endorserRaw[0] : endorserRaw;
    const work = Array.isArray(workRaw) ? workRaw[0] : workRaw;
    const workMeta = (work as { metadata?: { slug?: string } } | null)?.metadata;
    return {
      id: row.id as string,
      endorsement_type: row.endorsement_type as EndorsementType,
      knowledge_domain: (row.knowledge_domain as KnowledgeDomain | null) ?? null,
      scope_iwi: (row.scope_iwi as string | null) ?? null,
      scope_region: (row.scope_region as string | null) ?? null,
      status: row.status as LineageEntry["status"],
      revoked_reason: (row.revoked_reason as string | null) ?? null,
      revoked_at: (row.revoked_at as string | null) ?? null,
      created_at: row.created_at as string,
      notes: row.notes as string,
      endorser: endorser
        ? {
            id: (endorser as { id: string }).id,
            full_name: ((endorser as { full_name?: string | null }).full_name) ?? null,
            role: ((endorser as { role?: string | null }).role) ?? null,
            iwi_affiliation_attested:
              ((endorser as { iwi_affiliation_attested?: string[] | null })
                .iwi_affiliation_attested) ?? null,
          }
        : null,
      work: work
        ? {
            id: (work as { id: string }).id,
            title: ((work as { title?: string }).title) ?? "(untitled)",
            slug: workMeta?.slug ?? null,
          }
        : null,
    };
  });

  const attestedIwi = (profile.iwi_affiliation_attested as string[] | null) ?? [];
  const claimedIwi = (profile.iwi_affiliation_claimed as string[] | null) ?? [];

  // "New contributor" marker — fewer than 3 substantive contributions.
  // Endorsements + accepted proposals increment this. Until those flows
  // ship (phase 2+), most profiles will show this; that's expected.
  const isNewContributor =
    (profile.contribution_count as number | null) !== null &&
    (profile.contribution_count as number) < 3;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-bronze-400/15 font-display text-3xl font-semibold text-bronze-200">
          {profile.full_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {profile.full_name ?? "Kāhui member"}
            </h1>
            {isNewContributor && (
              <Badge variant="outline" className="text-xs">
                New contributor
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="capitalize">
              {profile.role}
            </Badge>
            <span>·</span>
            <span>Kaikōrero (cultural collaborator)</span>
          </div>
        </div>
      </header>

      {/* Bio */}
      {profile.kaikorero_bio && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-bronze-300" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {profile.kaikorero_bio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Iwi affiliations */}
      {(attestedIwi.length > 0 || claimedIwi.length > 0) && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-bronze-300" />
              Iwi & hapū
            </CardTitle>
            <CardDescription>
              Attested affiliations have been confirmed through platform
              activity. Claimed affiliations are self-declared.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {attestedIwi.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Attested
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {attestedIwi.map((iwi) => (
                    <Badge key={`a-${iwi}`} variant="secondary">
                      {iwi}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {claimedIwi.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Claimed
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {claimedIwi.map((iwi) => (
                    <Badge key={`c-${iwi}`} variant="outline">
                      {iwi}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Knowledge areas — grouped by domain, scoped per entry */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-bronze-300" />
            Cultural-knowledge areas
          </CardTitle>
          <CardDescription>
            What this kaikōrero carries knowledge of. Each entry is scoped
            to a specific iwi or region where applicable — discovery works
            by filter, not by score.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No declared knowledge areas yet.
            </p>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.domain}>
                  <div className="text-sm font-medium">
                    {DOMAIN_LABEL[group.domain]}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {group.entries.map((e, idx) => {
                      const label =
                        e.scope_iwi && e.scope_region
                          ? `${e.scope_iwi} · ${e.scope_region}`
                          : e.scope_iwi ?? e.scope_region ?? "general";
                      return (
                        <Badge
                          key={`${group.domain}-${idx}`}
                          variant="outline"
                          className="text-xs"
                        >
                          {label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contribution lineage — endorsements received */}
      {endorsements.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-bronze-300" />
              Contribution lineage
            </CardTitle>
            <CardDescription>
              Each endorsement below is scoped to a work and (where
              applicable) a specific knowledge domain and iwi. Specificity
              over aggregation — no "47 endorsements" rollup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {endorsements.map((e) => (
                <li
                  key={e.id}
                  className={
                    e.status === "revoked"
                      ? "rounded-md border border-destructive/30 bg-destructive/5 p-3"
                      : "rounded-md border border-border p-3"
                  }
                >
                  <div className="flex flex-wrap items-baseline gap-2 text-sm">
                    <span className="font-medium">
                      {e.endorser?.full_name ?? "Anonymous kāhui member"}
                    </span>
                    {e.endorser?.iwi_affiliation_attested?.[0] && (
                      <Badge variant="secondary" className="text-xs">
                        {e.endorser.iwi_affiliation_attested[0]}
                      </Badge>
                    )}
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      {ENDORSEMENT_TYPE_LABEL[e.endorsement_type]}
                    </span>
                    {e.work && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground italic">
                          {e.work.title}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {e.knowledge_domain && (
                      <Badge variant="outline" className="text-xs">
                        {DOMAIN_LABEL[e.knowledge_domain]}
                      </Badge>
                    )}
                    {e.scope_iwi && (
                      <Badge variant="secondary" className="text-xs">
                        {e.scope_iwi}
                      </Badge>
                    )}
                    {e.scope_region && (
                      <Badge variant="secondary" className="text-xs">
                        {e.scope_region}
                      </Badge>
                    )}
                  </div>

                  {e.notes && (
                    <p className="mt-2 text-sm italic text-muted-foreground">
                      &ldquo;{e.notes}&rdquo;
                    </p>
                  )}

                  {e.status === "revoked" && (
                    <div className="mt-2 flex items-start gap-2 text-xs text-destructive">
                      <ShieldOff className="mt-0.5 h-3 w-3 shrink-0" />
                      <div>
                        Revoked
                        {e.revoked_at && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {new Date(e.revoked_at).toLocaleDateString()}
                          </span>
                        )}
                        {e.revoked_reason && (
                          <p className="mt-0.5 text-muted-foreground">
                            <span className="uppercase tracking-wider">Reason:</span>{" "}
                            {e.revoked_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Fulfilled tono — public resolution trail (open tono NEVER surface here) */}
      {fulfilledTonos && fulfilledTonos.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-bronze-300" />
              Resolved tono
            </CardTitle>
            <CardDescription>
              Tono this kaikōrero posted that landed. Open requests are
              dashboard-only — only resolved outcomes surface publicly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {fulfilledTonos.map((t) => {
                const fulfillerRaw = (t as { fulfiller?: unknown }).fulfiller;
                const fulfiller = Array.isArray(fulfillerRaw) ? fulfillerRaw[0] : fulfillerRaw;
                const status = (t as { status: string }).status;
                const fulfilledAt = (t as { fulfilled_at?: string | null }).fulfilled_at;
                const helpType = (t as { help_type: string }).help_type;
                return (
                  <li
                    key={(t as { id: string }).id}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex flex-wrap items-baseline gap-2 text-sm">
                      <span className="font-medium">
                        {helpType.replace(/_/g, " ")}
                      </span>
                      {(t as { scope_iwi?: string | null }).scope_iwi && (
                        <Badge variant="secondary" className="text-xs">
                          {(t as { scope_iwi?: string | null }).scope_iwi}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {status}
                      </Badge>
                      {fulfilledAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(fulfilledAt).toLocaleDateString("en-NZ", {
                            year: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                    {fulfiller && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Helped by{" "}
                        <span className="font-medium text-foreground">
                          {(fulfiller as { full_name?: string | null }).full_name ?? "Anonymous"}
                        </span>
                        {(fulfiller as { iwi_affiliation_attested?: string[] | null }).iwi_affiliation_attested?.[0] && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {(fulfiller as { iwi_affiliation_attested?: string[] | null }).iwi_affiliation_attested?.[0]}
                          </Badge>
                        )}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* CTA — tono now ship, so update the copy accordingly */}
      <div className="mt-8 rounded-lg border border-bronze-400/30 bg-bronze-400/5 p-4 text-sm text-muted-foreground">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-4 w-4 text-bronze-300" />
              Want to collaborate?
            </p>
            <p className="mt-1">
              If you carry knowledge this kaikōrero has requested help on, you
              can propose on their open tono from the dashboard inbox — it
              won't be visible here because open requests are private to the
              kāhui. Or post your own tono in the dashboard.
            </p>
          </div>
          {showEndorseButton && (
            <EndorseButton
              recipientId={id}
              recipientName={profile.full_name}
            />
          )}
        </div>
        {showEndorseButton === false && viewerHasEndorsed && isViewerAuthed && !isOwnProfile && (
          <p className="mt-2 text-xs">
            {t("give.publicNote")}{" "}
            <Link href="/endorsements" className="text-bronze-300 underline hover:text-bronze-200">
              {t("give.publicNoteLink")}
            </Link>
            .
          </p>
        )}
      </div>

      <div className="mt-8 text-xs text-muted-foreground">
        <Link
          href="/[locale]/artist"
          className="hover:text-foreground hover:underline"
        >
          ← Back to the Kaikōrero directory
        </Link>
      </div>
    </div>
  );
}
