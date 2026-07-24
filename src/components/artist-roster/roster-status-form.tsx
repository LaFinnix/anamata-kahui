"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  changeRosterStatusAction,
  type RosterActionState,
} from "@/lib/artist-roster/actions";
import {
  ROSTER_STATUS_LABEL,
  ROSTER_STATUS_TRANSITIONS,
  type RosterStatus,
} from "@/lib/artist-roster/types";

/** Inline textarea — no Textarea component in the project. */
function Textarea({
  id,
  name,
  rows = 3,
  maxLength,
  placeholder,
}: {
  id?: string;
  name: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      id={id}
      name={name}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
    />
  );
}

/**
 * RosterStatusForm — change a roster row's status.
 * Shows only the legally-allowed transitions (per ROSTER_STATUS_TRANSITIONS).
 */
export function RosterStatusForm({
  rosterId,
  currentStatus,
  artistName,
  onDone,
}: {
  rosterId: string;
  currentStatus: RosterStatus;
  artistName: string;
  onDone?: () => void;
}) {
  const t = useTranslations("admin.records");
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<RosterStatus | null>(null);
  const [state, formAction, pending] = useActionState<RosterActionState, FormData>(
    changeRosterStatusAction,
    { ok: false, error: undefined },
  );
  const [, startTransition] = useTransition();

  if (state.ok) {
    setTimeout(() => {
      setOpen(false);
      setChosen(null);
      onDone?.();
    }, 0);
  }

  const allowed = ROSTER_STATUS_TRANSITIONS[currentStatus];
  const choices = allowed.filter((s) => s !== currentStatus);

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t("changeStatus")}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {t("statusChangeTitle", { artist: artistName })}
            </CardTitle>
            <CardDescription>
              {t("statusChangeLede")}{" "}
              <Badge variant="outline">{ROSTER_STATUS_LABEL[currentStatus]}</Badge>
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              setChosen(null);
            }}
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
            startTransition(() => {
              formAction(fd);
            });
          }}
          className="space-y-4"
        >
          <input type="hidden" name="roster_id" value={rosterId} />

          <div>
            <label className="mb-2 block text-sm font-medium">{t("newStatus")}</label>
            <div className="flex flex-wrap gap-2">
              {choices.map((s) => (
                <label
                  key={s}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    chosen === s
                      ? "border-bronze-400 bg-bronze-500/10"
                      : "border-border bg-card hover:border-bronze-400/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="new_status"
                    value={s}
                    required
                    className="sr-only"
                    onChange={() => setChosen(s)}
                    checked={chosen === s}
                  />
                  {ROSTER_STATUS_LABEL[s]}
                </label>
              ))}
            </div>
            {choices.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("noTransitionsAvailable")}
              </p>
            )}
            {state.fieldErrors?.new_status && (
              <p className="mt-1 text-xs text-destructive">
                {state.fieldErrors.new_status[0]}
              </p>
            )}
          </div>

          {chosen === "departed" && (
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="departed_reason">
                {t("departureReason")}
              </label>
              <Textarea
                id="departed_reason"
                name="departed_reason"
                maxLength={1000}
                rows={3}
                placeholder={t("departureReasonPlaceholder")}
              />
            </div>
          )}

          {state.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setChosen(null);
              }}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending || !chosen}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("updating")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {t("confirmChange")}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
