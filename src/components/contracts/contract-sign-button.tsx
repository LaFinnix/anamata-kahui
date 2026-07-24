"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  signContractAction,
  type ContractActionState,
} from "@/lib/contracts/actions";

/**
 * ContractSignButton — the click-to-acknowledge button. Shows a
 * confirmation card with the body, then submits. Once signed, the
 * page revalidates and the row flips to "Active + signed".
 */
export function ContractSignButton({
  contractId,
  contractTitle,
  contractBody,
  status,
}: {
  contractId: string;
  contractTitle: string;
  contractBody: string;
  status: string;
}) {
  const t = useTranslations("kaikorero.roster");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ContractActionState, FormData>(
    signContractAction,
    { ok: false, error: undefined },
  );
  const [, startTransition] = useTransition();

  if (state.ok && open) {
    setTimeout(() => setOpen(false), 0);
  }

  // Already-signed contracts don't show the button
  if (status !== "draft" && status !== "active") {
    return null;
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <ShieldCheck className="h-4 w-4" />
        {t("readAndSign")}
      </Button>
    );
  }

  return (
    <Card className="border-bronze-500/40 bg-bronze-500/5">
      <CardHeader>
        <CardTitle className="text-lg">{t("signTitle", { title: contractTitle })}</CardTitle>
        <CardDescription>{t("signLede")}</CardDescription>
      </CardHeader>
      <CardContent>
        <details className="mb-4">
          <summary className="cursor-pointer text-sm font-medium text-bronze-300 hover:text-bronze-200">
            {t("readFullContract")}
          </summary>
          <pre className="mt-3 max-h-96 overflow-auto rounded-md border border-border bg-card p-3 text-xs leading-relaxed text-foreground">
            {contractBody}
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
          <input type="hidden" name="contract_id" value={contractId} />

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
                  {t("signing")}
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  {t("confirmSign")}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
