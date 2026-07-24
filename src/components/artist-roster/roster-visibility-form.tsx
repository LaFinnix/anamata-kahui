"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  updateRosterVisibilityAction,
  type RosterActionState,
} from "@/lib/artist-roster/actions";

/**
 * RosterVisibilityForm — toggle the dual-flag public visibility.
 * Both flags must be true for the row to be visible publicly (defence
 * model — see COLLABORATION-MARKETPLACE-PLAN §4.9).
 */
export function RosterVisibilityForm({
  rosterId,
  onRosterPublicly,
  optedInPublic,
  artistName,
}: {
  rosterId: string;
  onRosterPublicly: boolean;
  optedInPublic: boolean;
  artistName: string;
}) {
  const t = useTranslations("admin.records");
  const [open, setOpen] = useState(false);
  const [onList, setOnList] = useState(onRosterPublicly);
  const [optedIn, setOptedIn] = useState(optedInPublic);
  const [state, formAction, pending] = useActionState<RosterActionState, FormData>(
    updateRosterVisibilityAction,
    { ok: false, error: undefined },
  );
  const [, startTransition] = useTransition();

  if (state.ok && open) {
    setTimeout(() => setOpen(false), 0);
  }

  const isPubliclyVisible = onList && optedIn;

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        title={t("visibilityTitle")}
      >
        {isPubliclyVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
        <span className="sr-only">{t("visibilityTitle")}</span>
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {t("visibilityTitle")} — {artistName}
            </CardTitle>
            <CardDescription>{t("visibilityLede")}</CardDescription>
          </div>
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
      </CardHeader>
      <CardContent>
        <form
          action={(fd) => {
            // Update the form data with current local state
            if (onList) fd.set("on_roster_publicly", "on");
            if (optedIn) fd.set("opted_in_public", "on");
            startTransition(() => {
              formAction(fd);
            });
          }}
          className="space-y-4"
        >
          <input type="hidden" name="roster_id" value={rosterId} />

          <label className="flex items-start gap-3 rounded-md border border-border p-3">
            <input
              type="checkbox"
              name="on_roster_publicly"
              defaultChecked={onList}
              onChange={(e) => setOnList(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t("onRosterPublicly")}</p>
              <p className="text-xs text-muted-foreground">
                {t("onRosterPubliclyHint")}
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-md border border-border p-3">
            <input
              type="checkbox"
              name="opted_in_public"
              defaultChecked={optedIn}
              onChange={(e) => setOptedIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t("optedInPublic")}</p>
              <p className="text-xs text-muted-foreground">{t("optedInPublicHint")}</p>
            </div>
          </label>

          {state.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
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
                  {t("saving")}
                </>
              ) : (
                t("save")
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
