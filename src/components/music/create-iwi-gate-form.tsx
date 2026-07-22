"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import { createIwiGateAction, type MusicActionState } from "@/lib/actions/music";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const initialState: MusicActionState = {};

export function CreateIwiGateForm() {
  const [state, formAction, isPending] = useActionState(createIwiGateAction, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add gate
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">New iwi gate</h3>
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

        <form action={formAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="iwi_name" className="text-sm font-medium">
                Iwi name <span className="text-destructive">*</span>
              </label>
              <input
                id="iwi_name"
                name="iwi_name"
                required
                placeholder="e.g. Ngāti Kahungunu"
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="hapu_name" className="text-sm font-medium">
                Hapū name
              </label>
              <input
                id="hapu_name"
                name="hapu_name"
                placeholder="Optional"
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="contact_name" className="text-sm font-medium">
                Contact name <span className="text-destructive">*</span>
              </label>
              <input
                id="contact_name"
                name="contact_name"
                required
                placeholder="Kaitiaki representative"
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="contact_email" className="text-sm font-medium">
                Contact email <span className="text-destructive">*</span>
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                required
                placeholder="kaitiaki@iwi.org.nz"
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="scope" className="text-sm font-medium">
                Scope <span className="text-destructive">*</span>
              </label>
              <select
                id="scope"
                name="scope"
                required
                defaultValue="iwi_only"
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="public">Public</option>
                <option value="iwi_only">Iwi only</option>
                <option value="hapu_only">Hapū only</option>
                <option value="restricted">Restricted</option>
                <option value="tapu">Tapu (no public release)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="applies_to_kind" className="text-sm font-medium">
                Applies to
              </label>
              <select
                id="applies_to_kind"
                name="applies_to_kind"
                defaultValue="release"
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="release">Releases</option>
                <option value="stem">Stems</option>
                <option value="research_document">Research documents</option>
                <option value="platform">Platform-wide</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Optional context, conditions, or expiry notes"
              className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
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
              {isPending ? "Creating…" : "Create gate"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
