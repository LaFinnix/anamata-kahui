import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Inbox, ArrowLeft } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { listOpenTonosICanHelp } from "@/lib/queries/tono";
import { TonoCard } from "@/components/tono/tono-card";
import { InboxDomainFilter } from "@/components/tono/inbox-domain-filter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KNOWLEDGE_DOMAINS, type KnowledgeDomain } from "@/lib/kaikorero/types";
import { DOMAIN_LABEL } from "@/lib/kaikorero/types";

export const metadata = {
  title: "Tono inbox · Dashboard",
  description:
    "Open help requests you can help with. Filtered by your knowledge areas and attested iwi affiliations.",
};

interface SearchParams {
  domain?: string;
}

/**
 * /tono/inbox — discovery surface for helpers.
 *
 * Lists open tono (status='open') that the current user is allowed to see
 * AND that they haven't already proposed on. Visibility filtering is
 * applied server-side:
 *   - visibility='open' → visible to everyone
 *   - visibility='iwi_specific' → only users whose attested set includes scope_iwi
 *   - visibility='invited' → NOT shown here (by-token invites need a different flow)
 *
 * v1.1: optional ?domain=… filter for knowledge-area scoping.
 */
export default async function TonoInboxPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const t = await getTranslations("tono.inbox");

  const params = await searchParams;
  const domainFilter =
    params.domain && (KNOWLEDGE_DOMAINS as readonly string[]).includes(params.domain)
      ? (params.domain as KnowledgeDomain)
      : null;

  const inbox = await listOpenTonosICanHelp({
    knowledgeDomain: domainFilter,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/tono"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to tono board
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-bronze-300">
          <Inbox className="h-4 w-4" />
          {t("title")}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t("directoryTitle")}
        </h1>
        <p className="text-muted-foreground">{t("directoryLede")}</p>
      </header>

      {/* Domain filter — v1.1 */}
      <InboxDomainFilter
        domainOptions={KNOWLEDGE_DOMAINS}
        activeDomain={domainFilter}
        domainLabel={DOMAIN_LABEL}
      />

      {inbox.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Inbox is empty</CardTitle>
            <CardDescription>
              {domainFilter
                ? `No open tono match the "${DOMAIN_LABEL[domainFilter]}" filter. Try clearing the filter or broadening your iwi affiliations.`
                : "No open tono match your visibility. Check back later, or browse the Kaikōrero directory to find people to collaborate with directly."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/[locale]/artist"
              className="text-sm text-bronze-300 underline hover:text-bronze-200"
            >
              Browse the Kaikōrero directory
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {inbox.map(({ tono, creator, has_proposed }) => (
            <TonoCard
              key={tono.id}
              tono={tono}
              perspective="helper"
              creator={creator}
              hasProposed={has_proposed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
