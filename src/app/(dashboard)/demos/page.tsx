import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Mic2,
  Plus,
  FileAudio,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Award,
} from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";

import { getRosterForProfile } from "@/lib/artist-roster/queries";
import { listDemosForRoster } from "@/lib/demos/queries";
import { DEMO_STATUS_LABEL, canDemoTransition, type DemoStatus } from "@/lib/demos/types";

import { DemoUploadForm } from "@/components/demos/demo-upload-form";
import { DemoActionForms } from "@/components/demos/demo-action-forms";

export const metadata = { title: "Demos · Kaikōrero" };
export const revalidate = 30;

/**
 * /dashboard/demos — the artist's view of their demos.
 *
 * Lists all demos the artist has uploaded on each roster row, with
 * status + the right next action button (submit for review, etc.)
 *
 * Audience: any signed-in artist. RLS handles the access boundary.
 */
export default async function DemosPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("kaikorero.demos");

  const rosterRows = await getRosterForProfile(user.id);
  if (rosterRows.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Kaikōrero</Badge>
            <Badge variant="secondary" className="text-xs">Demos</Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("lede")}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Mic2 className="h-10 w-10 text-bronze-300" />
            <h2 className="font-display text-xl">{t("emptyTitle")}</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {t("emptyBody")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch demos for each roster row in parallel
  const demosByRoster = new Map<string, Awaited<ReturnType<typeof listDemosForRoster>>>();
  await Promise.all(
    rosterRows.map(async (r) => {
      const demos = await listDemosForRoster(r.id);
      demosByRoster.set(r.id, demos);
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">Kaikōrero</Badge>
          <Badge variant="secondary" className="text-xs">Demos</Badge>
        </div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">{t("lede")}</p>
      </div>

      <ActiveContextBanner />

      {/* Roster groups with their demos + upload form */}
      {rosterRows.map((roster) => {
        const demos = demosByRoster.get(roster.id) ?? [];
        return (
          <section key={roster.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl">{roster.branch.name}</h2>
              <Badge variant="outline" className="text-xs">
                {demos.length} {demos.length === 1 ? t("demoCount") : t("demoCountPlural")}
              </Badge>
            </div>

            {/* Upload form */}
            <DemoUploadForm rosterId={roster.id} />

            {/* Demos list */}
            {demos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
                  <FileAudio className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("noDemosYet")}</p>
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-2">
                {demos.map((d) => (
                  <li key={d.id}>
                    <DemoCard demo={d} tPrefix="kaikorero.demos" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function DemoCard({
  demo,
  tPrefix,
}: {
  demo: import("@/lib/demos/types").DemoRow;
  tPrefix: string;
}) {
  // Compute the next legal action
  const nextAction = (() => {
    if (canDemoTransition(demo.status, "pending_review") && demo.status === "draft") {
      return "submit";
    }
    return null;
  })();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-semibold">{demo.title}</h3>
              <DemoStatusBadge status={demo.status} />
            </div>
            {demo.description && (
              <p className="text-sm text-muted-foreground">{demo.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                <FileAudio className="mr-1 inline h-3 w-3" />
                {demo.file_mime}
              </span>
              <span>
                {formatBytes(demo.file_size_bytes)}
              </span>
              {demo.file_duration_seconds != null && (
                <span>
                  <Clock className="mr-1 inline h-3 w-3" />
                  {formatDuration(demo.file_duration_seconds)}
                </span>
              )}
            </div>
            {demo.review_notes && (
              <div className="rounded-md border border-border bg-muted p-2 text-xs">
                <p className="font-medium">{tPrefix + ".reviewNotesLabel"}</p>
                <p className="text-muted-foreground">{demo.review_notes}</p>
              </div>
            )}
            {demo.reviewed_at && (
              <p className="text-xs text-muted-foreground">
                Reviewed {new Date(demo.reviewed_at).toLocaleString("en-NZ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Created {new Date(demo.created_at).toLocaleString("en-NZ")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {nextAction === "submit" && (
              <DemoActionForms demoId={demo.id} action="submit" />
            )}
            {demo.status === "pending_review" && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                Awaiting review
              </Badge>
            )}
            {demo.status === "approved" && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Approved
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
