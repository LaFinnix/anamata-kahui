import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Megaphone } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { getTonoForViewer, listProposalsForTono } from "@/lib/queries/tono";
import { TonoDetailCard } from "@/components/tono/detail-card";
import { TonoProposalActions } from "@/components/tono/proposal-actions";
import { TonoProposeForm } from "@/components/tono/propose-form";
import { TonoLifecycleActions } from "@/components/tono/lifecycle-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TONO_HELP_TYPE_LABEL,
  TONO_STATUS_LABEL,
  TONO_VISIBILITY_LABEL,
  type TonoRow,
} from "@/lib/tono/types";
import { DOMAIN_LABEL } from "@/lib/kaikorero/types";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * /tono/[id] — tono detail.
 *
 * View modes based on the relationship between the caller and the tono:
 *   - Creator: sees proposals, can accept/decline, fulfill, withdraw, close
 *   - Helper (already proposed): sees their pending proposal status
 *   - Helper (haven't proposed): sees the propose form
 *   - Outsider (not the creator, no proposal): can read if visible
 *
 * RLS handles base access. The UI just renders the appropriate affordances.
 */
export default async function TonoDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const t = await getTranslations("tono.detail");
  const tProposal = await getTranslations("tono.proposal");

  const { tono, isCreator } = await getTonoForViewer(id);
  if (!tono) notFound();

  // Fetch proposals + the creator profile
  const [proposals, creatorProfile] = await Promise.all([
    listProposalsForTono(id),
    supabase
      .from("profiles")
      .select("id, full_name, role, iwi_affiliation_attested")
      .eq("id", tono.creator_id)
      .maybeSingle()
      .then((r) => r.data),
  ]);

  // Did the current user already propose?
  const myProposal = proposals.find(
    (p) => p.proposer_id === user.id,
  );

  // Fetch the linked release title if any
  let linkedRelease: { id: string; title: string } | null = null;
  if (tono.work_id) {
    const { data: rel } = await supabase
      .from("releases")
      .select("id, title")
      .eq("id", tono.work_id)
      .maybeSingle();
    linkedRelease = rel;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={isCreator ? "/tono" : "/tono/inbox"}
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        {isCreator ? t("backToBoard") : t("backToInbox")}
      </Link>

      {/* Tono detail */}
      <TonoDetailCard
        tono={tono}
        isCreator={isCreator}
        creator={creatorProfile ?? null}
        linkedRelease={linkedRelease}
      />

      {/* Creator-only actions: lifecycle (fulfill, withdraw, close) */}
      {isCreator && tono.status !== "fulfilled" && tono.status !== "withdrawn" && (
        <TonoLifecycleActions tono={tono} />
      )}

      {/* Creator: proposals list with accept/decline */}
      {isCreator && tono.status !== "withdrawn" && proposals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {tProposal("title2")} ({proposals.length})
          </h2>
          <div className="space-y-3">
            {proposals.map((p) => (
              <TonoProposalActions
                key={p.id}
                proposal={p as never}
                tono={tono}
                isAccepted={p.status === "accepted"}
                isCreatorView
              />
            ))}
          </div>
        </section>
      )}

      {/* Helper view: show own proposal status if any */}
      {!isCreator && myProposal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("youProposed")}</CardTitle>
            <CardDescription>
              {myProposal.status === "pending" && t("pendingDesc")}
              {myProposal.status === "accepted" && t("acceptedDesc")}
              {myProposal.status === "declined" && t("declinedDesc")}
              {myProposal.status === "withdrawn" && t("withdrawnDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="whitespace-pre-line text-foreground/90">
                {myProposal.proposal_body}
              </p>
              {myProposal.proposed_koha && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="uppercase tracking-wider">Koha:</span>{" "}
                  {myProposal.proposed_koha}
                </p>
              )}
              {myProposal.decline_reason && (
                <p className="mt-2 text-xs text-destructive">
                  <span className="uppercase tracking-wider">Decline reason:</span>{" "}
                  {myProposal.decline_reason}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Helper view: propose form (only if open + user hasn't proposed + user is not creator) */}
      {!isCreator && !myProposal && tono.status === "open" && (
        <TonoProposeForm tonoId={tono.id} />
      )}
    </div>
  );
}
