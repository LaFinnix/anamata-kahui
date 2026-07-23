"use client";

import { useActionState, useState } from "react";
import { Newspaper, Loader2, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createNewsAction, type NewsFormState } from "@/lib/actions/news";

const initialState: NewsFormState = {};

const KIND_LABELS: Record<string, string> = {
  release: "Release (waiata added, partner release)",
  feature: "Feature (new feature shipped)",
  milestone: "Milestone (corpus size, audit numbers)",
  partner: "Partner (new integration, new collaboration)",
  update: "Update (translations, fixes, infrastructure)",
};

/**
 * <CreateNewsForm/> — quick-start form for a new news draft.
 */
export function CreateNewsForm() {
  const [state, formAction, pending] = useActionState(
    createNewsAction,
    initialState,
  );
  const [kind, setKind] = useState<"release" | "feature" | "milestone" | "partner" | "update">("feature");

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr,180px]">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Title
          </span>
          <input
            name="title"
            required
            type="text"
            placeholder="e.g. Cultural review dashboard shipped"
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Kind
          </span>
          <div className="relative">
            <select
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
              className="flex h-10 w-full appearance-none rounded-md border border-border bg-input px-3 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Object.entries(KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Summary (1-2 sentences, shown on the index)
        </span>
        <input
          name="summary"
          type="text"
          placeholder="A one-line summary shown on the news index."
          className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Body (markdown) — start here, refine on the edit page
        </span>
        <textarea
          name="body_md"
          required
          rows={8}
          placeholder={"# Heading\n\nWrite your content in **markdown**.\n\n- Lists work\n- Tables work\n\n```\ncode blocks\n```"}
          className="flex w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Tags (comma-separated)
          </span>
          <input
            name="tags"
            type="text"
            placeholder="release,feature,cultural-review"
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            External URL (optional, "read more" link)
          </span>
          <input
            name="external_url"
            type="url"
            placeholder="https://..."
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Meta description (SEO, optional)
        </span>
        <input
          name="meta_description"
          type="text"
          placeholder="A 1-2 sentence summary for search engines"
          className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Newspaper className="h-4 w-4" />}
        Create draft
      </Button>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-pounamu-300">{state.success}</p>
      )}
    </form>
  );
}