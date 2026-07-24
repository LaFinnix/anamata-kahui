import { Megaphone, ShieldCheck, Calendar, X } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TONO_HELP_TYPE_LABEL,
  TONO_STATUS_LABEL,
  TONO_VISIBILITY_LABEL,
  type TonoRow,
} from "@/lib/tono/types";
import { DOMAIN_LABEL } from "@/lib/kaikorero/types";

interface CreatorShape {
  id: string;
  full_name: string | null;
  role: string | null;
  iwi_affiliation_attested: string[] | null;
}

interface Props {
  tono: TonoRow;
  isCreator: boolean;
  creator: CreatorShape | null;
  linkedRelease: { id: string; title: string } | null;
}

export function TonoDetailCard({ tono, isCreator, creator, linkedRelease }: Props) {
  const created = new Date(tono.created_at).toLocaleDateString("en-NZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Megaphone className="mt-0.5 h-5 w-5 text-bronze-300" />
            <div>
              <CardTitle className="text-xl">
                {TONO_HELP_TYPE_LABEL[tono.help_type]}
              </CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{TONO_STATUS_LABEL[tono.status]}</Badge>
                <Badge variant="secondary">{TONO_VISIBILITY_LABEL[tono.visibility]}</Badge>
                {tono.knowledge_domain && (
                  <Badge variant="outline">{DOMAIN_LABEL[tono.knowledge_domain]}</Badge>
                )}
                {tono.scope_iwi && (
                  <Badge variant="secondary">{tono.scope_iwi}</Badge>
                )}
                {tono.scope_region && (
                  <Badge variant="secondary">{tono.scope_region}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Request body */}
        <div>
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {tono.request_body}
          </p>
        </div>

        {/* Meta */}
        <div className="space-y-2 border-t border-border pt-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Posted {created}
          </div>
          {creator && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isCreator ? (
                <span>Asked by you</span>
              ) : (
                <span>
                  Asked by{" "}
                  <span className="font-medium text-foreground">
                    {creator.full_name ?? "Anonymous"}
                  </span>
                  {creator.iwi_affiliation_attested?.[0] && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {creator.iwi_affiliation_attested[0]}
                    </Badge>
                  )}
                </span>
              )}
            </div>
          )}
          {linkedRelease && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Megaphone className="h-3.5 w-3.5" />
              Linked to:{" "}
              <span className="font-medium text-foreground">{linkedRelease.title}</span>
            </div>
          )}
          {tono.offered_koha && (
            <div className="rounded-md border border-bronze-400/30 bg-bronze-400/5 p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-bronze-300">
                {tono.koha_is_monetary ? "Monetary offer" : "Offer"}
              </div>
              <p className="mt-1 text-foreground">{tono.offered_koha}</p>
            </div>
          )}
          {tono.expires_at && (
            <div className="text-xs text-muted-foreground">
              Expires {new Date(tono.expires_at).toLocaleDateString("en-NZ")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
