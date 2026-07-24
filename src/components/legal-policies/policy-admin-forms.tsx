"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, ScrollText, Sparkles, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  createPolicyAction,
  publishPolicyAction,
  type PolicyActionState,
} from "@/lib/legal-policies/actions";
import { POLICY_TYPES, POLICY_TYPE_LABEL } from "@/lib/legal-policies/types";

/**
 * PolicyCreateForm — admin drafts a new policy from the on-disk
 * document library. The body is frozen at create time.
 */
export function PolicyCreateForm({
  documentOptions,
}: {
  documentOptions: Array<{ type: string; version: string; title: string }>;
}) {
  const t = useTranslations("admin.policies");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<PolicyActionState, FormData>(
    createPolicyAction,
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
        {t("createPolicy")}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScrollText className="h-4 w-4 text-bronze-300" />
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
            <label className="mb-1 block text-sm font-medium" htmlFor="policy_type">
              {t("policyType")}
            </label>
            <select
              id="policy_type"
              name="policy_type"
              required
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              defaultValue=""
            >
              <option value="" disabled>{t("selectPolicyTypePlaceholder")}</option>
              {POLICY_TYPES.map((t) => (
                <option key={t} value={t}>{POLICY_TYPE_LABEL[t]}</option>
              ))}
            </select>
            {state.fieldErrors?.policy_type && (
              <p className="mt-1 text-xs text-destructive">
                {state.fieldErrors.policy_type[0]}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="version">
                {t("version")}
              </label>
              <select
                id="version"
                name="version"
                required
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                defaultValue=""
              >
                <option value="" disabled>{t("selectVersionPlaceholder")}</option>
                {documentOptions.map((opt) => (
                  <option key={`${opt.type}@${opt.version}`} value={opt.version}>
                    v{opt.version} — {opt.title}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.version && (
                <p className="mt-1 text-xs text-destructive">
                  {state.fieldErrors.version[0]}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="effective_at">
                {t("effectiveAt")}
              </label>
              <Input
                id="effective_at"
                name="effective_at"
                type="date"
                required
              />
              {state.fieldErrors?.effective_at && (
                <p className="mt-1 text-xs text-destructive">
                  {state.fieldErrors.effective_at[0]}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="title">
              {t("title")}
            </label>
            <Input
              id="title"
              name="title"
              required
              placeholder={t("titlePlaceholder")}
            />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-destructive">
                {state.fieldErrors.title[0]}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="required_for_all"
              className="h-4 w-4 rounded border-input"
              defaultChecked
            />
            {t("requiredForAll")}
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

/**
 * PolicyPublishButton — flips the policy to is_current=true.
 * Atomically demotes the previous current version via the
 * legal_policies_set_current() helper.
 */
export function PolicyPublishButton({
  policyId,
  isCurrent,
  policyTitle,
}: {
  policyId: string;
  isCurrent: boolean;
  policyTitle: string;
}) {
  const t = useTranslations("admin.policies");
  const [state, formAction, pending] = useActionState<PolicyActionState, FormData>(
    publishPolicyAction,
    { ok: false, error: undefined },
  );
  const [, startTransition] = useTransition();

  if (state.ok) {
    setTimeout(() => {}, 0);
  }

  if (isCurrent) {
    return (
      <Button variant="secondary" size="sm" disabled>
        <CheckCircle2 className="h-4 w-4" />
        {t("currentVersion")}
      </Button>
    );
  }

  return (
    <form
      action={(fd) => {
        fd.set("policy_id", policyId);
        startTransition(() => {
          formAction(fd);
        });
      }}
    >
      <input type="hidden" name="policy_id" value={policyId} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("publishing")}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {t("publishVersion", { title: policyTitle })}
          </>
        )}
      </Button>
    </form>
  );
}
