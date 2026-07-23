"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  recordCulturalReviewAction,
  type CulturalReviewState,
  type CulturalDecision,
} from "@/lib/actions/cultural-review";

interface Props {
  releaseId: string;
  releaseTitle: string;
  lastDecision: CulturalDecision | null;
  parentCycleId: string | null;
}

const initialState: CulturalReviewState = {};

/**
 * <CulturalReviewForm/> — kaitiaki approval / rejection form.
 *
 * Uses useActionState to surface success / error inline. Submits to
 * recordCulturalReviewAction which validates role + records an
 * append-only audit row + updates the release status.
 */
export function CulturalReviewForm({
  releaseId,
  releaseTitle,
  lastDecision,
  parentCycleId,
}: Props) {
  const [state, formAction, pending] = useActionState(
    recordCulturalReviewAction,
    initialState,
  );

  const isApproval = lastDecision === "approved";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Record a review decision</CardTitle>
        <CardDescription>
          Last decision:{" "}
          {lastDecision ? (
            <Badge variant="secondary" className="capitalize">
              {lastDecision}
            </Badge>
          ) : (
            <Badge variant="outline">None yet</Badge>
          )}
          {isApproval && (
            <span className="ml-2 text-xs text-muted-foreground">
              Already approved — additional decisions will be recorded
              as new cycles
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="release_id" value={releaseId} />
          {parentCycleId && (
            <input type="hidden" name="parent_cycle_id" value={parentCycleId} />
          )}

          <div className="space-y-2">
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-foreground"
            >
              Notes <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder={`Reasoning for the decision. Visible in the audit history. e.g. "Iwi consent verified — released waiata approved for scheduling."`}
              className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              name="decision"
              value="approved"
              disabled={pending}
              className="bg-pounamu-500 text-pounamu-50 hover:bg-pounamu-400"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Approve
            </Button>
            <Button
              type="submit"
              name="decision"
              value="rejected"
              disabled={pending}
              variant="destructive"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Reject
            </Button>
          </div>

          {state.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="rounded-md border border-pounamu-500/40 bg-pounamu-500/10 px-3 py-2 text-sm text-pounamu-200">
              {state.success}
              {state.cycleId && (
                <span className="ml-2 font-mono text-xs opacity-70">
                  cycle {state.cycleId.slice(0, 8)}…
                </span>
              )}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}