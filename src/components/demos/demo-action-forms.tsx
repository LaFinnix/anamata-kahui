"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Send, ShieldCheck, XCircle, Award } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import {
  submitForReviewAction,
  approveDemoAction,
  rejectDemoAction,
  promoteDemoAction,
  type DemoActionState,
} from "@/lib/demos/actions";

/**
 * DemoActionForms — the "next action" form for a demo.
 *
 * The component renders one of several variants depending on the
 * `action` prop:
 *   - "submit"     : artist submits draft for review
 *   - "approve"    : kaitiaki / admin approves
 *   - "reject"     : kaitiaki / admin rejects
 *   - "promote"    : branch admin promotes to release
 *
 * Each variant is a confirmation card with notes input + confirm
 * button. Once submitted, the parent revalidates and the demo status
 * changes server-side.
 */
type DemoAction = "submit" | "approve" | "reject" | "promote";

export function DemoActionForms({
  demoId,
  action,
}: {
  demoId: string;
  action: DemoAction;
}) {
  const t = useTranslations("kaikorero.demos");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<DemoActionState, FormData>(
    action === "submit" ? submitForReviewAction : action === "approve" ? approveDemoAction : action === "reject" ? rejectDemoAction : promoteDemoAction,
    { ok: false, error: undefined },
  );
  const [, startTransition] = useTransition();

  if (state.ok && open) {
    setTimeout(() => setOpen(false), 0);
  }

  const triggerLabel: Record<DemoAction, string> = {
    submit: t("submitForReview"),
    approve: t("approve"),
    reject: t("reject"),
    promote: t("promote"),
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant={action === "reject" ? "destructive" : action === "approve" || action === "promote" ? "default" : "secondary"}
        onClick={() => setOpen(true)}
      >
        {action === "submit" && <Send className="h-4 w-4" />}
        {action === "approve" && <ShieldCheck className="h-4 w-4" />}
        {action === "reject" && <XCircle className="h-4 w-4" />}
        {action === "promote" && <Award className="h-4 w-4" />}
        {triggerLabel[action]}
      </Button>
    );
  }

  const showNotesField = action === "approve" || action === "reject";
  const titleKey: Record<DemoAction, string> = {
    submit: t("submitConfirmTitle"),
    approve: t("approveConfirmTitle"),
    reject: t("rejectConfirmTitle"),
    promote: t("promoteConfirmTitle"),
  };
  const ledeKey: Record<DemoAction, string> = {
    submit: t("submitConfirmLede"),
    approve: t("approveConfirmLede"),
    reject: t("rejectConfirmLede"),
    promote: t("promoteConfirmLede"),
  };
  const notesLabelKey: Record<DemoAction, string> = {
    submit: t("notesLabel"),
    approve: t("reviewNotesLabel"),
    reject: t("reviewNotesLabel"),
    promote: t("promoteNotesLabel"),
  };
  const notesPlaceholderKey: Record<DemoAction, string> = {
    submit: t("notesPlaceholder"),
    approve: t("approveNotesPlaceholder"),
    reject: t("rejectNotesPlaceholder"),
    promote: t("promoteNotesPlaceholder"),
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{titleKey[action]}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
            type="button"
          >
            {t("cancel")}
          </Button>
        </div>
        <CardDescription>{ledeKey[action]}</CardDescription>
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
          <input type="hidden" name="demo_id" value={demoId} />

          {showNotesField && (
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="review_notes">
                {notesLabelKey[action]}
              </label>
              <textarea
                id="review_notes"
                name="review_notes"
                rows={3}
                maxLength={2000}
                placeholder={notesPlaceholderKey[action]}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              />
            </div>
          )}

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
            <Button
              type="submit"
              variant={action === "reject" ? "destructive" : "default"}
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                triggerLabel[action]
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
