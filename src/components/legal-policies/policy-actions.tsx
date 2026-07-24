"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShieldCheck, ScrollText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import {
  acknowledgePolicyAction,
  withdrawAckAction,
  type PolicyActionState,
} from "@/lib/legal-policies/actions";
import type { LegalPolicyRow } from "@/lib/legal-policies/types";

/**
 * PolicyAcknowledgeButton — artist click-to-acknowledge.
 * Opens a confirmation card with the policy body (read first), then submits.
 */
export function PolicyAcknowledgeButton({
  policy,
  artistRosterId,
}: {
  policy: LegalPolicyRow;
  artistRosterId: string;
}) {
  const t = useTranslations("kaikorero.policies");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<PolicyActionState, FormData>(
    acknowledgePolicyAction,
    { ok: false, error: undefined },
  );
  const [, startTransition] = useTransition();

  if (state.ok && open) {
    setTimeout(() => setOpen(false), 0);
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <ShieldCheck className="h-4 w-4" />
        {t("readAndAcknowledge")}
      </Button>
    );
  }

  return (
    <Card className="border-bronze-500/40 bg-bronze-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScrollText className="h-4 w-4 text-bronze-300" />
          {t("acknowledgeTitle", { title: policy.title })}
        </CardTitle>
        <CardDescription>{t("acknowledgeLede")}</CardDescription>
      </CardHeader>
      <CardContent>
        <details className="mb-4" open>
          <summary className="cursor-pointer text-sm font-medium text-bronze-300 hover:text-bronze-200">
            {t("readFullPolicy")}
          </summary>
          <pre className="mt-3 max-h-96 overflow-auto rounded-md border border-border bg-card p-3 text-xs leading-relaxed text-foreground">
            {policy.body}
          </pre>
        </details>

        <form
          action={(fd) => {
            startTransition(() => {
              formAction(fd);
            });
          }}
          className="space-y-3"
        >
          <input type="hidden" name="policy_id" value={policy.id} />
          <input type="hidden" name="artist_roster_id" value={artistRosterId} />

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="notes">
              {t("notesLabel")}
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              maxLength={2000}
              placeholder={t("notesPlaceholder")}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("notesHint")}</p>
          </div>

          {state.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("acknowledging")}
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  {t("confirmAcknowledge")}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * PolicyWithdrawButton — artist withdraws an existing acknowledgement.
 * CARE right of withdrawal: original ack row preserved; only sets
 * withdrawn_at + withdrawn_reason.
 */
export function PolicyWithdrawButton({
  ackId,
  policyTitle,
}: {
  ackId: string;
  policyTitle: string;
}) {
  const t = useTranslations("kaikorero.policies");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<PolicyActionState, FormData>(
    withdrawAckAction,
    { ok: false, error: undefined },
  );
  const [, startTransition] = useTransition();

  if (state.ok && open) {
    setTimeout(() => setOpen(false), 0);
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {t("withdraw")}
      </Button>
    );
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-base">
          {t("withdrawTitle", { title: policyTitle })}
        </CardTitle>
        <CardDescription>{t("withdrawLede")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(fd) => {
            startTransition(() => {
              formAction(fd);
            });
          }}
          className="space-y-3"
        >
          <input type="hidden" name="ack_id" value={ackId} />

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="withdrawn_reason">
              {t("withdrawReason")}
            </label>
            <textarea
              id="withdrawn_reason"
              name="withdrawn_reason"
              rows={2}
              maxLength={1000}
              placeholder={t("withdrawReasonPlaceholder")}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("withdrawReasonHint")}</p>
          </div>

          {state.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("withdrawing")}
                </>
              ) : (
                t("confirmWithdraw")
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
