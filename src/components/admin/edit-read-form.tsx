"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  updateReadAction,
  type ReadFormState,
} from "@/lib/actions/reads";

interface Props {
  id: string;
  slug: string;
  initialTitle: string;
  initialSubtitle: string;
  initialBodyMd: string;
  initialTags: string;
  initialMetaDescription: string;
  disabled: boolean;
}

const initialState: ReadFormState = {};

/**
 * <EditReadForm/> — full editor for an existing read.
 *
 * Pass `disabled` for published reads (authors can't edit; only super
 * admins can correct them).
 */
export function EditReadForm({
  id,
  slug,
  initialTitle,
  initialSubtitle,
  initialBodyMd,
  initialTags,
  initialMetaDescription,
  disabled,
}: Props) {
  const [state, formAction, pending] = useActionState(
    updateReadAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slug" value={slug} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
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
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Subtitle
          </span>
          <input
            name="subtitle"
            type="text"
            defaultValue={initialSubtitle}
            disabled={disabled}
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Body (markdown)
        </span>
        <textarea
          name="body_md"
          required
          defaultValue={initialBodyMd}
          disabled={disabled}
          rows={24}
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
      </div>

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