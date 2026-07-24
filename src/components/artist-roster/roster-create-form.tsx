"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  createRosterEntryAction,
  type RosterActionState,
} from "@/lib/artist-roster/actions";

/** Inline textarea — no Textarea component in the project yet, so we
 *  reuse the input styling for a multi-line variant. */
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
 * RosterCreateForm — admin creates a new roster entry. Status starts at
 * 'prospect' by default; admin moves it to 'active' via the
 * RosterStatusForm on the row after creation.
 */
export function RosterCreateForm({
  branchId,
  artistOptions,
}: {
  branchId: string;
  artistOptions: Array<{ id: string; label: string }>;
}) {
  const t = useTranslations("admin.records");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<RosterActionState, FormData>(
    createRosterEntryAction,
    { ok: false, error: undefined },
  );
  const [isPending, startTransition] = useTransition();

  if (state.ok && open) {
    setOpen(false);
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        {t("addArtist")}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-4 w-4 text-bronze-300" />
              {t("createTitle")}
            </CardTitle>
            <CardDescription>{t("createLede")}</CardDescription>
          </div>
          <Button
            variant="ghost"
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
            startTransition(() => {
              formAction(fd);
            });
          }}
          className="space-y-4"
        >
          <input type="hidden" name="branch_id" value={branchId} />

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="profile_id">
              {t("selectArtist")}
            </label>
            <select
              id="profile_id"
              name="profile_id"
              required
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              defaultValue=""
            >
              <option value="" disabled>
                {t("selectArtistPlaceholder")}
              </option>
              {artistOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {state.fieldErrors?.profile_id && (
              <p className="mt-1 text-xs text-destructive">
                {state.fieldErrors.profile_id[0]}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="role_summary">
              {t("roleSummary")}
            </label>
            <Input
              id="role_summary"
              name="role_summary"
              maxLength={500}
              placeholder={t("roleSummaryPlaceholder")}
            />
            {state.fieldErrors?.role_summary && (
              <p className="mt-1 text-xs text-destructive">
                {state.fieldErrors.role_summary[0]}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="on_roster_publicly"
                className="h-4 w-4 rounded border-input"
              />
              {t("onRosterPublicly")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="opted_in_public"
                className="h-4 w-4 rounded border-input"
              />
              {t("optedInPublic")}
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="internal_notes">
              {t("internalNotes")}
            </label>
            <Textarea
              id="internal_notes"
              name="internal_notes"
              maxLength={5000}
              rows={3}
              placeholder={t("internalNotesPlaceholder")}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("adminOnly")}</p>
          </div>

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
              disabled={pending || isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending || isPending}>
              {pending || isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("creating")}
                </>
              ) : (
                t("create")
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
