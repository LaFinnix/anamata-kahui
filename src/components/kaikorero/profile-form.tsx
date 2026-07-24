"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, Sparkles, Globe, Eye, EyeOff } from "lucide-react";

import { updateKaikoreroProfileAction } from "@/lib/actions/kaikorero-profile";
import {
  DOMAIN_LABEL,
  type KaikoreroProfileState,
  type KnowledgeAreaInput,
  type KnowledgeDomain,
  type ProfileKnowledgeArea,
} from "@/lib/kaikorero/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface ProfileForForm {
  full_name: string | null;
  email: string | null;
  role: string | null;
  bio: string | null;
  kaikorero_bio: string | null;
  kaikorero_visible: boolean;
  available_for_tono: boolean;
  iwi_affiliation_claimed: string[];
}

interface Props {
  profile: ProfileForForm;
  knowledgeAreas: ProfileKnowledgeArea[];
  knowledgeDomainOptions: readonly KnowledgeDomain[];
}

const initialState: KaikoreroProfileState = {};

/**
 * Build a JSON-string payload from the current chip list state.
 * Form posts a JSON string in `knowledge_areas` because the array-of-objects
 * shape needs structured input that plain form-data can't represent.
 */
function serializeAreas(areas: KnowledgeAreaInput[]): string {
  return JSON.stringify(
    areas.map((a) => ({
      domain: a.domain,
      ...(a.scope_iwi ? { scope_iwi: a.scope_iwi } : {}),
      ...(a.scope_region ? { scope_region: a.scope_region } : {}),
    })),
  );
}

function areaKey(a: { domain: KnowledgeDomain; scope_iwi?: string; scope_region?: string }) {
  return `${a.domain}::${a.scope_iwi ?? ""}::${a.scope_region ?? ""}`;
}

export function KaikoreroProfileForm({
  profile,
  knowledgeAreas,
  knowledgeDomainOptions,
}: Props) {
  const t = useTranslations("kaikorero");
  const tFields = useTranslations("kaikorero.fields");
  const tSections = useTranslations("kaikorero.sections");
  const tMessages = useTranslations("kaikorero.messages");

  const [state, formAction, isPending] = useActionState<KaikoreroProfileState, FormData>(
    updateKaikoreroProfileAction,
    initialState,
  );

  // Local state for the chip multi-select. Seed from server-loaded rows.
  const [areas, setAreas] = useState<KnowledgeAreaInput[]>(
    knowledgeAreas.map((ka) => ({
      domain: ka.domain,
      scope_iwi: ka.scope_iwi ?? undefined,
      scope_region: ka.scope_region ?? undefined,
    })),
  );

  const [adding, setAdding] = useState<KnowledgeDomain | "">("");
  const [addingIwi, setAddingIwi] = useState("");
  const [addingRegion, setAddingRegion] = useState("");

  const addArea = () => {
    if (!adding) return;
    const next: KnowledgeAreaInput = {
      domain: adding,
      ...(addingIwi.trim() ? { scope_iwi: addingIwi.trim() } : {}),
      ...(addingRegion.trim() ? { scope_region: addingRegion.trim() } : {}),
    };
    // Prevent duplicates by (domain, scope_iwi, scope_region)
    if (areas.some((a) => areaKey(a) === areaKey(next))) {
      // Reset the inputs but don't add
      setAdding("");
      setAddingIwi("");
      setAddingRegion("");
      return;
    }
    setAreas([...areas, next]);
    setAdding("");
    setAddingIwi("");
    setAddingRegion("");
  };

  const removeArea = (idx: number) => {
    setAreas(areas.filter((_, i) => i !== idx));
  };

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden field for the structured knowledge-areas payload */}
      <input type="hidden" name="knowledge_areas" value={serializeAreas(areas)} />

      {/* Bio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4 text-bronze-300" />
            {tSections("bio")}
          </CardTitle>
          <CardDescription>{tSections("bioHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="kaikorero_bio">{tFields("bioLabel")}</Label>
          <textarea
            id="kaikorero_bio"
            name="kaikorero_bio"
            rows={6}
            maxLength={2000}
            defaultValue={profile.kaikorero_bio ?? ""}
            placeholder={tFields("bioPlaceholder")}
            className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <p className="text-xs text-muted-foreground">{tFields("bioHint")}</p>
        </CardContent>
      </Card>

      {/* Iwi affiliations (claimed) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-4 w-4 text-bronze-300" />
            {tSections("iwi")}
          </CardTitle>
          <CardDescription>{tSections("iwiHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="iwi_affiliation_claimed">{tFields("iwiLabel")}</Label>
          <input
            id="iwi_affiliation_claimed"
            name="iwi_affiliation_claimed"
            type="text"
            defaultValue={profile.iwi_affiliation_claimed.join(", ")}
            placeholder={tFields("iwiPlaceholder")}
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <p className="text-xs text-muted-foreground">{tFields("iwiHint")}</p>
        </CardContent>
      </Card>

      {/* Knowledge areas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tSections("knowledgeAreas")}</CardTitle>
          <CardDescription>{tSections("knowledgeAreasHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing chips */}
          <div className="flex flex-wrap gap-2">
            {areas.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                {tFields("emptyAreas")}
              </p>
            )}
            {areas.map((a, idx) => (
              <span
                key={`${a.domain}-${idx}`}
                className="inline-flex items-center gap-2 rounded-full border border-bronze-400/40 bg-bronze-400/10 px-3 py-1.5 text-sm"
              >
                <span className="font-medium">{DOMAIN_LABEL[a.domain]}</span>
                {a.scope_iwi && (
                  <span className="text-muted-foreground">· {a.scope_iwi}</span>
                )}
                {a.scope_region && (
                  <span className="text-muted-foreground">· {a.scope_region}</span>
                )}
                <button
                  type="button"
                  onClick={() => removeArea(idx)}
                  aria-label={`Remove ${DOMAIN_LABEL[a.domain]}`}
                  className="ml-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>

          {/* Add-new row */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <select
              value={adding}
              onChange={(e) => setAdding(e.target.value as KnowledgeDomain | "")}
              className="flex h-10 rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">{tFields("domainSelect")}</option>
              {knowledgeDomainOptions.map((d) => (
                <option key={d} value={d}>
                  {DOMAIN_LABEL[d]}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={addingIwi}
              onChange={(e) => setAddingIwi(e.target.value)}
              placeholder={tFields("domainIwiPlaceholder")}
              className="flex h-10 rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <input
              type="text"
              value={addingRegion}
              onChange={(e) => setAddingRegion(e.target.value)}
              placeholder={tFields("domainRegionPlaceholder")}
              className="flex h-10 rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addArea}
              disabled={!adding}
            >
              <Plus className="h-4 w-4" />
              {tFields("addButton")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{tFields("duplicateHint")}</p>
        </CardContent>
      </Card>

      {/* Visibility + availability */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tSections("visibility")}</CardTitle>
          <CardDescription>{tSections("visibilityHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/30">
            <input
              type="checkbox"
              name="kaikorero_visible"
              defaultChecked={profile.kaikorero_visible}
              className="mt-1 h-4 w-4 rounded border-border text-bronze-400 focus:ring-bronze-400"
            />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                {profile.kaikorero_visible ? (
                  <Eye className="h-4 w-4 text-pounamu-300" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                {tFields("visibilityPublic")}
              </div>
              <p className="text-xs text-muted-foreground">{tFields("visibilityPublicHelp")}</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted/30">
            <input
              type="checkbox"
              name="available_for_tono"
              defaultChecked={profile.available_for_tono}
              className="mt-1 h-4 w-4 rounded border-border text-bronze-400 focus:ring-bronze-400"
            />
            <div>
              <div className="text-sm font-medium">{tFields("availableForTono")}</div>
              <p className="text-xs text-muted-foreground">{tFields("availableForTonoHelp")}</p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Status + submit */}
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
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tFields("saving")}
            </>
          ) : (
            tFields("save")
          )}
        </Button>
      </div>
    </form>
  );
}
