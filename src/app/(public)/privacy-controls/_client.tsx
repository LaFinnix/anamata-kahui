"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Download, Eye, EyeOff, ArrowRight, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  exportMyDataAction,
  requestDeletionAction,
  togglePublicDirectoryAction,
  type PrivacyActionState,
} from "@/lib/actions/privacy";

interface Props {
  email: string;
  fullName: string | null;
  role: string;
  optedIn: boolean;
  iwiAffiliation: string[];
  teReoProficiency: string | null;
  createdAt: string | null;
}

const initialState: PrivacyActionState = {};

export function PrivacyControlsAuthedClient({
  email,
  fullName,
  role,
  optedIn,
  iwiAffiliation,
  teReoProficiency,
  createdAt,
}: Props) {
  const [exportState, exportAction, exportPending] = useActionState(
    exportMyDataAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    requestDeletionAction,
    initialState,
  );
  const [toggleState, toggleAction, togglePending] = useActionState(
    togglePublicDirectoryAction,
    initialState,
  );

  return (
    <div className="space-y-12">
      <section>
        <h2 className="font-display text-2xl">Profile</h2>
        <Card className="mt-6">
          <CardContent className="p-6">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Name" value={fullName ?? "—"} />
              <Row label="Email" value={email} />
              <Row label="Role" value={role} />
              <Row
                label="Member since"
                value={
                  createdAt
                    ? new Date(createdAt).toLocaleDateString("en-NZ", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"
                }
              />
              <Row
                label="Iwi affiliation"
                value={iwiAffiliation.length > 0 ? iwiAffiliation.join(", ") : "—"}
              />
              <Row
                label="Te reo proficiency"
                value={teReoProficiency ?? "—"}
              />
            </dl>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="font-display text-2xl">Public directory</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Opt in to be listed on the{" "}
          <Link href="/artist" className="text-bronze-300 hover:text-bronze-200 underline">
            /artist
          </Link>{" "}
          page. Default is opt-out (safer).
        </p>
        <Card className="mt-6">
          <CardContent className="p-6">
            <form action={toggleAction} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {optedIn ? (
                  <Eye className="h-5 w-5 text-pounamu-300" />
                ) : (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {optedIn ? "Public directory: ON" : "Public directory: OFF"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {optedIn
                      ? "Your profile appears on /artist for partners and funders to see."
                      : "You're not listed. Only you can change this."}
                  </p>
                </div>
              </div>
              <input type="hidden" name="opted_in" value={optedIn ? "false" : "true"} />
              <Button type="submit" variant="secondary" size="sm" disabled={togglePending}>
                {togglePending
                  ? "Updating…"
                  : optedIn
                    ? "Remove from directory"
                    : "Add to directory"}
              </Button>
            </form>
            {toggleState?.error && (
              <p className="mt-3 text-sm text-destructive">{toggleState.error}</p>
            )}
            {toggleState?.success && (
              <p className="mt-3 text-sm text-pounamu-300">{toggleState.success}</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="font-display text-2xl">Export your data</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Download a JSON file containing every row linked to your account.
          Use this for portability or your own records.
        </p>
        <Card className="mt-6">
          <CardContent className="p-6">
            <form action={exportAction} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-bronze-300" />
                <div>
                  <p className="font-medium">Download my data</p>
                  <p className="text-xs text-muted-foreground">
                    Includes profile, branch memberships, scholarship
                    engagements, contact form submissions, and consent log.
                  </p>
                </div>
              </div>
              <Button type="submit" size="sm" disabled={exportPending}>
                {exportPending ? "Preparing…" : "Download"}{" "}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
            {exportState?.error && (
              <p className="mt-3 text-sm text-destructive">{exportState.error}</p>
            )}
            {exportState?.success && (
              <p className="mt-3 text-sm text-pounamu-300">{exportState.success}</p>
            )}
            {exportState?.exportJson && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-bronze-300 hover:text-bronze-200">
                  Show export (JSON, click to reveal)
                </summary>
                <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-muted/50 p-3 text-xs">
                  {exportState.exportJson}
                </pre>
                <a
                  href={`data:application/json;charset=utf-8,${encodeURIComponent(exportState.exportJson)}`}
                  download={`kahui-data-export-${new Date().toISOString().split("T")[0]}.json`}
                  className="mt-2 inline-block text-sm text-bronze-300 hover:text-bronze-200 underline"
                >
                  Download as file
                </a>
              </details>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="font-display text-2xl">Request deletion</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Logging a deletion request hides your profile from public
          directories and signs you out. We process deletions within 30
          days. Anonymised consent log entries are retained permanently
          as an audit trail.
        </p>
        <Card className="mt-6 border-destructive/50">
          <CardContent className="p-6">
            <form action={deleteAction} className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium">Request account deletion</p>
                  <p className="text-xs text-muted-foreground">
                    Type your email address below to confirm. You'll be
                    signed out immediately and your profile will be hidden
                    from public directories.
                  </p>
                </div>
              </div>
              <input
                type="email"
                name="confirm"
                placeholder={email}
                className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
              <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
                {deletePending ? "Processing…" : "I understand — request deletion"}
              </Button>
            </form>
            {deleteState?.error && (
              <p className="mt-3 text-sm text-destructive">{deleteState.error}</p>
            )}
            {deleteState?.success && (
              <p className="mt-3 text-sm text-pounamu-300">{deleteState.success}</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Questions?</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Read the full{" "}
          <Link href="/legal/privacy-notice" className="text-bronze-300 hover:text-bronze-200 underline">
            privacy notice
          </Link>{" "}
          for context. Contact{" "}
          <a
            href="mailto:privacy@anamatakahui.co.nz"
            className="text-bronze-300 hover:text-bronze-200 underline"
          >
            privacy@anamatakahui.co.nz
          </a>{" "}
          with any questions.
        </p>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="font-mono text-sm">{value}</dd>
    </div>
  );
}
