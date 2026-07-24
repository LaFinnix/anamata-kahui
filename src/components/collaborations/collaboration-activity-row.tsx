import Link from "next/link";
import { Award, Megaphone, ArrowRight, ShieldOff } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  domainLabel,
  endorsementTypeLabel,
  helpTypeLabel,
  type CollaborationEntry,
} from "@/lib/queries/collaborations";

/**
 * <CollaborationActivityRow/> — render a single public-safe collaboration
 * entry (either an endorsement or a resolved tono).
 *
 * Display rules (see COLLABORATION-MARKETPLACE-PLAN.md §4.3, §5.1):
 *   - Endorsement row: two parties + type + scope + notes (if any)
 *   - Tono row: creator + (fulfiller if fulfilled) + help type + scope
 *   - Revoked endorsements show "Revoked" badge but never hidden — the
 *     append-only-with-revocation model is part of the lineage.
 */
export function CollaborationActivityRow({ entry }: { entry: CollaborationEntry }) {
  if (entry.kind === "endorsement") {
    return <EndorsementRow entry={entry} />;
  }
  return <TonoRow entry={entry} />;
}

function EndorsementRow({ entry }: { entry: Extract<CollaborationEntry, { kind: "endorsement" }> }) {
  const isRevoked = entry.status === "revoked";
  return (
    <Card className={isRevoked ? "opacity-70" : undefined}>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Award className="h-4 w-4 text-bronze-300" />
          <span className="font-medium">
            {endorsementTypeLabel(entry.endorsement_type)}
          </span>
          {entry.knowledge_domain && (
            <Badge variant="secondary">{domainLabel(entry.knowledge_domain)}</Badge>
          )}
          {isRevoked && (
            <Badge variant="destructive" className="gap-1">
              <ShieldOff className="h-3 w-3" />
              Revoked
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {entry.endorser ? (
            <Link
              href={`/[locale]/artist/${entry.endorser.id}` as never}
              className="font-medium hover:underline"
            >
              {entry.endorser.full_name ?? "Kāhui member"}
            </Link>
          ) : (
            <span className="font-medium italic text-muted-foreground">unknown</span>
          )}
          {entry.endorser?.iwi_affiliation_attested?.[0] && (
            <Badge variant="outline" className="text-xs">
              {entry.endorser.iwi_affiliation_attested[0]}
            </Badge>
          )}
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">endorsed</span>
          {entry.recipient ? (
            <Link
              href={`/[locale]/artist/${entry.recipient.id}` as never}
              className="font-medium hover:underline"
            >
              {entry.recipient.full_name ?? "Kāhui member"}
            </Link>
          ) : (
            <span className="font-medium italic text-muted-foreground">unknown</span>
          )}
          {entry.recipient?.iwi_affiliation_attested?.[0] && (
            <Badge variant="outline" className="text-xs">
              {entry.recipient.iwi_affiliation_attested[0]}
            </Badge>
          )}
        </div>

        {(entry.scope_iwi || entry.scope_region || entry.work) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {entry.scope_iwi && <span>Iwi: {entry.scope_iwi}</span>}
            {entry.scope_region && <span>Region: {entry.scope_region}</span>}
            {entry.work && (
              <span>
                Work: <span className="font-medium">{entry.work.title}</span>
              </span>
            )}
          </div>
        )}

        {entry.notes && (
          <p className="text-sm text-muted-foreground italic">
            &ldquo;{truncate(entry.notes, 240)}&rdquo;
          </p>
        )}

        {isRevoked && entry.revocation_reason && (
          <p className="text-xs text-destructive">
            Revocation reason: {entry.revocation_reason}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {formatDate(entry.created_at)}
        </p>
      </CardContent>
    </Card>
  );
}

function TonoRow({ entry }: { entry: Extract<CollaborationEntry, { kind: "tono" }> }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Megaphone className="h-4 w-4 text-bronze-300" />
          <span className="font-medium">{helpTypeLabel(entry.help_type)}</span>
          {entry.knowledge_domain && (
            <Badge variant="secondary">{domainLabel(entry.knowledge_domain)}</Badge>
          )}
          <Badge
            variant={
              entry.status === "fulfilled"
                ? "default"
                : entry.status === "closed"
                ? "secondary"
                : "outline"
            }
          >
            {entry.status}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {entry.creator ? (
            <Link
              href={`/[locale]/artist/${entry.creator.id}` as never}
              className="font-medium hover:underline"
            >
              {entry.creator.full_name ?? "Kāhui member"}
            </Link>
          ) : (
            <span className="font-medium italic text-muted-foreground">unknown</span>
          )}
          {entry.creator?.iwi_affiliation_attested?.[0] && (
            <Badge variant="outline" className="text-xs">
              {entry.creator.iwi_affiliation_attested[0]}
            </Badge>
          )}
          {entry.fulfiller && (
            <>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">fulfilled by</span>
              <Link
                href={`/[locale]/artist/${entry.fulfiller.id}` as never}
                className="font-medium hover:underline"
              >
                {entry.fulfiller.full_name ?? "Kāhui member"}
              </Link>
              {entry.fulfiller.iwi_affiliation_attested?.[0] && (
                <Badge variant="outline" className="text-xs">
                  {entry.fulfiller.iwi_affiliation_attested[0]}
                </Badge>
              )}
            </>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {truncate(entry.request_body, 320)}
        </p>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {entry.scope_iwi && <span>Iwi: {entry.scope_iwi}</span>}
          {entry.scope_region && <span>Region: {entry.scope_region}</span>}
        </div>

        <p className="text-xs text-muted-foreground">
          {formatDate(entry.created_at)}
          {entry.closed_at && (
            <> · closed {formatDate(entry.closed_at)}</>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).trimEnd() + "…";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
