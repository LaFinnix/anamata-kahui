import Link from "next/link";
import { ShieldCheck, Lock, ExternalLink, Microscope, BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { LcLabelLink } from "@/lib/local-contexts/client";

interface Props {
  labels: LcLabelLink[];
  /** Layout: "row" (single line with wrap) or "grid" (chips) */
  layout?: "row" | "grid";
  /** Show applied-by + applied-at metadata */
  showMeta?: boolean;
}

const FAMILY_LABELS = {
  tk: { label: "TK", color: "bg-pounamu-500/15 text-pounamu-200 border-pounamu-500/40", icon: ShieldCheck },
  bc: { label: "BC", color: "bg-bronze-400/15 text-bronze-200 border-bronze-500/40", icon: Microscope },
  notice: { label: "Notice", color: "bg-muted text-foreground/80 border-border", icon: BookOpen },
} as const;

/**
 * Renders active Local Contexts labels as badges.
 *
 * Each label links to its canonical_url on localcontexts.org where the
 * user can read the full provenance text.
 *
 * `labels` is expected to be the active set already filtered server-side.
 */
export function LocalContextsLabels({ labels, layout = "row", showMeta = false }: Props) {
  if (labels.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">
        No Local Contexts labels applied yet.
      </p>
    );
  }

  const containerClass =
    layout === "row"
      ? "flex flex-wrap gap-2"
      : "grid gap-2 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={containerClass}>
      {labels.map((link) => {
        const fam = (link.label?.family ?? "notice") as keyof typeof FAMILY_LABELS;
        const meta = FAMILY_LABELS[fam];
        const Icon = meta.icon;
        const label = link.label?.label ?? link.label_id;
        const href = link.label?.canonical_url ?? "https://localcontexts.org/labels";
        return (
          <Link
            key={link.id}
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`group inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:opacity-80 ${meta.color}`}
            title={link.label?.description}
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span className="font-medium">{meta.label}</span>
            <span className="opacity-70">·</span>
            <span>{label.replace(`${meta.label} `, "")}</span>
            {link.label?.is_non_commercial && (
              <Lock className="h-3 w-3 shrink-0 opacity-70" aria-label="Non-commercial" />
            )}
            <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
            {showMeta && (
              <span className="ml-1 text-[10px] opacity-60">
                applied {new Date(link.applied_at).toLocaleDateString("en-NZ", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Compact inline variant — shows count and a few labels. Used in
 * release cards / row contexts.
 */
export function LocalContextsLabelCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Badge variant="outline" className="gap-1 text-xs">
      <ShieldCheck className="h-3 w-3" />
      {count} Local Contexts label{count === 1 ? "" : "s"}
    </Badge>
  );
}
