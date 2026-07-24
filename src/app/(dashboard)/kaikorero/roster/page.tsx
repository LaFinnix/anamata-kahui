import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Users,
  Calendar,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  Info,
  ArrowLeft,
} from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getRosterForProfile } from "@/lib/artist-roster/queries";
import { listContractsForRoster } from "@/lib/contracts/queries";
import {
  listAllCurrentPolicies,
  listAcksForRoster,
  getCurrentAck,
} from "@/lib/legal-policies/queries";
import { isAckActive } from "@/lib/legal-policies/types";
import type { LegalPolicyRow, LegalPolicyAckWithPolicy } from "@/lib/legal-policies/types";
import { ROSTER_STATUS_LABEL, type RosterStatus } from "@/lib/artist-roster/types";
import {
  CONTRACT_STATUS_LABEL,
  type ContractStatus,
  type ContractRow,
} from "@/lib/contracts/types";
import { ContractSignButton } from "@/components/contracts/contract-sign-button";
import {
  PolicyAcknowledgeButton,
  PolicyWithdrawButton,
} from "@/components/legal-policies/policy-actions";

export const metadata = { title: "My roster · Kaikōrero" };
export const revalidate = 30;

/**
 * /kaikorero/roster — the artist's read-only view of their roster status.
 *
 * Audience: any signed-in artist. Shows every (profile, branch) row
 * where the user is the profile. Artists can see:
 *   - their current status on each branch
 *   - role summary
 *   - public visibility status (whether they're visible to the world)
 *   - when they were added / last status change
 *   - departure info (if applicable)
 *
 * What artists CANNOT do on this page:
 *   - change status (admin only)
 *   - change visibility (admin only)
 *   - request changes (future feature)
 *
 * RLS handles the access boundary: an artist can only see their own
 * roster rows. If they're on no rosters, the page shows a friendly
 * empty state explaining what a roster is and who to talk to.
 */
export default async function MyRosterPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("kaikorero.roster");

  const rows = await getRosterForProfile(user.id);

  // Fetch contracts + policies for each roster row in parallel
  const contractsByRoster = new Map<string, ContractRow[]>();
  const acksByRoster = new Map<string, LegalPolicyAckWithPolicy[]>();
  await Promise.all(
    rows.map(async (r) => {
      const [contracts, acks] = await Promise.all([
        listContractsForRoster(r.id),
        listAcksForRoster(r.id),
      ]);
      contractsByRoster.set(r.id, contracts);
      acksByRoster.set(r.id, acks);
    }),
  );

  // Fetch all current policies (same for every roster row — the artist
  // sees the current version of every policy type)
  const currentPolicies = await listAllCurrentPolicies();

  if (rows.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Kaikōrero</Badge>
            <Badge variant="secondary" className="text-xs">Read-only</Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("lede")}</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Users className="h-10 w-10 text-bronze-300" />
            <h2 className="font-display text-xl">{t("emptyTitle")}</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {t("emptyBody")}
            </p>
            <Button asChild variant="secondary" className="mt-2">
              <Link href="/kaikorero/profile">
                <ArrowLeft className="h-4 w-4" />
                {t("viewMyProfile")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">Kaikōrero</Badge>
          <Badge variant="secondary" className="text-xs">Read-only</Badge>
        </div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">{t("lede")}</p>
      </div>

      {/* What is a roster? An info card so artists understand the context. */}
      <Card className="border-bronze-500/30 bg-bronze-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-bronze-300" />
          <div className="text-sm">
            <p className="font-medium">{t("infoTitle")}</p>
            <p className="mt-1 text-muted-foreground">{t("infoBody")}</p>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-4 font-display text-xl">{t("yourRosterEntries")}</h2>
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id}>
              <RosterRow
                row={r}
                tPrefix="kaikorero.roster"
                contracts={contractsByRoster.get(r.id) ?? []}
                policies={currentPolicies}
                policyAcks={acksByRoster.get(r.id) ?? []}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RosterRow({
  row,
  tPrefix,
  contracts,
  policies,
  policyAcks,
}: {
  row: import("@/lib/artist-roster/types").ArtistRosterEntry;
  tPrefix: string;
  contracts: ContractRow[];
  policies: LegalPolicyRow[];
  policyAcks: LegalPolicyAckWithPolicy[];
}) {
  const isPubliclyVisible =
    row.on_roster_publicly && row.opted_in_public && row.status === "active";

  // Split contracts into needing-signature and already-signed
  const needsSignature = contracts.filter(
    (c) => (c.status === "draft" || c.status === "active") && !c.signed_at,
  );
  const signed = contracts.filter((c) => c.signed_at);

  // For each current policy, find the artist's current ack (or null)
  const acksByPolicyId = new Map<string, LegalPolicyAckWithPolicy | null>();
  for (const p of policies) {
    const current = policyAcks.find(
      (a) => a.policy_id === p.id && isAckActive(a),
    );
    acksByPolicyId.set(p.id, current ?? null);
  }
  const unsignedPolicies = policies.filter((p) => !acksByPolicyId.get(p.id));
  const acknowledgedPolicies = policies.filter((p) => acksByPolicyId.get(p.id));
  const hasAnyPolicy = policies.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              {row.branch.name}
              <StatusBadge status={row.status} />
            </CardTitle>
            {row.role_summary && (
              <CardDescription className="mt-1">{row.role_summary}</CardDescription>
            )}
          </div>
          {isPubliclyVisible ? (
            <Badge variant="success" className="gap-1">
              <Eye className="h-3 w-3" />
              Public
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <EyeOff className="h-3 w-3" />
              Internal only
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <PublicStatusExplainer
          isPublic={isPubliclyVisible}
          onRosterPublicly={row.on_roster_publicly}
          optedInPublic={row.opted_in_public}
          status={row.status}
        />

        {row.departed_reason && (
          <div className="rounded-md border border-border bg-muted p-3 text-sm">
            <p className="font-medium">{tPrefix + ".departureHeading"}</p>
            <p className="mt-1 text-muted-foreground">{row.departed_reason}</p>
          </div>
        )}

        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              Added
            </dt>
            <dd className="mt-0.5">{new Date(row.created_at).toLocaleString("en-NZ")}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              Last status change
            </dt>
            <dd className="mt-0.5">{new Date(row.status_changed_at).toLocaleString("en-NZ")}</dd>
          </div>
          {row.departed_at && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Departed
              </dt>
              <dd className="mt-0.5">{new Date(row.departed_at).toLocaleString("en-NZ")}</dd>
            </div>
          )}
        </dl>

        {/* Contracts section — shows what needs signing + signed history */}
        {contracts.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="mb-2 font-display text-base">Contracts</h3>
            {needsSignature.length > 0 && (
              <div className="space-y-3">
                {needsSignature.map((c) => (
                  <ContractRow key={c.id} contract={c} />
                ))}
              </div>
            )}
            {signed.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-bronze-300 hover:text-bronze-200">
                  {signed.length} signed contract{signed.length === 1 ? "" : "s"}
                </summary>
                <ul className="mt-2 space-y-2">
                  {signed.map((c) => (
                    <SignedContractRow key={c.id} contract={c} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Policies section — current policies the artist needs to acknowledge */}
        {hasAnyPolicy && (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="mb-2 font-display text-base">Policies</h3>
            {unsignedPolicies.length > 0 && (
              <div className="space-y-3">
                {unsignedPolicies.map((p) => (
                  <UnsignedPolicyRow
                    key={p.id}
                    policy={p}
                    artistRosterId={row.id}
                  />
                ))}
              </div>
            )}
            {acknowledgedPolicies.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-bronze-300 hover:text-bronze-200">
                  {acknowledgedPolicies.length} acknowledged polic{acknowledgedPolicies.length === 1 ? "y" : "ies"}
                </summary>
                <ul className="mt-2 space-y-2">
                  {acknowledgedPolicies.map((p) => {
                    const ack = acksByPolicyId.get(p.id)!;
                    return (
                      <AcknowledgedPolicyRow
                        key={p.id}
                        policy={p}
                        ack={ack}
                      />
                    );
                  })}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContractRow({ contract }: { contract: ContractRow }) {
  return (
    <div className="rounded-md border border-bronze-500/30 bg-bronze-500/5 p-3">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{contract.title}</p>
          <p className="text-xs text-muted-foreground">
            {contract.document_type} · v{contract.document_version}
            {contract.term_start && (
              <> · term starts {new Date(contract.term_start).toLocaleDateString("en-NZ")}</>
            )}
          </p>
        </div>
        <ContractStatusBadge status={contract.status} />
      </div>
      <ContractSignButton
        contractId={contract.id}
        contractTitle={contract.title}
        contractBody={contract.body}
        status={contract.status}
      />
    </div>
  );
}

function SignedContractRow({ contract }: { contract: ContractRow }) {
  return (
    <li className="rounded-md border border-pounamu-500/20 bg-pounamu-500/5 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{contract.title}</p>
        <ContractStatusBadge status={contract.status} />
      </div>
      <p className="text-xs text-muted-foreground">
        Signed {contract.signed_at ? new Date(contract.signed_at).toLocaleString("en-NZ") : ""}
        {contract.term_end && (
          <> · ends {new Date(contract.term_end).toLocaleDateString("en-NZ")}</>
        )}
      </p>
    </li>
  );
}

function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const variantByStatus: Record<ContractStatus, "default" | "success" | "secondary" | "outline"> = {
    draft: "default",
    active: "success",
    expired: "outline",
    terminated: "secondary",
    renewed: "secondary",
  };
  return (
    <Badge variant={variantByStatus[status]} className="text-xs">
      {CONTRACT_STATUS_LABEL[status]}
    </Badge>
  );
}

function StatusBadge({ status }: { status: RosterStatus }) {
  const variantByStatus: Record<RosterStatus, "default" | "success" | "secondary" | "outline"> = {
    active: "success",
    prospect: "default",
    paused: "outline",
    departed: "secondary",
  };
  return (
    <Badge variant={variantByStatus[status]} className="text-xs">
      {ROSTER_STATUS_LABEL[status]}
    </Badge>
  );
}

/** Explains WHY the row is or isn't publicly visible. The dual-flag
 *  model can be confusing — this is the artist-facing translation. */
function PublicStatusExplainer({
  isPublic,
  onRosterPublicly,
  optedInPublic,
  status,
}: {
  isPublic: boolean;
  onRosterPublicly: boolean;
  optedInPublic: boolean;
  status: RosterStatus;
}) {
  if (isPublic) {
    return (
      <div className="rounded-md border border-pounamu-500/30 bg-pounamu-500/10 p-3 text-sm">
        <p className="flex items-center gap-2 font-medium text-pounamu-300">
          <CheckCircle2 className="h-4 w-4" />
          You appear on the public roster
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Both visibility flags are set and your status is active. Other kaikōrero can
          find you in the directory and may reach out for collaboration.
        </p>
      </div>
    );
  }

  const reasons: string[] = [];
  if (status !== "active") reasons.push(`your status is "${ROSTER_STATUS_LABEL[status]}" (only active artists are listed publicly)`);
  if (!onRosterPublicly) reasons.push("the branch admin has not yet added you to the public roster list");
  if (!optedInPublic) reasons.push("you have not yet given privacy consent for public display");

  return (
    <div className="rounded-md border border-border bg-card p-3 text-sm">
      <p className="font-medium text-muted-foreground">
        <Sparkles className="mr-1 inline h-4 w-4" />
        Not currently public
      </p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground italic">
        Both flags need to be true and your status needs to be active before you
        appear in the public roster. The branch admin can flip these.
      </p>
    </div>
  );
}

function UnsignedPolicyRow({
  policy,
  artistRosterId,
}: {
  policy: LegalPolicyRow;
  artistRosterId: string;
}) {
  return (
    <div className="rounded-md border border-bronze-500/30 bg-bronze-500/5 p-3">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{policy.title}</p>
          <p className="text-xs text-muted-foreground">
            v{policy.version} · effective {new Date(policy.effective_at).toLocaleDateString("en-NZ")}
          </p>
        </div>
      </div>
      <PolicyAcknowledgeButton policy={policy} artistRosterId={artistRosterId} />
    </div>
  );
}

function AcknowledgedPolicyRow({
  policy,
  ack,
}: {
  policy: LegalPolicyRow;
  ack: LegalPolicyAckWithPolicy;
}) {
  return (
    <li className="rounded-md border border-pounamu-500/20 bg-pounamu-500/5 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">{policy.title}</p>
          <p className="text-xs text-muted-foreground">
            Acknowledged v{policy.version} on {new Date(ack.acknowledged_at).toLocaleString("en-NZ")}
            {ack.notes && <> · "{ack.notes}"</>}
          </p>
        </div>
        <PolicyWithdrawButton ackId={ack.id} policyTitle={policy.title} />
      </div>
    </li>
  );
}
