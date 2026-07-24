import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createServerSupabase } from "@/lib/supabase/clients";
import { KaikoreroProfileForm } from "@/components/kaikorero/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KNOWLEDGE_DOMAINS } from "@/lib/kaikorero/types";
import type { ProfileKnowledgeArea } from "@/lib/kaikorero/types";

export const metadata = {
  title: "Kaikōrero profile · Dashboard",
  description:
    "Declare your cultural-knowledge areas so other creators across iwi can find you for collaboration.",
};

/**
 * /kaikorero/profile — edit your public Kaikōrero profile.
 *
 * This is the discovery surface for the collaboration marketplace:
 * - Bio, iwi affiliations (claimed set), and knowledge areas (with iwi/region scope)
 * - The opt-in toggle controls public visibility (also requires
 *   `opted_in_public_directory = true` from the existing privacy controls
 *   — both gates must pass for the profile to render publicly)
 * - `available_for_tono` lets creators pause incoming help requests
 *
 * The page is server-rendered; the form is a client component using
 * React 19's `useActionState` against updateKaikoreroProfileAction.
 */
export default async function KaikoreroProfilePage() {
  const t = await getTranslations("kaikorero");
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load the profile + knowledge areas in parallel.
  const [{ data: profile }, { data: knowledgeAreas }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, bio, kaikorero_bio, kaikorero_visible, available_for_tono, iwi_affiliation, iwi_affiliation_claimed, opted_in_public_directory",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("profile_knowledge_areas")
      .select("id, domain, scope_iwi, scope_region, attested_at")
      .eq("profile_id", user.id)
      .order("attested_at", { ascending: true }),
  ]);

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile not found</CardTitle>
          <CardDescription>
            Your profile row is missing. Contact an admin to onboard you.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Public visibility requires BOTH `kaikorero_visible` AND
  // `opted_in_public_directory`. Surface a hint if either is missing.
  const publicVisibleNow =
    profile.kaikorero_visible === true && profile.opted_in_public_directory === true;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-bronze-300">
          {t("title")}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t("subtitle")}
        </h1>
        <p className="text-muted-foreground">{t("lede")}</p>
      </header>

      {!publicVisibleNow && (
        <Card className="border-bronze-400/30 bg-bronze-400/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p>{t("publicNotVisible")}</p>
          </CardContent>
        </Card>
      )}

      <KaikoreroProfileForm
        profile={{
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
          bio: profile.bio,
          kaikorero_bio: profile.kaikorero_bio,
          kaikorero_visible: profile.kaikorero_visible ?? false,
          available_for_tono: profile.available_for_tono ?? true,
          iwi_affiliation_claimed: profile.iwi_affiliation_claimed ?? [],
        }}
        knowledgeAreas={(knowledgeAreas ?? []) as ProfileKnowledgeArea[]}
        knowledgeDomainOptions={KNOWLEDGE_DOMAINS}
      />
    </div>
  );
}
