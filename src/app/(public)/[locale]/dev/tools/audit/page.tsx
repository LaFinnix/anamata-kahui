import Link from "next/link";
import { ArrowLeft, FileCheck2, ShieldCheck, Calendar, FileText } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Audit log viewer · Dev tools",
  description:
    "Interactive tool — live view of consent_log + data_governance_log. Every consent decision and governance event, append-only.",
};

interface Props {
  searchParams: Promise<{ limit?: string }>;
}

/**
 * /dev/tools/audit
 *
 * Live view of the append-only audit trail. Two tables:
 *   - consent_log — every consent decision (recorded with actor + reason)
 *   - data_governance_log — every governance event (published only)
 *
 * Both are append-only (deny_modification trigger). This viewer is
 * the public surface for cultural-funder accountability.
 */
export default async function AuditViewerPage({ searchParams }: Props) {
  const params = await searchParams;
  const limit = Math.min(Math.max(parseInt(params.limit ?? "20", 10), 5), 100);

  const admin = createAdminClient();

  const [consentResult, governanceResult] = await Promise.all([
    admin
      .from("consent_log")
      .select("id, action, subject_kind, subject_id, reason, recorded_by, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("data_governance_log")
      .select("id, action, summary, published, recorded_by, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const consentEntries = consentResult.data ?? [];
  const governanceEntries = governanceResult.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href="/dev"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Dev & Tech
      </Link>

      <Badge variant="outline" className="mt-6 mb-4">
        Interactive tool · Governance
      </Badge>
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Audit log viewer
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Live, public view of the append-only audit trail. Every consent
        decision and every published governance event. Both tables have
        deny_modification triggers — no UPDATE, no DELETE.
      </p>

      {/* Limit selector */}
      <form action="" method="get" className="mt-8 flex items-center gap-3 text-sm">
        <label htmlFor="limit" className="text-muted-foreground">
          Show last
        </label>
        <select
          id="limit"
          name="limit"
          defaultValue={String(limit)}
          className="h-8 rounded-md border border-border bg-input px-2 text-sm"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <span className="text-muted-foreground">entries</span>
        <button
          type="submit"
          className="h-8 rounded-md border border-border bg-secondary px-3 text-sm hover:bg-secondary/80"
        >
          Apply
        </button>
      </form>

      {/* Consent log */}
      <section className="mt-12">
        <div className="mb-4 flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-bronze-300" />
          <h2 className="font-display text-2xl">Consent log</h2>
          <Badge variant="secondary" className="ml-2">
            {consentEntries.length}
          </Badge>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Every consent decision recorded on the platform. Append-only.
        </p>
        <div className="space-y-2">
          {consentEntries.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No consent log entries yet.
              </CardContent>
            </Card>
          ) : (
            consentEntries.map((e) => (
              <Card key={e.id}>
                <CardContent className="space-y-1 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {e.action}
                    </Badge>
                    <Badge variant="secondary">
                      {e.subject_kind}
                    </Badge>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(e.created_at).toLocaleString("en-NZ", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {e.reason && (
                    <p className="text-muted-foreground">{e.reason}</p>
                  )}
                  <p className="text-xs font-mono text-muted-foreground">
                    Subject: <code>{e.subject_id}</code>
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Governance log */}
      <section className="mt-12">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-bronze-300" />
          <h2 className="font-display text-2xl">Data governance log</h2>
          <Badge variant="secondary" className="ml-2">
            {governanceEntries.length}
          </Badge>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Published governance events. Append-only.
        </p>
        <div className="space-y-2">
          {governanceEntries.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No published governance entries yet.
              </CardContent>
            </Card>
          ) : (
            governanceEntries.map((e) => (
              <Card key={e.id}>
                <CardContent className="space-y-1 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-bronze-300" />
                    <span className="font-medium">{e.action}</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(e.created_at).toLocaleString("en-NZ", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {e.summary && (
                    <p className="text-muted-foreground">{e.summary}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Transparency note */}
      <section className="mt-16 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-6">
        <h3 className="font-display text-lg font-semibold">
          How to verify this is real
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Both tables have a <code>deny_modification()</code> trigger that
          blocks any UPDATE or DELETE. Try{" "}
          <code className="font-mono text-xs">
            PATCH /rest/v1/consent_log?id=eq.1
          </code>{" "}
          against the API — you'll get HTTP 400 with a message
          confirming the row is append-only.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          The source code that wires these triggers is at{" "}
          <code className="font-mono text-xs">
            supabase/migrations/0002_cultural_governance.sql
          </code>{" "}
          in the public repository.
        </p>
      </section>
    </div>
  );
}