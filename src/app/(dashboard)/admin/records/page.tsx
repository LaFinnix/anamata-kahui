import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Users,
  UserPlus,
  Music,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";

import { listBranchRoster } from "@/lib/artist-roster/queries";
import { listFundingForRoster, type RosterFunding } from "@/lib/funding/queries";
import { ROSTER_STATUS_LABEL, type RosterStatus } from "@/lib/artist-roster/types";
import { RosterCreateForm } from "@/components/artist-roster/roster-create-form";
import { RosterStatusForm } from "@/components/artist-roster/roster-status-form";
import { RosterVisibilityForm } from "@/components/artist-roster/roster-visibility-form";

export const metadata = { title: "Artist roster · Admin" };
export const revalidate = 30; // refresh every 30s so admins see updates

/**
 * /admin/records — Roster management for the current branch.
 *
 * Audience: super_admin + branch_admin of the relevant branch.
 * RLS in artist_roster restricts row access automatically.
 *
 * The page shows the roster for the current branch context (the
 * ActiveContextBanner manages branch switching). For super_admin,
 * the branch chip can be switched; for branch_admin, it's fixed
 * to the branch they admin.
 */

export default async function AdminRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; branch?: string }>;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const statusFilter = (params.status ?? "any") as RosterStatus | "any";
  const branchFilter = params.branch; // optional super_admin override

  // Resolve the active branch
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  // Pick the branch — either the URL param (super_admin) or the user's
  // first user_branches entry.
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
            <Badge variant="secondary" className="text-xs">Music (Anamata Records)</Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Roster</h1>
          <p className="mt-1 text-muted-foreground">
            You don't have a branch to manage. Contact a super admin to be assigned.
          </p>
        </div>
      </div>
    );
  }

  // Pull the branch info + roster + available artists
  const [branchResult, roster, profilesResult] = await Promise.all([
    supabase.from("branches").select("id, slug, name").eq("id", branchId).single(),
    listBranchRoster(branchId, { status: statusFilter }),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["artist", "branch_admin"])
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const branch = branchResult.data;

  // Build the artist options — exclude anyone already on this branch's roster
  const onRoster = new Set(roster.map((r) => r.profile_id));
  const artistOptions = (profilesResult.data ?? [])
    .filter((p) => !onRoster.has(p.id))
    .map((p) => ({
      id: p.id,
      label: p.full_name?.trim() ? p.full_name : `(${p.id.slice(0, 8)})`,
    }));

  // Fetch funding for each roster row in parallel
  const fundingByRoster = new Map<string, RosterFunding[]>();
  await Promise.all(
    roster.map(async (r) => {
      const funding = await listFundingForRoster(r.id);
      fundingByRoster.set(r.id, funding);
    }),
  );

  // Status counts
  const all = await listBranchRoster(branchId, { status: "any" });
  const counts = {
    total: all.length,
    active: all.filter((r) => r.status === "active").length,
    prospect: all.filter((r) => r.status === "prospect").length,
    paused: all.filter((r) => r.status === "paused").length,
    departed: all.filter((r) => r.status === "departed").length,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Admin</Badge>
            <Badge variant="secondary" className="text-xs">
              {branch?.name ?? "Branch"} (Anamata Records)
            </Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Roster</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            The signed-artist roster for this branch. Add artists as prospects,
            transition them to active, and manage public visibility per artist.
          </p>
        </div>
        <RosterCreateForm branchId={branchId} artistOptions={artistOptions} />
      </div>

      <ActiveContextBanner />

      {/* Status counts */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatusCountTile label="Total" value={counts.total} href={`/admin/records?status=any&branch=${branchId}`} active={statusFilter === "any"} />
        <StatusCountTile label="Active" value={counts.active} href={`/admin/records?status=active&branch=${branchId}`} active={statusFilter === "active"} />
        <StatusCountTile label="Prospect" value={counts.prospect} href={`/admin/records?status=prospect&branch=${branchId}`} active={statusFilter === "prospect"} />
        <StatusCountTile label="Paused" value={counts.paused} href={`/admin/records?status=paused&branch=${branchId}`} active={statusFilter === "paused"} />
        <StatusCountTile label="Departed" value={counts.departed} href={`/admin/records?status=departed&branch=${branchId}`} active={statusFilter === "departed"} />
      </section>

      {/* Roster list */}
      <section>
        {roster.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <Sparkles className="h-8 w-8 text-bronze-300" />
              <p className="text-sm text-muted-foreground">
                No roster entries {statusFilter === "any" ? "yet" : `with status "${ROSTER_STATUS_LABEL[statusFilter as RosterStatus]}"`}.
                Use the "Add artist" button to start building the roster.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {roster.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/artist/${r.profile_id}`}
                            className="font-display text-lg font-semibold hover:underline"
                          >
                            {r.profile.full_name?.trim() || `(unnamed artist ${r.profile_id.slice(0, 8)})`}
                          </Link>
                          <StatusBadge status={r.status} />
                          {r.on_roster_publicly && r.opted_in_public && r.status === "active" ? (
                            <Badge variant="success" className="text-xs">Public</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Internal only</Badge>
                          )}
                        </div>
                        {r.role_summary && (
                          <p className="text-sm text-muted-foreground">{r.role_summary}</p>
                        )}
                        {r.profile.iwi_affiliation_attested && r.profile.iwi_affiliation_attested.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Iwi: {r.profile.iwi_affiliation_attested.join(", ")}
                          </p>
                        )}
                        {r.departed_reason && (
                          <p className="text-xs text-muted-foreground italic">
                            Departed: {r.departed_reason}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Last status change: {new Date(r.status_changed_at).toLocaleString("en-NZ")}
                        </p>
                        <RosterFundingRow funding={fundingByRoster.get(r.id) ?? []} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <RosterVisibilityForm
                          rosterId={r.id}
                          onRosterPublicly={r.on_roster_publicly}
                          optedInPublic={r.opted_in_public}
                          artistName={r.profile.full_name?.trim() ?? "Artist"}
                        />
                        <RosterStatusForm
                          rosterId={r.id}
                          currentStatus={r.status}
                          artistName={r.profile.full_name?.trim() ?? "Artist"}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}



function RosterFundingRow({ funding }: { funding: RosterFunding[] }) {
  if (funding.length === 0) return null;
  return (
    <div className="mt-2 rounded-md border border-border bg-muted p-2 text-xs">
      <p className="mb-1 font-medium text-foreground">
        {funding.length} funding application{funding.length === 1 ? "" : "s"} linked to this artist
      </p>
      <ul className="space-y-0.5">
        {funding.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <span>{f.funder_name}</span>
            <span>·</span>
            <span>{f.round ?? f.title ?? "—"}</span>
            <span>·</span>
            <span
              className={
                f.status === "awarded"
                  ? "text-pounamu-300"
                  : f.status === "declined"
                  ? "text-destructive"
                  : "text-foreground"
              }
            >
              {f.status}
            </span>
            {f.amount_awarded_nzd != null && (
              <>
                <span>·</span>
                <span className="font-medium">${f.amount_awarded_nzd.toLocaleString("en-NZ")}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
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
    <Badge variant={variantByStatus[status]}>
      {ROSTER_STATUS_LABEL[status]}
    </Badge>
  );
}

function StatusCountTile({
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
