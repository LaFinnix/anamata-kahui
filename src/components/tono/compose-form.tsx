"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Globe, Sparkles, EyeOff, Eye } from "lucide-react";

import { createTonoAction } from "@/lib/actions/tono";
import type { TonoState, TonoHelpType, TonoVisibility } from "@/lib/tono/types";
import { TONO_HELP_TYPE_LABEL, TONO_VISIBILITY_LABEL } from "@/lib/tono/types";
import type { KnowledgeDomain } from "@/lib/kaikorero/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Props {
  helpTypeOptions: readonly TonoHelpType[];
  visibilityOptions: readonly TonoVisibility[];
  knowledgeDomainOptions: readonly KnowledgeDomain[];
  domainLabel: Record<KnowledgeDomain, string>;
  releases: { id: string; title: string }[];
}

const initialState: TonoState = {};

export function TonoComposeForm({
  helpTypeOptions,
  visibilityOptions,
  knowledgeDomainOptions,
  domainLabel,
  releases,
}: Props) {
  const t = useTranslations("tono");
  const tHelpType = useTranslations("tono.helpType");
  const tVisibility = useTranslations("tono.visibility");

  const [state, formAction, pending] = useActionState<TonoState, FormData>(
    createTonoAction,
    initialState,
  );

  // Visibility-tier conditional fields
  const [visibility, setVisibility] = useState<TonoVisibility>("open");

  const visibilityHelp: Record<TonoVisibility, string> = {
    open: tVisibility("openHelp" as never) as string,
    invited: tVisibility("invitedHelp" as never) as string,
    iwi_specific: tVisibility("iwiSpecificHelp" as never) as string,
  };

  return (
    <form action={formAction} className="space-y-6">
      {/* Help type + knowledge area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4 text-bronze-300" />
            {t("compose.whatYouNeed")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="help_type">{t("compose.helpType")}</Label>
            <select
              id="help_type"
              name="help_type"
              required
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              defaultValue=""
            >
              <option value="" disabled>
                Select…
              </option>
              {helpTypeOptions.map((ht) => (
                <option key={ht} value={ht}>
                  {tHelpType(ht as never)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="knowledge_domain">
              {t("compose.knowledgeArea")}{" "}
              <span className="text-muted-foreground">{t("compose.knowledgeAreaOptional")}</span>
            </Label>
            <select
              id="knowledge_domain"
              name="knowledge_domain"
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              defaultValue=""
            >
              <option value="">{t("compose.noSpecificDomain")}</option>
              {knowledgeDomainOptions.map((d) => (
                <option key={d} value={d}>
                  {domainLabel[d]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scope_iwi">{t("compose.scopeIwi")}</Label>
              <input
                id="scope_iwi"
                name="scope_iwi"
                type="text"
                placeholder={t("compose.scopeIwiPlaceholder")}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope_region">{t("compose.scopeRegion")}</Label>
              <input
                id="scope_region"
                name="scope_region"
                type="text"
                placeholder={t("compose.scopeRegionPlaceholder")}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request body */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("compose.requestItself")}</CardTitle>
          <CardDescription>{t("compose.requestItselfDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            name="request_body"
            rows={6}
            required
            minLength={1}
            maxLength={4000}
            placeholder={t("compose.requestBodyPlaceholder")}
            className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <p className="mt-2 text-xs text-muted-foreground">{t("compose.requestBodyHelp")}</p>
        </CardContent>
      </Card>

      {/* Optional koha */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("compose.koha")}</CardTitle>
          <CardDescription>{t("compose.kohaDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            name="offered_koha"
            rows={2}
            maxLength={2000}
            placeholder={t("compose.kohaPlaceholder")}
            className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="koha_is_monetary"
              className="h-4 w-4 rounded border-border text-bronze-400 focus:ring-bronze-400"
            />
            <span className="text-muted-foreground">{t("compose.kohaMonetary")}</span>
          </label>
        </CardContent>
      </Card>

      {/* Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-4 w-4 text-bronze-300" />
            {t("compose.visibility")}
          </CardTitle>
          <CardDescription>{t("compose.visibilityDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            {visibilityOptions.map((v) => (
              <label
                key={v}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/30"
              >
                <input
                  type="radio"
                  name="visibility"
                  value={v}
                  checked={visibility === v}
                  onChange={() => setVisibility(v)}
                  className="mt-1 h-4 w-4 border-border text-bronze-400 focus:ring-bronze-400"
                />
                <div>
                  <div className="text-sm font-medium">
                    {tVisibility(v as never)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {visibilityHelp[v]}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {visibility === "iwi_specific" && (
            <p className="text-xs text-bronze-300">{t("compose.iwiSpecificHelp")}</p>
          )}
        </CardContent>
      </Card>

      {/* Optional anchor to a work */}
      {releases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("compose.anchorRelease")}</CardTitle>
            <CardDescription>{t("compose.anchorReleaseDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <select
              name="work_id"
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              defaultValue=""
            >
              <option value="">{t("compose.noRelease")}</option>
              {releases.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

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
              {t("compose.postingButton")}
            </>
          ) : (
            t("compose.postButton")
          )}
        </Button>
      </div>
    </form>
  );
}
