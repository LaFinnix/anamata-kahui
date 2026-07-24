import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Megaphone } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { TonoComposeForm } from "@/components/tono/compose-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TONO_HELP_TYPES, TONO_VISIBILITIES } from "@/lib/tono/types";
import type { KnowledgeDomain } from "@/lib/kaikorero/types";
import { KNOWLEDGE_DOMAINS, DOMAIN_LABEL } from "@/lib/kaikorero/types";

export const metadata = {
  title: "New tono · Dashboard",
  description: "Post a help request to the kāhui.",
};

export default async function NewTonoPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const t = await getTranslations("tono.compose");

  // Load the user's releases for the optional "anchor to a work" picker.
  // Combines (a) releases the user is the artist on, and (b) releases
  // they're a split_participant on (collaborator). The PostgREST `in()`
  // filter requires at least one value, so we build the query conditionally.
  const sharedIds = await getSharedReleaseIds(supabase, user.id);
  let releases: { id: string; title: string }[] = [];

  if (sharedIds.length === 0) {
    // Only artist-owned releases
    const { data } = await supabase
      .from("releases")
      .select("id, title")
      .eq("artist_id", user.id)
      .order("release_date", { ascending: false, nullsFirst: false })
      .limit(50);
    releases = (data ?? []).map((r) => ({ id: r.id, title: r.title }));
  } else {
    // Combine artist-owned + shared (via split participant). The .or() filter
    // is built without id.in.(empty).
    const idsList = sharedIds.join(",");
    const { data } = await supabase
      .from("releases")
      .select("id, title")
      .or(`artist_id.eq.${user.id},id.in.(${idsList})`)
      .order("release_date", { ascending: false, nullsFirst: false })
      .limit(50);
    releases = (data ?? []).map((r) => ({ id: r.id, title: r.title }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/tono"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to tono board
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-bronze-300">
          <Megaphone className="h-4 w-4" />
          {t("postButton")}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("lede")}</p>
      </header>

      <TonoComposeForm
        helpTypeOptions={TONO_HELP_TYPES}
        visibilityOptions={TONO_VISIBILITIES}
        knowledgeDomainOptions={KNOWLEDGE_DOMAINS}
        domainLabel={DOMAIN_LABEL}
        releases={(releases ?? []).map((r) => ({ id: r.id, title: r.title }))}
      />
    </div>
  );
}

/**
 * Find release ids where the current user is a split_participant
 * (collaborator, not just the artist). Returns the ids as an array; empty
 * if none.
 */
async function getSharedReleaseIds(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
): Promise<string[]> {
  const { data: splits } = await supabase
    .from("split_participants")
    .select("split_sheet:split_sheets!inner(release_id)")
    .eq("profile_id", userId);
  return (splits ?? [])
    .map((s) => (s.split_sheet as { release_id?: string } | null)?.release_id)
    .filter((x): x is string => typeof x === "string");
}
