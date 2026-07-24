"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Award, Loader2, X, Info } from "lucide-react";

import { giveEndorsementAction, type EndorseState } from "@/lib/actions/endorsements";
import {
  ENDORSEMENT_TYPES,
  ENDORSEMENT_WORK_TYPES,
  type EndorsementType,
  type EndorsementWorkType,
} from "@/lib/endorsements/types";
import { DOMAIN_LABEL, KNOWLEDGE_DOMAINS } from "@/lib/kaikorero/types";
import type { KnowledgeDomain } from "@/lib/kaikorero/types";
import { Button } from "@/components/ui/button";

interface Props {
  recipientId: string;
  recipientName: string | null;
}

/**
 * <EndorseButton/> — public-profile button to manually endorse a kaikōrero.
 *
 * Renders an inline "Endorse" button. Click opens a modal (we render it
 * inline below the button rather than as a portal — simpler, fewer
 * hydration concerns). The modal posts to `giveEndorsementAction`.
 *
 * v1.1 design decisions:
 *   - Default work_type is 'profile' (general standing endorsement). The
 *     user can switch to a work-anchored mode if they want to scope.
 *   - Notes are required (1–2000 chars). Endorsements are public and
 *     revocable; the note is part of the lineage and should be substantive.
 *   - Knowledge domain + iwi scope are optional but encouraged.
 *
 * Self-endorsement is blocked at the server action AND at this button
 * (we don't even render it for the profile owner — see where it's wired).
 */
export function EndorseButton({ recipientId, recipientName }: Props) {
  const t = useTranslations("endorsements.give");
  const tField = useTranslations("endorsements.give.fields");
  const tType = useTranslations("endorsements.types");
  const tWorkType = useTranslations("endorsements.workTypes");
  const tDomain = useTranslations("kaikorero.fields.domain");

  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<EndorseState, FormData>(
    giveEndorsementAction,
    { error: undefined, success: undefined },
  );

  // Close on success
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => setOpen(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [state?.success]);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        variant="secondary"
        size="sm"
      >
        <Award className="h-4 w-4" />
        {t("button")}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-display text-lg font-semibold">
                {t("modalTitle", { name: recipientName ?? t("defaultRecipient") })}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={formAction} className="space-y-4 p-4">
              <input type="hidden" name="recipient_id" value={recipientId} />

              {/* Endorsement type */}
              <div className="space-y-1">
                <label htmlFor="endorsement_type" className="block text-sm font-medium">
                  {tField("type")}
                </label>
                <select
                  id="endorsement_type"
                  name="endorsement_type"
                  required
                  className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  defaultValue="source_of_knowledge"
                >
                  {ENDORSEMENT_TYPES.map((t_) => (
                    <option key={t_} value={t_}>
                      {tType(t_ as never)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Work type */}
              <div className="space-y-1">
                <label htmlFor="work_type" className="block text-sm font-medium">
                  {tField("workType")}
                </label>
                <select
                  id="work_type"
                  name="work_type"
                  required
                  className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  defaultValue="profile"
                >
                  {ENDORSEMENT_WORK_TYPES.map((wt) => (
                    <option key={wt} value={wt}>
                      {tWorkType(wt as never)}
                    </option>
                  ))}
                </select>
                <p className="flex items-start gap-1 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  {tField("workTypeHelp")}
                </p>
              </div>

              {/* Knowledge domain (optional) */}
              <div className="space-y-1">
                <label htmlFor="knowledge_domain" className="block text-sm font-medium">
                  {tField("domain")}
                </label>
                <select
                  id="knowledge_domain"
                  name="knowledge_domain"
                  className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  defaultValue=""
                >
                  <option value="">{tField("domainNone")}</option>
                  {KNOWLEDGE_DOMAINS.map((d: KnowledgeDomain) => (
                    <option key={d} value={d}>
                      {DOMAIN_LABEL[d]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope iwi + region (optional) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="scope_iwi" className="block text-sm font-medium">
                    {tField("scopeIwi")}
                  </label>
                  <input
                    id="scope_iwi"
                    name="scope_iwi"
                    type="text"
                    placeholder={tField("scopeIwiPlaceholder")}
                    className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="scope_region" className="block text-sm font-medium">
                    {tField("scopeRegion")}
                  </label>
                  <input
                    id="scope_region"
                    name="scope_region"
                    type="text"
                    placeholder={tField("scopeRegionPlaceholder")}
                    className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>

              {/* Notes (required) */}
              <div className="space-y-1">
                <label htmlFor="notes" className="block text-sm font-medium">
                  {tField("notes")}
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  required
                  minLength={1}
                  maxLength={2000}
                  placeholder={tField("notesPlaceholder")}
                  className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-muted-foreground">{tField("notesHelp")}</p>
              </div>

              {state?.error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {state.error}
                </p>
              )}
              {state?.success && (
                <p className="rounded-md border border-pounamu-400/40 bg-pounamu-400/10 p-3 text-sm text-pounamu-300">
                  {state.success}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" variant="secondary" size="sm" disabled={pending}>
                  {pending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Award className="h-3 w-3" />
                  )}
                  {t("submit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
