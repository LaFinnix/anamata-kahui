"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  updateNewsAction,
  type NewsFormState,
} from "@/lib/actions/news";

interface Props {
  id: string;
  slug: string;
  initialKind: string;
  initialTitle: string;
  initialSummary: string;
  initialBodyMd: string;
  initialTags: string;
  initialMetaDescription: string;
  initialExternalUrl: string;
  disabled: boolean;
}

const initialState: NewsFormState = {};

export function EditNewsForm({
  id,
  slug,
  initialKind,
  initialTitle,
  initialSummary,
  initialBodyMd,
  initialTags,
  initialMetaDescription,
  initialExternalUrl,
  disabled,
}: Props) {
  const [state, formAction, pending] = useActionState(
    updateNewsAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slug" value={slug} />

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Title
        </span>
        <input
          name="title"
          type="text"
          required
          defaultValue={initialTitle}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Summary (1-2 sentences, shown on the index)
        </span>
        <input
          name="summary"
          type="text"
          defaultValue={initialSummary}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Body (markdown)
        </span>
        <textarea
          name="body_md"
          required
          defaultValue={initialBodyMd}
          disabled={disabled}
          rows={20}
          className="flex w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
            defaultValue={initialTags}
            disabled={disabled}
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            External URL (optional)
          </span>
          <input
            name="external_url"
            type="url"
            defaultValue={initialExternalUrl}
            disabled={disabled}
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Meta description (SEO)
        </span>
        <input
          name="meta_description"
          type="text"
          defaultValue={initialMetaDescription}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
      </label>

      <p className="text-xs text-muted-foreground">
        Kind: <span className="font-mono">{initialKind}</span>{" "}
        (cannot be changed — create a new entry if you need a different kind)
      </p>

      <Button type="submit" disabled={pending || disabled}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save changes
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