"use client";

import Link from "next/link";
import { ArrowRight, Megaphone, Clock, Users, ShieldCheck, X } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TONO_HELP_TYPE_LABEL,
  TONO_STATUS_LABEL,
  TONO_VISIBILITY_LABEL,
  type TonoRow,
  type TonoStatus,
} from "@/lib/tono/types";

interface CreatorShape {
  id: string;
  full_name: string | null;
  iwi_affiliation_attested: string[] | null;
}

interface Props {
  tono: TonoRow;
  /** "creator" — current user is the tono creator (board view) */
  /** "helper" — current user is browsing as a potential helper (inbox / preview) */
  perspective: "creator" | "helper";
  /** Helper-side: creator profile so we can show who asked */
  creator?: CreatorShape | null;
  /** Helper-side: has the current user already proposed on this tono? */
  hasProposed?: boolean;
}

const STATUS_BADGE_VARIANT: Record<TonoStatus, "default" | "secondary" | "outline" | "destructive"> = {
  open: "default",
  in_conversation: "secondary",
  fulfilled: "outline",
  closed: "outline",
  withdrawn: "outline",
};

export function TonoCard({ tono, perspective, creator, hasProposed }: Props) {
  const linkHref = `/tono/${tono.id}`;
  const statusLabel = TONO_STATUS_LABEL[tono.status];
  const helpLabel = TONO_HELP_TYPE_LABEL[tono.help_type];

  const created = new Date(tono.created_at).toLocaleDateString("en-NZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={linkHref} className="block">
      <Card className="transition-colors hover:border-bronze-500/50">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Megaphone className="mt-0.5 h-4 w-4 text-bronze-300" />
              <div>
                <CardTitle className="text-base">
                  {helpLabel}
                  {tono.scope_iwi && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      · {tono.scope_iwi}
                    </span>
                  )}
                </CardTitle>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {tono.request_body}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={STATUS_BADGE_VARIANT[tono.status]}>{statusLabel}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Meta line */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Posted {created}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              {TONO_VISIBILITY_LABEL[tono.visibility]}
            </span>
            {tono.koha_is_monetary && tono.offered_koha && (
              <span className="flex items-center gap-1">
                <span>Koha:</span>
                <span className="text-foreground">{tono.offered_koha}</span>
              </span>
            )}
            {!tono.koha_is_monetary && tono.offered_koha && (
              <span className="flex items-center gap-1">
                <span>Offer:</span>
                <span className="text-foreground">{tono.offered_koha}</span>
              </span>
            )}
          </div>

          {/* Helper perspective: show creator + propose status */}
          {perspective === "helper" && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="text-xs text-muted-foreground">
                Asked by{" "}
                <span className="font-medium text-foreground">
                  {creator?.full_name ?? "Anonymous"}
                </span>
                {creator?.iwi_affiliation_attested?.[0] && (
                  <>
                    {" "}
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {creator.iwi_affiliation_attested[0]}
                    </Badge>
                  </>
                )}
              </div>
              {hasProposed ? (
                <Badge variant="outline" className="text-xs">
                  <X className="h-3 w-3" />
                  You proposed
                </Badge>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-bronze-300">
                  Open for proposals
                  <ArrowRight className="h-3 w-3" />
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
