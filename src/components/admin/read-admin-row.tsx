"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Send, Archive, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  publishReadAction,
  archiveReadAction,
  type ReadFormState,
} from "@/lib/actions/reads";

interface Props {
  id: string;
  slug: string;
  kind: string;
  title: string;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
  readingTime: number;
  tags: string[];
  canEdit: boolean;
}

/**
 * <ReadAdminRow/> — one row in the admin list. Shows status, kind,
 * reading time, and offers the appropriate actions:
 *   - draft / in_review: publish + edit
 *   - published: view live + (super admin) archive
 *   - archived: archive notice
 */
export function ReadAdminRow({
  id,
  slug,
  kind,
  title,
  status,
  publishedAt,
  updatedAt,
  readingTime,
  tags,
  canEdit,
}: Props) {
  const [publishState, publishAction, publishing] = useActionState(
    publishReadAction,
    {} as ReadFormState,
  );
  const [archiveState, archiveAction, archiving] = useActionState(
    archiveReadAction,
    {} as ReadFormState,
  );

  const kindBadge =
    kind === "note" ? "Note" :
    kind === "research" ? "Research" :
    "Data drop";

  const statusBadge =
    status === "draft" ? { variant: "secondary" as const, label: "Draft" } :
    status === "in_review" ? { variant: "outline" as const, label: "In review" } :
    status === "published" ? { variant: "default" as const, label: "Published" } :
    { variant: "outline" as const, label: "Archived" };

  return (
    <div className="rounded-md border border-border bg-card/50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">{kindBadge}</Badge>
            <Badge variant={statusBadge.variant} className="text-xs">{statusBadge.label}</Badge>
            <span className="text-xs text-muted-foreground">
              {readingTime} min read
            </span>
          </div>
          <p className="mt-1 truncate font-medium">{title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <code className="font-mono">/reads/{slug}</code>
            {tags.length > 0 && (
              <>
                <span>·</span>
                <span>{tags.join(", ")}</span>
              </>
            )}
            <span>·</span>
            <span>
              {status === "published" && publishedAt
                ? `Published ${new Date(publishedAt).toLocaleDateString()}`
                : `Updated ${new Date(updatedAt).toLocaleDateString()}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "published" && (
            <Link
              href={`/reads/${slug}`}
              target="_blank"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs hover:bg-muted"
            >
              <Eye className="h-3 w-3" />
              View
            </Link>
          )}

          {canEdit && (status === "draft" || status === "in_review") && (
            <Link
              href={`/admin/reads/${id}`}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs hover:bg-muted"
            >
              <ArrowRight className="h-3 w-3" />
              Edit
            </Link>
          )}

          {canEdit && (status === "draft" || status === "in_review") && (
            <form action={publishAction}>
              <input type="hidden" name="id" value={id} />
              <Button
                type="submit"
                size="sm"
                variant="default"
                disabled={publishing}
              >
                {publishing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Publish
              </Button>
            </form>
          )}

          {canEdit && (status === "published" || status === "draft") && (
            <form action={archiveAction}>
              <input type="hidden" name="id" value={id} />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                disabled={archiving}
                className="text-muted-foreground hover:text-destructive"
              >
                {archiving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Archive className="h-3 w-3" />
                )}
                Archive
              </Button>
            </form>
          )}
        </div>
      </div>

      {(publishState?.error || archiveState?.error) && (
        <p className="mt-2 text-xs text-destructive">
          {publishState?.error || archiveState?.error}
        </p>
      )}
    </div>
  );
}