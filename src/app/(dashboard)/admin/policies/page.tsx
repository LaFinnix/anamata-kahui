import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ScrollText,
  Sparkles,
  CheckCircle2,
  Calendar,
  Shield,
} from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveContextBanner } from "@/components/kahui/active-context-banner";

import { listAllCurrentPolicies, getAckStatsByPolicy } from "@/lib/legal-policies/queries";
import { listDocuments } from "@/lib/documents/loader";
import { POLICY_TYPE_LABEL, type PolicyType } from "@/lib/legal-policies/types";

import {
  PolicyCreateForm,
  PolicyPublishButton,
} from "@/components/legal-policies/policy-admin-forms";

export const metadata = { title: "Policies · Admin" };
export const revalidate = 30;

/**
 * /admin/policies — manage platform legal policies.
 *
 * Audience: super_admin only (creation + publication). Any admin can read.
 *
 * Pattern:
 *   1. Admin drafts a new policy from the document library (body frozen)
 *   2. Admin publishes → is_current=true, previous current is demoted
 *   3. Artists see the current policy on their roster page and acknowledge
 *
 * The page groups by policy_type, showing all versions of each type
 * (current + historical). Stats per policy show how many artists have
 * acknowledged.
 */
export default async function AdminPoliciesPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("admin.policies");

  // Run in parallel
  const [allPolicies, ackStats, documents] = await Promise.all([
    listAllCurrentPolicies(),
    getAckStatsByPolicy(),
    listDocuments(),
  ]);

  // Pull all policy docs (including non-current) — admin can see history
  const { data: allVersions } = await supabase
    .from("legal_policies")
    .select("*")
    .order("policy_type", { ascending: true })
    .order("effective_at", { ascending: false });

  // Group by policy_type
  const grouped: Record<string, typeof allVersions> = {};
  for (const p of allVersions ?? []) {
    if (!grouped[p.policy_type]) grouped[p.policy_type] = [];
    grouped[p.policy_type]!.push(p);
  }

  // Document options for the create form (filter to types we have policies for)
  const documentOptions = documents
    .filter((d) => ["code_conduct", "privacy_consent", "data_rights", "cultural_safety"].includes(d.meta.type))
    .map((d) => ({
      type: d.meta.type,
      version: d.meta.version,
      title: d.meta.title,
    }));

  // Stats per type
  const totalAcks = ackStats.reduce((sum, s) => sum + s.active, 0);
  const totalWithdrawn = ackStats.reduce((sum, s) => sum + s.withdrawn, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">Admin</Badge>
            <Badge variant="secondary" className="text-xs">Super admin</Badge>
          </div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            {t("lede")}
          </p>
        </div>
        <PolicyCreateForm documentOptions={documentOptions} />
      </div>

      <ActiveContextBanner />

      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current policies</CardDescription>
            <CardTitle className="font-display text-3xl">{allPolicies.length}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {Object.keys(grouped).length} policy types
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active acknowledgements</CardDescription>
            <CardTitle className="font-display text-3xl">{totalAcks}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {totalWithdrawn} withdrawn
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total ack records</CardDescription>
            <CardTitle className="font-display text-3xl">{totalAcks + totalWithdrawn}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {ackStats.length} policies with acks
          </CardContent>
        </Card>
      </section>

      {/* Group by type */}
      <section className="space-y-6">
        {Object.entries(grouped).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <Sparkles className="h-8 w-8 text-bronze-300" />
              <p className="text-sm text-muted-foreground">
                {t("noPolicies")}
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([type, versions]) => (
            <PolicyTypeGroup
              key={type}
              policyType={type as PolicyType}
              versions={versions ?? []}
              ackStats={ackStats.filter((s) => versions!.some((v) => v.id === s.policy_id))}
            />
          ))
        )}
      </section>
    </div>
  );
}

function PolicyTypeGroup({
  policyType,
  versions,
  ackStats,
}: {
  policyType: PolicyType;
  versions: import("@/lib/legal-policies/types").LegalPolicyRow[];
  ackStats: Array<{ policy_id: string; policy_title: string; total: number; active: number; withdrawn: number }>;
}) {
  return (
    <div>
      <h2 className="mb-3 font-display text-xl">
        {POLICY_TYPE_LABEL[policyType]}
      </h2>
      <ul className="space-y-2">
        {versions.map((v) => {
          const stats = ackStats.find((s) => s.policy_id === v.id);
          return (
            <li key={v.id}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold">
                          {v.title}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          v{v.version}
                        </Badge>
                        {v.is_current ? (
                          <Badge variant="success" className="gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            Current
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Historical
                          </Badge>
                        )}
                        {v.required_for_all && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Shield className="h-3 w-3" />
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        Effective from {new Date(v.effective_at).toLocaleDateString("en-NZ")}
                        {" · "}
                        Created {new Date(v.created_at).toLocaleDateString("en-NZ")}
                      </p>
                      {stats && (
                        <p className="text-xs text-muted-foreground">
                          {stats.active} active ack{stats.active === 1 ? "" : "s"}
                          {stats.withdrawn > 0 && ` · ${stats.withdrawn} withdrawn`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <PolicyPublishButton
                        policyId={v.id}
                        isCurrent={v.is_current}
                        policyTitle={v.title}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
