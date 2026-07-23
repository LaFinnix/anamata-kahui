"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Send, Archive, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  publishNewsAction,
  archiveNewsAction,
  type NewsFormState,
} from "@/lib/actions/news";

interface Props {
  id: string;
  slug: string;
  kind: string;
  title: string;
  summary: string | null;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
  tags: string[];
  canEdit: boolean;
}

const KIND_LABELS: Record<string, string> = {
  release: "Release",
  feature: "Feature",
  milestone: "Milestone",
  partner: "Partner",
  update: "Update",
};

const KIND_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  release: "default",
  feature: "default",
  milestone: "secondary",
  partner: "secondary",
  update: "outline",
};

/**
 * <NewsAdminRow/> — one row in the news admin list.
 */
export function NewsAdminRow({
  id,
  slug,
  kind,
  title,
  summary,
  status,
  publishedAt,
  updatedAt,
  tags,
  canEdit,
}: Props) {
  const [publishState, publishAction, publishing] = useActionState(
    publishNewsAction,
    {} as NewsFormState,
  );
  const [archiveState, archiveAction, archiving] = useActionState(
    archiveNewsAction,
    {} as NewsFormState,
  );

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
            <Badge variant={KIND_VARIANTS[kind] ?? "outline"} className="text-xs">
              {KIND_LABELS[kind] ?? kind}
            </Badge>
            <Badge variant={statusBadge.variant} className="text-xs">{statusBadge.label}</Badge>
          </div>
          <p className="mt-1 truncate font-medium">{title}</p>
          {summary && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{summary}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <code className="font-mono">/news/{slug}</code>
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
              href={`/news/${slug}`}
              target="_blank"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs hover:bg-muted"
            >
              <Eye className="h-3 w-3" />
              View
            </Link>
          )}

          {canEdit && (status === "draft" || status === "in_review") && (
            <Link
              href={`/admin/news/${id}`}
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