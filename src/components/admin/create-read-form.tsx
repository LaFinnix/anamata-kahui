"use client";

import { useActionState, useState } from "react";
import { FileText, Loader2, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createReadAction, type ReadFormState } from "@/lib/actions/reads";

const initialState: ReadFormState = {};

/**
 * <CreateReadForm/> — quick-start form for a new draft.
 *
 * Authors fill in: title + kind + a placeholder body. The detailed
 * editing happens on the /admin/reads/[id] page once created.
 */
export function CreateReadForm() {
  const [state, formAction, pending] = useActionState(
    createReadAction,
    initialState,
  );
  const [kind, setKind] = useState<"note" | "research" | "data_drop">("note");

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
            placeholder="e.g. The Anamata Records corpus"
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
              <option value="note">Note (1.5k-3k words)</option>
              <option value="research">Research (3k-8k words)</option>
              <option value="data_drop">Data drop (+ dataset)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Subtitle (optional)
        </span>
        <input
          name="subtitle"
          type="text"
          placeholder="A one-line summary shown on the index"
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
            placeholder="music, governance, data"
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="space-y-1">
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
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
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