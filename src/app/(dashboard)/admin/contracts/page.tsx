import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  FileText,
  Calendar,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  XCircle,
} from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";

import { listContractsForBranch } from "@/lib/contracts/queries";
import { listDocuments } from "@/lib/documents/loader";
import { CONTRACT_STATUS_LABEL, type ContractStatus } from "@/lib/contracts/types";

import { ContractCreateForm } from "@/components/contracts/contract-create-form";

export const metadata = { title: "Contracts · Admin" };
export const revalidate = 30;

/**
 * /admin/contracts — list and create contracts for the current branch.
 *
 * Audience: super_admin + branch_admin of the relevant branch.
 * RLS handles the access boundary.
 */
export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; branch?: string }>;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const statusFilter = (params.status ?? "any") as ContractStatus | "any";
  const branchFilter = params.branch;

  // Resolve active branch
  let branchId = branchFilter;
  if (!branchId) {
    const { data: ub } = await supabase
      .from("user_branches")
      .select("branch_id")
      .eq("user_id", user.id)
      .in("role", ["admin", "editor"])
      .limit(1)
      .maybeSingle();
    branchId = ub?.branch_id ?? null;
  }

  if (!branchId) {
    return (
      <div className="space-y-8">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Admin</Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Contracts</h1>
          <p className="mt-1 text-muted-foreground">
            You don't have a branch to manage.
          </p>
        </div>
      </div>
    );
  }

  // Branch info + roster options + contracts + documents
  const [branchResult, contracts, docs, rosterRows] = await Promise.all([
    supabase.from("branches").select("id, slug, name").eq("id", branchId).single(),
    listContractsForBranch(branchId, { status: statusFilter }),
    listDocuments(),
    supabase
      .from("artist_roster")
      .select("id, profile_id, status, profile:profiles!artist_roster_profile_id_fkey (full_name)")
      .eq("branch_id", branchId)
      .in("status", ["active", "prospect"])
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const branch = branchResult.data;

  // Roster options for the create form
  type RosterRow = {
    id: string;
    profile_id: string;
    status: string;
    profile: { full_name: string | null } | { full_name: string | null }[] | null;
  };
  const rosterOptions = ((rosterRows.data ?? []) as unknown as RosterRow[]).map((r) => {
    const profile = Array.isArray(r.profile) ? r.profile[0] : r.profile;
    const name = profile?.full_name?.trim() || `(unnamed ${r.profile_id.slice(0, 8)})`;
    return { id: r.id, label: `${name} (${r.status})` };
  });

  // Status counts (over all contracts, not filtered)
  const allContracts = await listContractsForBranch(branchId, { status: "any" });
  const counts = {
    total: allContracts.length,
    draft: allContracts.filter((c) => c.status === "draft").length,
    active: allContracts.filter((c) => c.status === "active").length,
    expired: allContracts.filter((c) => c.status === "expired").length,
    terminated: allContracts.filter((c) => c.status === "terminated").length,
    renewed: allContracts.filter((c) => c.status === "renewed").length,
  };

  // Document options for the form (deduplicate by type, take latest version)
  const documentOptions = docs.map((d) => ({
    type: d.meta.type,
    version: d.meta.version,
    title: d.meta.title,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Admin</Badge>
            <Badge variant="secondary" className="text-xs">
              {branch?.name ?? "Branch"}
            </Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Contracts</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Formal agreements between this branch and the artists on its roster.
            Each contract is created from a document in the on-disk library;
            the body is frozen at create time and never changes.
          </p>
        </div>
        <ContractCreateForm
          rosterOptions={rosterOptions}
          documentOptions={documentOptions}
        />
      </div>

      <ActiveContextBanner />

      {/* Status counts */}
      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <CountTile label="Total" value={counts.total} href={`/admin/contracts?status=any&branch=${branchId}`} active={statusFilter === "any"} />
        <CountTile label="Draft" value={counts.draft} href={`/admin/contracts?status=draft&branch=${branchId}`} active={statusFilter === "draft"} />
        <CountTile label="Active" value={counts.active} href={`/admin/contracts?status=active&branch=${branchId}`} active={statusFilter === "active"} />
        <CountTile label="Expired" value={counts.expired} href={`/admin/contracts?status=expired&branch=${branchId}`} active={statusFilter === "expired"} />
        <CountTile label="Terminated" value={counts.terminated} href={`/admin/contracts?status=terminated&branch=${branchId}`} active={statusFilter === "terminated"} />
        <CountTile label="Renewed" value={counts.renewed} href={`/admin/contracts?status=renewed&branch=${branchId}`} active={statusFilter === "renewed"} />
      </section>

      {/* Contracts list */}
      <section>
        {contracts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <Sparkles className="h-8 w-8 text-bronze-300" />
              <p className="text-sm text-muted-foreground">
                No contracts {statusFilter === "any" ? "yet" : `with status "${CONTRACT_STATUS_LABEL[statusFilter as ContractStatus]}"`}.
                Use the "Create contract" button to draft one from a document in the library.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {contracts.map((c) => (
              <li key={c.id}>
                <ContractRow
                  contract={c}
                  branchId={branchId}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CountTile({
  label,
  value,
  href,
  active,
}: {
  label: string;
  value: number;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-3 transition-colors ${
        active
          ? "border-bronze-400 bg-bronze-500/10"
          : "border-border bg-card hover:border-bronze-400/30"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </Link>
  );
}

function ContractRow({
  contract,
  branchId,
}: {
  contract: import("@/lib/contracts/types").ContractWithRoster;
  branchId: string;
}) {
  const profile = Array.isArray(contract.roster.profile)
    ? contract.roster.profile[0]
    : contract.roster.profile;
  const artistName = profile?.full_name?.trim() || `(unnamed ${contract.roster.profile_id.slice(0, 8)})`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-semibold">{contract.title}</h3>
              <ContractStatusBadge status={contract.status} />
              {contract.signed_at && (
                <Badge variant="success" className="gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  Signed
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              With <strong>{artistName}</strong> ({contract.roster.branch.name})
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                <FileText className="mr-1 inline h-3 w-3" />
                {contract.document_type} · v{contract.document_version}
              </span>
              {contract.term_start && (
                <span>
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {new Date(contract.term_start).toLocaleDateString("en-NZ")}
                  {contract.term_end ? ` → ${new Date(contract.term_end).toLocaleDateString("en-NZ")}` : " → open-ended"}
                </span>
              )}
              {contract.territory && <span>Territory: {contract.territory}</span>}
            </div>
            {contract.signed_at && (
              <p className="text-xs text-muted-foreground">
                Signed {new Date(contract.signed_at).toLocaleString("en-NZ")}
              </p>
            )}
            {contract.terminated_reason && (
              <p className="text-xs text-destructive">
                <XCircle className="mr-1 inline h-3 w-3" />
                Terminated: {contract.terminated_reason}
              </p>
            )}
            {contract.parent_contract_id && (
              <p className="text-xs text-muted-foreground italic">
                Renewal of an earlier contract
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/contracts/${contract.id}`}>
                <ArrowRight className="h-4 w-4" />
                View
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Created {new Date(contract.created_at).toLocaleDateString("en-NZ")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
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
