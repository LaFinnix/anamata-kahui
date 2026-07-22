"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

import { createReleaseAction, type MusicActionState } from "@/lib/actions/music";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface IwiGate {
  id: string;
  iwi_name: string;
  hapu_name: string | null;
  scope: string;
}

interface Props {
  iwiGates: IwiGate[];
}

const initialState: MusicActionState = {};

/**
 * <CreateReleaseForm/> — inline form on the Releases page.
 *
 * Submitting calls `createReleaseAction` which inserts a draft release
 * in the Records branch. After successful creation, navigates to the
 * release detail page so the artist can upload stems.
 */
export function CreateReleaseForm({ iwiGates }: Props) {
  const [state, formAction, isPending] = useActionState(createReleaseAction, initialState);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // After success, navigate to the release detail page
  if (state?.success && state.releaseId && !isPending) {
    // Use a setTimeout to allow the form to close before navigation
    setTimeout(() => router.push(`/releases/${state.releaseId}`), 100);
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New release
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">New release</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            aria-label="Close form"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              name="title"
              required
              maxLength={200}
              placeholder="e.g. Hine-nui-te-pō"
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Short synopsis (optional)"
              className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="iwi_gate_id" className="text-sm font-medium">
              Iwi gate (optional)
            </label>
            <select
              id="iwi_gate_id"
              name="iwi_gate_id"
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— No specific iwi gate —</option>
              {iwiGates.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.iwi_name}
                  {g.hapu_name && ` (${g.hapu_name})`} — {g.scope}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Cultural-review gate. Pan-iwi default applies when unlinked.
            </p>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-sm text-pounamu-300">{state.success}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Creating…" : "Create release"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
