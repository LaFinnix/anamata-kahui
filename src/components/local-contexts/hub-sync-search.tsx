"use client";

import { useActionState, useState } from "react";
import { Search, Loader2, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  searchHubAction,
  type BatchSearchState,
} from "@/lib/actions/batch-search";

const initialState: BatchSearchState = {};

/**
 * <HubSyncSearch/> — admin tool to find existing Hub Projects by
 * DOI or Anamata asset id and link them.
 *
 * Workflow:
 *   1. Admin enters DOI (e.g. 10.1234/anamata.2026.001) or Anamata id
 *   2. Search calls the Hub API
 *   3. If a match is found, the admin clicks "Open" to navigate to
 *      the matching asset page where they can attach the project
 *   4. If no match, the admin creates a Hub Project at
 *      https://localcontextshub.org and pastes the UUID back into
 *      the Label Manager
 */
export function HubSyncSearch() {
  const [state, formAction, pending] = useActionState(searchHubAction, initialState);
  const [identifierType, setIdentifierType] = useState<"doi" | "provider_id">("doi");

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-sm">Sync from Hub</h3>
            <p className="text-xs text-muted-foreground">
              Find existing Local Contexts Hub Projects and link them to
              Anamata assets.
            </p>
          </div>
        </div>

        <form action={formAction} className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIdentifierType("doi")}
              className={`rounded-md px-3 py-1 text-xs ${
                identifierType === "doi"
                  ? "bg-bronze-400 text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              By DOI
            </button>
            <button
              type="button"
              onClick={() => setIdentifierType("provider_id")}
              className={`rounded-md px-3 py-1 text-xs ${
                identifierType === "provider_id"
                  ? "bg-bronze-400 text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              By Anamata id
            </button>
          </div>

          <input type="hidden" name="identifier_type" value={identifierType} />

          <input
            type="text"
            name="value"
            placeholder={
              identifierType === "doi"
                ? "10.1234/anamata.2026.001"
                : "5ccbd3a0-93ca-4915-81a5-1a90423b537c"
            }
            className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" size="sm" disabled={pending}>
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
            Search Hub
          </Button>
        </form>

        {state?.results && state.results.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            {state.results.map((r) => (
              <div
                key={r.unique_id}
                className="rounded-md border border-border bg-muted/30 p-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium">{r.title || "(untitled)"}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {r.unique_id}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {r.label_count} label{r.label_count === 1 ? "" : "s"}
                      </Badge>
                      {r.doi && (
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {r.doi}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <a
                    href={r.project_page}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-bronze-300 hover:text-bronze-200"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Copy this UUID and paste it into the Label Manager on
                  the matching asset's page.
                </p>
              </div>
            ))}
          </div>
        )}

        {state?.results && state.results.length === 0 && (
          <p className="text-xs italic text-muted-foreground">
            No matching Hub Projects. Create one at{" "}
            <a
              href="https://localcontextshub.org"
              target="_blank"
              rel="noreferrer"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              localcontextshub.org
            </a>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}
