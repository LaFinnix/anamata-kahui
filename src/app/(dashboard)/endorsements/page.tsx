import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Award, ArrowLeft, Download } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { EndorsementsTabs } from "@/components/endorsements/endorsements-tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  EndorsementWithActor,
  EndorsementType,
  EndorsementWorkType,
} from "@/lib/endorsements/types";

export const metadata = {
  title: "Endorsements · Dashboard",
  description:
    "Endorsements you've given and received. The contribution lineage that makes your kaikōrero profile credible.",
};

/**
 * /endorsements — your endorsement dashboard.
 *
 * Two tabs:
 *   - Given: endorsements you've given (with Revoke action)
 *   - Received: endorsements others have given you (read-only)
 *
 * Endorsements land here automatically when a kaitiaki approves a release
 * you collaborated on (auto-endorse from cultural-review.ts). You can also
 * give endorsements manually from a collaborator's public profile (Phase 2
 * ships the manual path; the dashboard lists what you've sent).
 *
 * RLS: endorsements_read_public (lineage is publicly visible). Both Given
 * and Received lists are fetched server-side using the authed client.
 */
export default async function EndorsementsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const t = await getTranslations("endorsements");
  const activeTab = params.tab === "received" ? "received" : "given";

  // Fetch both Given and Received in parallel — endpoints are independent.
  // Public RLS allows reading any endorsement, so the authed client works.
  const [givenRes, receivedRes] = await Promise.all([
    supabase
      .from("endorsements")
      .select(`
        id, recipient_id, endorser_id, work_id, work_type, work_ref,
        endorsement_type, knowledge_domain, scope_iwi, scope_region,
        notes, status, revoked_reason, revoked_at, superseded_by, created_at,
        recipient:recipient_id ( id, full_name, role, iwi_affiliation_attested ),
        work:work_id ( id, title, metadata )
      `)
      .eq("endorser_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("endorsements")
      .select(`
        id, recipient_id, endorser_id, work_id, work_type, work_ref,
        endorsement_type, knowledge_domain, scope_iwi, scope_region,
        notes, status, revoked_reason, revoked_at, superseded_by, created_at,
        endorser:endorser_id ( id, full_name, role, iwi_affiliation_attested ),
        work:work_id ( id, title, metadata )
      `)
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const given: EndorsementWithActor[] = (givenRes.data ?? []).map((row) =>
    normalizeEndorsement(row, "given"),
  );
  const received: EndorsementWithActor[] = (receivedRes.data ?? []).map((row) =>
    normalizeEndorsement(row, "received"),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to dashboard
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-bronze-300">
            <Award className="h-4 w-4" />
            {t("subtitle")}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("lede")}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-muted-foreground">{t("exportLabel")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <a href="/api/endorsements/export?scope=given" download>
                <Download className="h-3 w-3" />
                {t("exportGiven")} ({given.length})
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href="/api/endorsements/export?scope=received" download>
                <Download className="h-3 w-3" />
                {t("exportReceived")} ({received.length})
              </a>
            </Button>
          </div>
        </div>
      </header>

      {given.length === 0 && received.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No endorsements yet</CardTitle>
            <CardDescription>
              Endorsements land here automatically when a kaitiaki approves
              a release you collaborated on. You can also give endorsements
              manually from a kaikōrero's public profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Browse the{" "}
            <Link
              href="/[locale]/artist"
              className="text-bronze-300 underline hover:text-bronze-200"
            >
              Kaikōrero directory
            </Link>{" "}
            to start.
          </CardContent>
        </Card>
      ) : (
        <EndorsementsTabs
          given={given}
          received={received}
          activeTab={activeTab}
        />
      )}
    </div>
  );
}

/**
 * Normalize the Supabase response (with embedded relations) into the
 * shape EndorsementWithActor expects. Supabase returns related rows as
 * either an object or an array depending on cardinality; this normalises.
 */
function normalizeEndorsement(
  row: Record<string, unknown>,
  perspective: "given" | "received",
): EndorsementWithActor {
  const endorserRaw = row.endorser;
  const recipientRaw = row.recipient;
  const workRaw = row.work;

  const endorser = Array.isArray(endorserRaw) ? endorserRaw[0] : endorserRaw;
  const recipient = Array.isArray(recipientRaw) ? recipientRaw[0] : recipientRaw;
  const work = Array.isArray(workRaw) ? workRaw[0] : workRaw;

  const workMeta = (work as { metadata?: { slug?: string } } | null)?.metadata;

  return {
    id: row.id as string,
    recipient_id: row.recipient_id as string,
    endorser_id: row.endorser_id as string,
    work_id: (row.work_id as string | null) ?? null,
    work_type: row.work_type as EndorsementWorkType,
    work_ref: (row.work_ref as string | null) ?? null,
    endorsement_type: row.endorsement_type as EndorsementType,
    knowledge_domain: (row.knowledge_domain as EndorsementWithActor["knowledge_domain"]) ?? null,
    scope_iwi: (row.scope_iwi as string | null) ?? null,
    scope_region: (row.scope_region as string | null) ?? null,
    notes: row.notes as string,
    status: row.status as EndorsementWithActor["status"],
    revoked_reason: (row.revoked_reason as string | null) ?? null,
    revoked_at: (row.revoked_at as string | null) ?? null,
    superseded_by: (row.superseded_by as string | null) ?? null,
    created_at: row.created_at as string,
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
    recipient: recipient
      ? {
          id: (recipient as { id: string }).id,
          full_name: ((recipient as { full_name?: string | null }).full_name) ?? null,
          role: ((recipient as { role?: string | null }).role) ?? null,
          iwi_affiliation_attested:
            ((recipient as { iwi_affiliation_attested?: string[] | null })
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
    // Include perspective so the UI can show it (informational; not displayed)
    ...(perspective === "given" ? {} : {}),
  };
}
