"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, FileText, CheckCircle2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  createContractAction,
  type ContractActionState,
} from "@/lib/contracts/actions";
import { CONTRACT_TYPES, CONTRACT_TYPE_LABEL } from "@/lib/contracts/types";

/** Inline textarea (no shared Textarea component yet). */
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
 * ContractCreateForm — admin creates a contract from the on-disk
 * document library. The form embeds the (type, version) pair from a
 * dropdown of available documents; the body is frozen at create time.
 */
export function ContractCreateForm({
  rosterOptions,
  documentOptions,
}: {
  rosterOptions: Array<{ id: string; label: string }>;
  documentOptions: Array<{
    type: string;
    version: string;
    title: string;
  }>;
}) {
  const t = useTranslations("admin.contracts");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ContractActionState, FormData>(
    createContractAction,
    { ok: false, error: undefined },
  );
  const [, startTransition] = useTransition();

  if (state.ok && open) {
    setTimeout(() => setOpen(false), 0);
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t("createContract")}
      </Button>
    );
  }

  if (rosterOptions.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          {t("noRosterEntries")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-4 w-4 text-bronze-300" />
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
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="artist_roster_id">
              {t("selectRosterEntry")}
            </label>
            <select
              id="artist_roster_id"
              name="artist_roster_id"
              required
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              defaultValue=""
            >
              <option value="" disabled>{t("selectRosterEntryPlaceholder")}</option>
              {rosterOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            {state.fieldErrors?.artist_roster_id && (
              <p className="mt-1 text-xs text-destructive">
                {state.fieldErrors.artist_roster_id[0]}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="document_type">
                {t("documentType")}
              </label>
              <select
                id="document_type"
                name="document_type"
                required
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                defaultValue=""
              >
                <option value="" disabled>{t("selectDocumentTypePlaceholder")}</option>
                {documentOptions.map((opt) => (
                  <option key={`${opt.type}@${opt.version}`} value={opt.type}>
                    {opt.type} · v{opt.version} — {opt.title}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.document_type && (
                <p className="mt-1 text-xs text-destructive">
                  {state.fieldErrors.document_type[0]}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="document_version">
                {t("documentVersion")}
              </label>
              <Input
                id="document_version"
                name="document_version"
                required
                placeholder="e.g. 0.1.0-draft"
              />
              {state.fieldErrors?.document_version && (
                <p className="mt-1 text-xs text-destructive">
                  {state.fieldErrors.document_version[0]}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="contract_type">
              {t("contractType")}
            </label>
            <select
              id="contract_type"
              name="contract_type"
              required
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              defaultValue="label_deal"
            >
              {CONTRACT_TYPES.map((t) => (
                <option key={t} value={t}>{CONTRACT_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="term_start">
                {t("termStart")}
              </label>
              <Input
                id="term_start"
                name="term_start"
                type="date"
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="term_end">
                {t("termEnd")}
              </label>
              <Input
                id="term_end"
                name="term_end"
                type="date"
                placeholder="YYYY-MM-DD (leave blank for open-ended)"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="territory">
                {t("territory")}
              </label>
              <Input
                id="territory"
                name="territory"
                placeholder={t("territoryPlaceholder")}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="exclusivity_scope">
                {t("exclusivityScope")}
              </label>
              <Input
                id="exclusivity_scope"
                name="exclusivity_scope"
                placeholder={t("exclusivityScopePlaceholder")}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="notes">
              {t("adminNotes")}
            </label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              maxLength={2000}
              placeholder={t("adminNotesPlaceholder")}
            />
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
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("creating")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {t("create")}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
