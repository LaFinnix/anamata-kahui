"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Send, Sparkles } from "lucide-react";

import { proposeOnTonoAction } from "@/lib/actions/tono";
import type { TonoState } from "@/lib/tono/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Props {
  tonoId: string;
}

const initialState: TonoState = {};

/**
 * Propose-on-tono form — for helpers who haven't proposed yet.
 * Renders below the tono detail for non-creator viewers.
 */
export function TonoProposeForm({ tonoId }: Props) {
  const t = useTranslations("tono.proposal");

  const [state, formAction, pending] = useActionState<TonoState, FormData>(
    proposeOnTonoAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-4 w-4 text-bronze-300" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("lede")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="tono_id" value={tonoId} />

          <div className="space-y-2">
            <Label htmlFor="proposal_body">{t("yourProposal")}</Label>
            <textarea
              id="proposal_body"
              name="proposal_body"
              rows={5}
              required
              minLength={1}
              maxLength={4000}
              placeholder={t("yourProposalPlaceholder")}
              className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proposed_koha">
              {t("proposedKoha")}{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <textarea
              id="proposed_koha"
              name="proposed_koha"
              rows={2}
              maxLength={2000}
              placeholder="What you'd accept in return. Reciprocity later, co-credit, a fixed amount, or nothing."
              className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estimated_hours">
                {t("estimatedHours")}{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <input
                id="estimated_hours"
                name="estimated_hours"
                type="number"
                min={0}
                max={9999.99}
                step={0.5}
                placeholder="e.g. 4"
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="available_from">
                {t("availableFrom")}{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <input
                id="available_from"
                name="available_from"
                type="date"
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          {state.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="rounded-md border border-pounamu-400/40 bg-pounamu-400/10 p-3 text-sm text-pounamu-300">
              {state.success}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("submittingButton")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("submitButton")}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
