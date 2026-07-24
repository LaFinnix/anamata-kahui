"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, X, ShieldOff, Award } from "lucide-react";

import { revokeEndorsementAction } from "@/lib/actions/endorsements";
import type { EndorsementWithActor } from "@/lib/endorsements/types";
import { ENDORSEMENT_TYPE_LABEL } from "@/lib/endorsements/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  given: EndorsementWithActor[];
  received: EndorsementWithActor[];
  activeTab: "given" | "received";
}

type RevokeState =
  | { error?: string; success?: string }
  | null;

const initialRevokeState: RevokeState = null;

export function EndorsementsTabs({ given, received, activeTab }: Props) {
  const t = useTranslations("endorsements");
  const [tab, setTab] = useState<"given" | "received">(activeTab);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
        <TabButton
          active={tab === "given"}
          onClick={() => setTab("given")}
          count={given.length}
        >
          {t("tabs.given")}
        </TabButton>
        <TabButton
          active={tab === "received"}
          onClick={() => setTab("received")}
          count={received.length}
        >
          {t("tabs.received")}
        </TabButton>
      </div>

      {/* Tab content */}
      {tab === "given" ? (
        <GivenList given={given} revokeId={revokeId} setRevokeId={setRevokeId} />
      ) : (
        <ReceivedList received={received} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      <Badge variant={active ? "secondary" : "outline"} className="text-xs">
        {count}
      </Badge>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Given list — with revoke form                                               */
/* -------------------------------------------------------------------------- */

function GivenList({
  given,
  revokeId,
  setRevokeId,
}: {
  given: EndorsementWithActor[];
  revokeId: string | null;
  setRevokeId: (id: string | null) => void;
}) {
  const t = useTranslations("endorsements");
  const tGiven = useTranslations("endorsements.given");
  const tRev = useTranslations("endorsements.revocation");
  if (given.length === 0) {
    return <EmptyState message={tGiven("empty")} />;
  }

  return (
    <div className="space-y-3">
      {given.map((e) => (
        <Card key={e.id}>
          <CardContent className="p-4">
            <EndorsementHeader e={e} direction="given" />
            {e.status === "revoked" ? (
              <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-destructive">
                  <ShieldOff className="h-3 w-3" />
                  {tRev("label")}
                  {e.revoked_at && (
                    <span className="text-xs text-muted-foreground">
                      · {new Date(e.revoked_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {e.revoked_reason && (
                  <p className="mt-1 text-muted-foreground">{e.revoked_reason}</p>
                )}
              </div>
            ) : revokeId === e.id ? (
              <RevokeForm
                endorsementId={e.id}
                onCancel={() => setRevokeId(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setRevokeId(e.id)}
                className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
                {tGiven("revokeButton")}
              </button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RevokeForm({
  endorsementId,
  onCancel,
}: {
  endorsementId: string;
  onCancel: () => void;
}) {
  const tGiven = useTranslations("endorsements.given");
  const t = useTranslations("endorsements");
  const [state, formAction, pending] = useActionState<RevokeState, FormData>(
    revokeEndorsementAction,
    initialRevokeState,
  );

  return (
    <form
      action={formAction}
      className="mt-3 space-y-2 rounded-md border border-border bg-muted/30 p-3"
    >
      <input type="hidden" name="endorsement_id" value={endorsementId} />
      <label
        htmlFor={`reason-${endorsementId}`}
        className="block text-xs font-medium text-foreground"
      >
        {tGiven("revokeTitle")}
      </label>
      <textarea
        id={`reason-${endorsementId}`}
        name="reason"
        rows={3}
        required
        minLength={1}
        maxLength={2000}
        placeholder={tGiven("revokePlaceholder")}
        className="flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      {state?.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-pounamu-300">{state.success}</p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" variant="destructive" size="sm" disabled={pending}>
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          {tGiven("revokeConfirm")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          {tGiven("revokeCancel")}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Received list                                                              */
/* -------------------------------------------------------------------------- */

function ReceivedList({ received }: { received: EndorsementWithActor[] }) {
  const tReceived = useTranslations("endorsements.received");
  const tRev = useTranslations("endorsements.revocation");
  if (received.length === 0) {
    return (
      <EmptyState message={tReceived("empty")} />
    );
  }

  return (
    <div className="space-y-3">
      {received.map((e) => (
        <Card key={e.id}>
          <CardContent className="p-4">
            <EndorsementHeader e={e} direction="received" />
            {e.status === "revoked" && (
              <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-destructive">
                  <ShieldOff className="h-3 w-3" />
                  {tReceived("revokedBy")}
                  {e.revoked_at && (
                    <span className="text-xs text-muted-foreground">
                      · {new Date(e.revoked_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {e.revoked_reason && (
                  <p className="mt-1 text-muted-foreground">
                    <span className="text-xs uppercase tracking-wider">{tRev("reasonLabel")}:</span>{" "}
                    {e.revoked_reason}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared sub-components                                                      */
/* -------------------------------------------------------------------------- */

function EndorsementHeader({
  e,
  direction,
}: {
  e: EndorsementWithActor;
  direction: "given" | "received";
}) {
  const tGiven = useTranslations("endorsements.given");
  const tReceived = useTranslations("endorsements.received");
  const otherParty = direction === "given" ? e.recipient : e.endorser;
  const otherLabel =
    direction === "given" ? tGiven("toLabel") : tReceived("fromLabel");

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{otherLabel}</span>
          {otherParty ? (
            <Link
              href={`/[locale]/artist/${otherParty.id}` as never}
              className="font-medium hover:underline"
            >
              {otherParty.full_name ?? "Kāhui member"}
            </Link>
          ) : (
            <span className="font-medium italic text-muted-foreground">unknown</span>
          )}
          {otherParty?.iwi_affiliation_attested?.[0] && (
            <Badge variant="secondary" className="text-xs">
              {otherParty.iwi_affiliation_attested[0]}
            </Badge>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant="outline">
            {ENDORSEMENT_TYPE_LABEL[e.endorsement_type]}
          </Badge>
          {e.knowledge_domain && <Badge variant="outline">{e.knowledge_domain.replace(/_/g, " ")}</Badge>}
          {e.scope_iwi && <Badge variant="secondary">{e.scope_iwi}</Badge>}
          {e.scope_region && <Badge variant="secondary">{e.scope_region}</Badge>}
          {e.work && (
            <Badge variant="outline" className="gap-1">
              <Award className="h-2.5 w-2.5" />
              {e.work.title}
            </Badge>
          )}
        </div>

        {e.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic">
            &ldquo;{e.notes}&rdquo;
          </p>
        )}
      </div>

      <div className="shrink-0 text-right text-xs text-muted-foreground">
        {new Date(e.created_at).toLocaleDateString("en-NZ", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-6 text-sm text-muted-foreground italic">
        {message}
      </CardContent>
    </Card>
  );
}
