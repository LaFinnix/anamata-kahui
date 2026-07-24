import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Mic2,
  FileAudio,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Award,
  Filter,
} from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";

import { listDemosForBranch, getDemoStatsByBranch } from "@/lib/demos/queries";
import { DEMO_STATUS_LABEL, type DemoStatus } from "@/lib/demos/types";
import { DemoActionForms } from "@/components/demos/demo-action-forms";

export const metadata = { title: "Demos · Admin" };
export const revalidate = 30;

/**
 * /admin/demos — kaitiaki / branch admin review queue.
 *
 * Audience: super_admin + branch_admin + kaitiaki. RLS handles access.
 *
 * Shows all demos for the current branch, filterable by status. The
 * review queue (pending_review status) is the default view.
 */
export default async function AdminDemosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; branch?: string }>;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const statusFilter = (params.status ?? "any") as DemoStatus | "any";
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
          <h1 className="text-3xl font-display font-semibold tracking-tight">Demos</h1>
          <p className="mt-1 text-muted-foreground">
            You don't have a branch to manage.
          </p>
        </div>
      </div>
    );
  }

  const [branchResult, demos] = await Promise.all([
    supabase.from("branches").select("id, slug, name").eq("id", branchId).single(),
    listDemosForBranch(branchId, { status: statusFilter }),
  ]);
  const branch = branchResult.data;

  // Count all by status (over the same branch)
  const allDemos = await listDemosForBranch(branchId, { status: "any" });
  const counts = {
    total: allDemos.length,
    draft: allDemos.filter((d) => d.status === "draft").length,
    pending_review: allDemos.filter((d) => d.status === "pending_review").length,
    approved: allDemos.filter((d) => d.status === "approved").length,
    rejected: allDemos.filter((d) => d.status === "rejected").length,
    promoted: allDemos.filter((d) => d.status === "promoted").length,
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">Admin</Badge>
          <Badge variant="secondary" className="text-xs">
            {branch?.name ?? "Branch"}
          </Badge>
        </div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Demos</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Cultural review queue. Demos in <strong>pending_review</strong> need a kaitiaki decision;
          approved demos can be promoted to releases.
        </p>
      </div>

      <ActiveContextBanner />

      {/* Status counts as clickable filters */}
      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <CountTile label="Total" value={counts.total} href={`/admin/demos?status=any&branch=${branchId}`} active={statusFilter === "any"} />
        <CountTile label="Draft" value={counts.draft} href={`/admin/demos?status=draft&branch=${branchId}`} active={statusFilter === "draft"} />
        <CountTile label="Pending" value={counts.pending_review} href={`/admin/demos?status=pending_review&branch=${branchId}`} active={statusFilter === "pending_review"} />
        <CountTile label="Approved" value={counts.approved} href={`/admin/demos?status=approved&branch=${branchId}`} active={statusFilter === "approved"} />
        <CountTile label="Rejected" value={counts.rejected} href={`/admin/demos?status=rejected&branch=${branchId}`} active={statusFilter === "rejected"} />
        <CountTile label="Promoted" value={counts.promoted} href={`/admin/demos?status=promoted&branch=${branchId}`} active={statusFilter === "promoted"} />
      </section>

      {/* Demos list */}
      <section>
        {demos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <Sparkles className="h-8 w-8 text-bronze-300" />
              <p className="text-sm text-muted-foreground">
                No demos {statusFilter === "any" ? "yet" : `with status "${DEMO_STATUS_LABEL[statusFilter as DemoStatus]}"`}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {demos.map((d) => (
              <li key={d.id}>
                <AdminDemoRow demo={d} />
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

function AdminDemoRow({
  demo,
}: {
  demo: import("@/lib/demos/types").DemoWithRoster;
}) {
  const profile = Array.isArray(demo.roster.profile)
    ? demo.roster.profile[0]
    : demo.roster.profile;
  const artistName = profile?.full_name?.trim() || `(unnamed ${demo.roster.profile_id.slice(0, 8)})`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-semibold">{demo.title}</h3>
              <DemoStatusBadge status={demo.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              By <strong>{artistName}</strong> ({demo.roster.branch.name})
            </p>
            {demo.description && (
              <p className="text-sm text-muted-foreground">{demo.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                <FileAudio className="mr-1 inline h-3 w-3" />
                {demo.file_mime}
              </span>
              <span>{formatBytes(demo.file_size_bytes)}</span>
              {demo.file_duration_seconds != null && (
                <span>
                  <Clock className="mr-1 inline h-3 w-3" />
                  {formatDuration(demo.file_duration_seconds)}
                </span>
              )}
            </div>
            {demo.review_notes && (
              <div className="rounded-md border border-border bg-muted p-2 text-xs">
                <p className="font-medium">Previous review notes:</p>
                <p className="text-muted-foreground">{demo.review_notes}</p>
              </div>
            )}
            {demo.reviewed_at && (
              <p className="text-xs text-muted-foreground">
                Last reviewed {new Date(demo.reviewed_at).toLocaleString("en-NZ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Created {new Date(demo.created_at).toLocaleString("en-NZ")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* Action buttons by status */}
            {demo.status === "pending_review" && (
              <>
                <DemoActionForms demoId={demo.id} action="approve" />
                <DemoActionForms demoId={demo.id} action="reject" />
              </>
            )}
            {demo.status === "approved" && (
              <DemoActionForms demoId={demo.id} action="promote" />
            )}
            {demo.status === "draft" && (
              <Badge variant="outline" className="text-xs">
                <Filter className="mr-1 h-3 w-3" />
                Not yet submitted
              </Badge>
            )}
            {demo.status === "rejected" && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Rejected
              </Badge>
            )}
            {demo.status === "promoted" && (
              <Badge variant="success" className="gap-1">
                <Award className="h-3 w-3" />
                Promoted
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DemoStatusBadge({ status }: { status: DemoStatus }) {
  const variantByStatus: Record<DemoStatus, "default" | "success" | "destructive" | "outline"> = {
    draft: "outline",
    pending_review: "outline",
    approved: "success",
    rejected: "destructive",
    promoted: "success",
  };
  return (
    <Badge variant={variantByStatus[status]} className="text-xs">
      {DEMO_STATUS_LABEL[status]}
    </Badge>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
