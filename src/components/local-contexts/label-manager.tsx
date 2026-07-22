"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, X, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { applyLabelAction, removeLabelAction, type LabelActionState } from "@/lib/actions/labels";
import type { LcLabel } from "@/lib/local-contexts/client";

interface Props {
  releaseId?: string;
  researchDocumentId?: string;
  catalogue: LcLabel[];
  currentLinks: { id: string; label: LcLabel | null }[];
}

const initialState: LabelActionState = {};

/**
 * <LabelManager/> — apply and remove Local Contexts labels on a release
 * or research document.
 *
 * Renders a list of currently-applied active labels at the top, then a
 * family-filtered picker below.
 */
export function LabelManager({
  releaseId,
  researchDocumentId,
  catalogue,
  currentLinks,
}: Props) {
  const [applyState, applyAction, applyPending] = useActionState(
    applyLabelAction,
    initialState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeLabelAction,
    initialState,
  );
  const [open, setOpen] = useState(false);
  const [family, setFamily] = useState<"all" | "tk" | "bc" | "notice">("all");

  const activeSlugs = new Set(
    currentLinks
      .map((l) => l.label?.slug)
      .filter((s): s is string => typeof s === "string"),
  );

  const visible =
    family === "all" ? catalogue : catalogue.filter((l) => l.family === family);

  return (
    <div className="space-y-3">
      {/* Currently applied labels */}
      <div className="flex flex-wrap gap-2">
        {currentLinks.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No Local Contexts labels applied yet.
          </p>
        ) : (
          currentLinks.map((link) => {
            if (!link.label) return null;
            return (
              <form
                key={link.id}
                action={removeAction}
                className="inline-flex items-center gap-1"
              >
                <input type="hidden" name="link_id" value={link.id} />
                <input type="hidden" name="reason" value="User removed" />
                <Badge
                  variant={
                    link.label.family === "tk"
                      ? "success"
                      : link.label.family === "bc"
                        ? "outline"
                        : "secondary"
                  }
                  className="gap-1"
                >
                  <ShieldCheck className="h-3 w-3" />
                  {link.label.label}
                </Badge>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={removePending}
                  aria-label={`Remove ${link.label.label}`}
                >
                  {removePending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              </form>
            );
          })
        )}
        {removeState?.error && (
          <p className="text-sm text-destructive">{removeState.error}</p>
        )}
        {removeState?.success && (
          <p className="text-sm text-pounamu-300">{removeState.success}</p>
        )}
      </div>

      {/* Add new */}
      {!open ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Local Contexts label
        </Button>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm">Add a label</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Close picker"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-1 text-xs">
              {(["all", "tk", "bc", "notice"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFamily(f)}
                  className={`rounded-full px-3 py-1 capitalize ${
                    family === f
                      ? "bg-bronze-400 text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {f === "all" ? "All" : f.toUpperCase()}
                </button>
              ))}
            </div>

            <form action={applyAction} className="space-y-2">
              {releaseId && <input type="hidden" name="release_id" value={releaseId} />}
              {researchDocumentId && (
                <input type="hidden" name="research_document_id" value={researchDocumentId} />
              )}

              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/30 p-2">
                {visible.map((l) => {
                  const alreadyApplied = activeSlugs.has(l.slug);
                  return (
                    <label
                      key={l.id}
                      className={`flex cursor-pointer items-start gap-2 rounded-md p-2 text-xs ${
                        alreadyApplied
                          ? "opacity-50"
                          : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="label_slug"
                        value={l.slug}
                        disabled={alreadyApplied}
                        required
                        className="mt-0.5 h-3 w-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {l.family}
                          </Badge>
                          <span className="font-medium">{l.label}</span>
                          {l.is_non_commercial && (
                            <Badge variant="secondary" className="text-[10px]">
                              Non-Commercial
                            </Badge>
                          )}
                          {alreadyApplied && (
                            <Badge variant="success" className="text-[10px]">
                              Already applied
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-muted-foreground">{l.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="space-y-1">
                <label htmlFor="evidence_url" className="text-xs text-muted-foreground">
                  Evidence / source URL (optional)
                </label>
                <input
                  id="evidence_url"
                  name="evidence_url"
                  type="url"
                  placeholder="https://localcontexts.org/projects/your-project-id"
                  className="flex h-9 w-full rounded-md border border-border bg-input px-3 py-1 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {applyState?.error && (
                <p className="text-sm text-destructive">{applyState.error}</p>
              )}
              {applyState?.success && (
                <p className="text-sm text-pounamu-300">{applyState.success}</p>
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
                <Button type="submit" size="sm" disabled={applyPending}>
                  {applyPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Apply label
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
