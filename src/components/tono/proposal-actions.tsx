"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, Loader2, Users } from "lucide-react";

import { respondToProposalAction } from "@/lib/actions/tono";
import type { TonoState, TonoRow, ProposalStatus } from "@/lib/tono/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface ProposalRecord {
  id: string;
  proposer_id: string;
  proposal_body: string;
  proposed_koha: string | null;
  estimated_hours: number | null;
  available_from: string | null;
  status: ProposalStatus;
  decided_at: string | null;
  decline_reason: string | null;
  created_at: string;
  proposer: {
    id: string;
    full_name: string | null;
    role: string | null;
    iwi_affiliation_attested: string[] | null;
    contribution_count: number | null;
  } | null;
}

interface Props {
  proposal: ProposalRecord;
  tono: TonoRow;
  isAccepted: boolean;
  isCreatorView: boolean;
}

const STATUS_VARIANT: Record<ProposalStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  accepted: "default",
  declined: "destructive",
  withdrawn: "outline",
};

const STATUS_LABEL_KEYS: Record<ProposalStatus, string> = {
  pending: "pending",
  accepted: "accepted",
  declined: "declined",
  withdrawn: "withdrawn",
};

/**
 * Renders one proposal in the tono detail page.
 *
 * Creator view: shows Accept/Decline buttons when pending.
 * Helper view: shows their own proposal status read-only.
 */
export function TonoProposalActions({
  proposal,
  tono,
  isCreatorView,
}: Props) {
  const t = useTranslations("tono.proposal");
  const tStatus = useTranslations("tono.proposalStatus");

  const [state, formAction, pending] = useActionState<TonoState, FormData>(
    respondToProposalAction,
    {},
  );
  const [showDecline, setShowDecline] = useState(false);

  const proposer = proposal.proposer;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-4 w-4 text-bronze-300" />
            <div>
              <CardTitle className="text-base">
                {proposer?.full_name ? (
                  <Link
                    href={`/[locale]/artist/${proposer.id}` as never}
                    className="hover:underline"
                  >
                    {proposer.full_name}
                  </Link>
                ) : (
                  t("anonymous")
                )}
                {proposer?.iwi_affiliation_attested?.[0] && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {proposer.iwi_affiliation_attested[0]}
                  </Badge>
                )}
                {proposer && proposer.contribution_count !== null && proposer.contribution_count < 3 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {t("newContributor")}
                  </Badge>
                )}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("proposedOn")} {new Date(proposal.created_at).toLocaleDateString("en-NZ")}
              </p>
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[proposal.status]}>
            {tStatus(STATUS_LABEL_KEYS[proposal.status] as never)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-border p-3 text-sm">
          <p className="whitespace-pre-line text-foreground/90">{proposal.proposal_body}</p>
          {proposal.proposed_koha && (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="uppercase tracking-wider">{t("kohaShort")}:</span> {proposal.proposed_koha}
            </p>
          )}
          {proposal.estimated_hours !== null && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("estimated")}: {proposal.estimated_hours} {proposal.estimated_hours === 1 ? t("hour") : t("hours")}
            </p>
          )}
          {proposal.decline_reason && (
            <p className="mt-2 text-xs text-destructive">
              <span className="uppercase tracking-wider">{t("declineReasonShort")}:</span>{" "}
              {proposal.decline_reason}
            </p>
          )}
        </div>

        {/* Creator actions: Accept / Decline (only when tono is open + proposal pending) */}
        {isCreatorView && proposal.status === "pending" && tono.status === "open" && (
          <div className="space-y-2 border-t border-border pt-3">
            {!showDecline ? (
              <div className="flex items-center gap-2">
                <form action={formAction} className="flex-1">
                  <input type="hidden" name="proposal_id" value={proposal.id} />
                  <input type="hidden" name="decision" value="accepted" />
                  <Button type="submit" disabled={pending} className="w-full">
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {t("acceptButton")}
                  </Button>
                </form>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDecline(true)}
                  disabled={pending}
                >
                  <XCircle className="h-4 w-4" />
                  {t("declineButton")}
                </Button>
              </div>
            ) : (
              <form action={formAction} className="space-y-2">
                <input type="hidden" name="proposal_id" value={proposal.id} />
                <input type="hidden" name="decision" value="declined" />
                <Label htmlFor={`reason-${proposal.id}`} className="text-xs">
                  {t("declineReasonLabel")} <span className="text-muted-foreground">(optional but recommended)</span>
                </Label>
                <textarea
                  id={`reason-${proposal.id}`}
                  name="decline_reason"
                  rows={2}
                  maxLength={2000}
                  placeholder={t("declineReasonPlaceholder")}
                  className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <div className="flex items-center gap-2">
                  <Button type="submit" variant="destructive" disabled={pending}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    {t("confirmDecline")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowDecline(false)} disabled={pending}>
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state.success && (
          <p className="text-sm text-pounamu-300">{state.success}</p>
        )}
      </CardContent>
    </Card>
  );
}
