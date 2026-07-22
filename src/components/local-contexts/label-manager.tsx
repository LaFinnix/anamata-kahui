"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, X, ExternalLink, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  attachHubProjectAction,
  refreshHubCacheAction,
  detachHubProjectAction,
  type HubActionState,
} from "@/lib/actions/hub";
import { getEmbeddedCatalogue, type LcLabel } from "@/lib/local-contexts/client";

interface Props {
  releaseId?: string;
  researchDocumentId?: string;
  catalogue: LcLabel[];
  currentHubProjectId: string | null;
  cachedLabelCount: number;
  lastSyncedAt: string | null;
}

const initialState: HubActionState = {};

/**
 * <LabelManager/> — attach a Local Contexts Hub Project to a release or
 * research document.
 *
 * Workflow:
 *   1. Create a project at https://localcontextshub.org (out of band)
 *   2. Paste the Hub project UUID here
 *   3. We fetch the project, cache its labels/notices, and surface them
 *      publicly + on the dashboard
 *   4. Refresh button re-fetches only when the Hub says it changed
 *   5. Detach removes the link (cache retained)
 */
export function LabelManager({
  releaseId,
  researchDocumentId,
  catalogue,
  currentHubProjectId,
  cachedLabelCount,
  lastSyncedAt,
}: Props) {
  const [attachState, attachAction, attachPending] = useActionState(
    attachHubProjectAction,
    initialState,
  );
  const [refreshState, refreshAction, refreshPending] = useActionState(
    refreshHubCacheAction,
    initialState,
  );
  const [detachState, detachAction, detachPending] = useActionState(
    detachHubProjectAction,
    initialState,
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Currently attached */}
      {currentHubProjectId ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-pounamu-300" />
                  <span className="text-sm font-medium">Hub project attached</span>
                  <Badge variant="success" className="gap-1">
                    {cachedLabelCount} label{cachedLabelCount === 1 ? "" : "s"}
                  </Badge>
                </div>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {currentHubProjectId}
                </p>
                {lastSyncedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last synced {new Date(lastSyncedAt).toLocaleString("en-NZ")}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <form action={refreshAction}>
                  {releaseId && <input type="hidden" name="release_id" value={releaseId} />}
                  {researchDocumentId && (
                    <input type="hidden" name="research_document_id" value={researchDocumentId} />
                  )}
                  <Button type="submit" variant="secondary" size="sm" disabled={refreshPending}>
                    {refreshPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}
                    Refresh
                  </Button>
                </form>
                <form action={detachAction}>
                  {releaseId && <input type="hidden" name="release_id" value={releaseId} />}
                  {researchDocumentId && (
                    <input type="hidden" name="research_document_id" value={researchDocumentId} />
                  )}
                  <Button type="submit" variant="ghost" size="sm" disabled={detachPending}>
                    Detach
                  </Button>
                </form>
              </div>
            </div>
            <a
              href={`https://localcontextshub.org/projects/${currentHubProjectId}/`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-bronze-300 hover:text-bronze-200"
            >
              Open on Local Contexts Hub <ExternalLink className="h-3 w-3" />
            </a>
            {refreshState?.success && (
              <p className="text-xs text-pounamu-300">{refreshState.success}</p>
            )}
            {refreshState?.error && (
              <p className="text-xs text-destructive">{refreshState.error}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          No Hub project attached yet.
        </p>
      )}

      {/* Add new */}
      {!open ? (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {currentHubProjectId ? "Replace Hub project" : "Attach Hub project"}
        </Button>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-sm">Attach a Hub project</h4>
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

            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p>
                1. Create a project at{" "}
                <a
                  href="https://localcontextshub.org"
                  target="_blank"
                  rel="noreferrer"
                  className="text-bronze-300 hover:text-bronze-200 underline"
                >
                  localcontextshub.org
                </a>{" "}
                and add your TK/BC labels.
              </p>
              <p className="mt-1">2. Copy the project UUID from the URL.</p>
              <p className="mt-1">3. Paste it below to link this asset.</p>
            </div>

            <form action={attachAction} className="space-y-2">
              {releaseId && <input type="hidden" name="release_id" value={releaseId} />}
              {researchDocumentId && (
                <input type="hidden" name="research_document_id" value={researchDocumentId} />
              )}
              <input
                type="text"
                name="hub_project_id"
                required
                placeholder="e.g. 9f8a2c0b-1234-5678-90ab-cdef12345678"
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {attachState?.error && (
                <p className="text-sm text-destructive">{attachState.error}</p>
              )}
              {attachState?.success && (
                <p className="text-sm text-pounamu-300">{attachState.success}</p>
              )}
              {detachState?.error && (
                <p className="text-sm text-destructive">{detachState.error}</p>
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
                <Button type="submit" size="sm" disabled={attachPending}>
                  {attachPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Attach
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Re-export the catalogue for backward compat
export { getEmbeddedCatalogue };
export type { LcLabel };
