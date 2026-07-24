"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

import {
  fulfillTonoAction,
  withdrawTonoAction,
  closeTonoAction,
} from "@/lib/actions/tono";
import type { TonoState, TonoRow } from "@/lib/tono/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Props {
  tono: TonoRow;
}

const initialState: TonoState = {};

/**
 * Lifecycle actions for the tono creator.
 *
 * Three flows:
 *   - Fulfill (only when status = in_conversation)
 *   - Withdraw
 *   - Close (without fulfilling)
 *
 * Fulfillment auto-creates a co_creator endorsement for the proposer if
 * the tono is linked to a release.
 */
export function TonoLifecycleActions({ tono }: Props) {
  const t = useTranslations("tono.lifecycle");
  const tProposal = useTranslations("tono.proposal");

  const [fulfillState, fulfillAction, fulfillPending] = useActionState<TonoState, FormData>(
    fulfillTonoAction,
    initialState,
  );
  const [withdrawState, withdrawAction, withdrawPending] = useActionState<TonoState, FormData>(
    withdrawTonoAction,
    initialState,
  );
  const [closeState, closeAction, closePending] = useActionState<TonoState, FormData>(
    closeTonoAction,
    initialState,
  );

  const [showFulfill, setShowFulfill] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showClose, setShowClose] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Fulfill — only when in_conversation */}
        {tono.status === "in_conversation" && (
          <>
            {!showFulfill ? (
              <Button onClick={() => setShowFulfill(true)} className="w-full">
                <CheckCircle2 className="h-4 w-4" />
                {t("fulfillButton")}
              </Button>
            ) : (
              <form action={fulfillAction} className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
                <input type="hidden" name="tono_id" value={tono.id} />
                <div className="rounded-md border border-pounamu-400/30 bg-pounamu-400/5 p-2 text-xs text-pounamu-300">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    {tProposal("fulfilling")}
                  </div>
                  <p className="mt-1">{tProposal("endorsementNote")}</p>
                </div>
                <Label htmlFor="fulfill-note" className="text-xs">
                  {t("noteLabel")}{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <textarea
                  id="fulfill-note"
                  name="note"
                  rows={2}
                  maxLength={2000}
                  placeholder={t("notePlaceholder")}
                  className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                {fulfillState.error && (
                  <p className="text-sm text-destructive">{fulfillState.error}</p>
                )}
                {fulfillState.success && (
                  <p className="text-sm text-pounamu-300">{fulfillState.success}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={fulfillPending}>
                    {fulfillPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {t("confirmFulfill")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowFulfill(false)} disabled={fulfillPending}>
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Withdraw */}
        {tono.status === "open" && (
          <>
            {!showWithdraw ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowWithdraw(true)}
                className="w-full"
              >
                <XCircle className="h-4 w-4" />
                {t("withdrawButton")}
              </Button>
            ) : (
              <form action={withdrawAction} className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <input type="hidden" name="tono_id" value={tono.id} />
                <Label htmlFor="withdraw-reason" className="text-xs">
                  {tProposal("declineReasonLabel")}{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <textarea
                  id="withdraw-reason"
                  name="reason"
                  rows={2}
                  maxLength={2000}
                  placeholder={t("withdrawReason")}
                  className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                {withdrawState.error && (
                  <p className="text-sm text-destructive">{withdrawState.error}</p>
                )}
                {withdrawState.success && (
                  <p className="text-sm text-pounamu-300">{withdrawState.success}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button type="submit" variant="destructive" disabled={withdrawPending}>
                    {withdrawPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    {t("confirmWithdraw")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowWithdraw(false)} disabled={withdrawPending}>
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Close (without fulfilling) */}
        {tono.status === "in_conversation" && (
          <>
            {!showClose ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowClose(true)}
                className="w-full"
              >
                <AlertTriangle className="h-4 w-4" />
                {t("closeButton")}
              </Button>
            ) : (
              <form action={closeAction} className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <input type="hidden" name="tono_id" value={tono.id} />
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                  {t("closeWarning")}
                </div>
                <Label htmlFor="close-reason" className="text-xs">
                  {tProposal("declineReasonLabel")}{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <textarea
                  id="close-reason"
                  name="reason"
                  rows={2}
                  maxLength={2000}
                  placeholder={t("closeReason")}
                  className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                {closeState.error && (
                  <p className="text-sm text-destructive">{closeState.error}</p>
                )}
                {closeState.success && (
                  <p className="text-sm text-pounamu-300">{closeState.success}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button type="submit" variant="destructive" disabled={closePending}>
                    {closePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    {t("confirmClose")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowClose(false)} disabled={closePending}>
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
