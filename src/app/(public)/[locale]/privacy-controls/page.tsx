import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";
import { Download, Trash2, Eye, EyeOff, Shield } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createServerSupabase } from "@/lib/supabase/clients";
import { PrivacyControlsAuthedClient } from "./_client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacyControls.anonymous" });
  return {
    title: t("title"),
    description: t("lede").slice(0, 160),
  };
}

export default async function PrivacyControlsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tAnon = await getTranslations("privacyControls.anonymous");
  const tSignedIn = await getTranslations("privacyControls.signedIn");
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Unauthenticated visitors see the educational surface.
    return <PrivacyControlsAnon title={tAnon("title")} badge={tAnon("badge")} />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, opted_in_public_directory, iwi_affiliation, te_reo_proficiency, created_at")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">Privacy controls · signed in</Badge>
      <h1 className="text-balance text-4xl font-display font-semibold tracking-tight sm:text-5xl">
        {tSignedIn("title")}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Signed in as <code>{user.email}</code>. Use the controls below to
        exercise your rights under the NZ Privacy Act 2020.
      </p>
      <div className="mt-12">
        <PrivacyControlsAuthedClient
          email={user.email ?? ""}
          fullName={profile?.full_name ?? null}
          role={profile?.role ?? "client"}
          optedIn={profile?.opted_in_public_directory ?? false}
          iwiAffiliation={(profile?.iwi_affiliation as string[] | null) ?? []}
          teReoProficiency={profile?.te_reo_proficiency ?? null}
          createdAt={profile?.created_at ?? null}
        />
      </div>
    </div>
  );
}

function PrivacyControlsAnon({ title, badge }: { title: string; badge: string }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Badge variant="outline" className="mb-4">{badge}</Badge>
      <h2 className="text-balance text-3xl font-display font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        The data export, deletion, and consent controls on this page are
        for signed-in users. If you have an account,{" "}
        <Link href="/login" className="text-bronze-300 hover:text-bronze-200 underline">
          sign in
        </Link>{" "}
        to manage your data. Otherwise the rights below still apply —
        contact us to exercise them.
      </p>

      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <Download className="h-5 w-5 text-bronze-300" />
            <CardTitle>Right to access</CardTitle>
            <CardDescription>
              You can request a copy of all personal information we hold
              about you. We'll provide it within 20 working days.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Trash2 className="h-5 w-5 text-bronze-300" />
            <CardTitle>Right to delete</CardTitle>
            <CardDescription>
              You can request deletion of your personal information,
              subject to legal retention obligations.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Eye className="h-5 w-5 text-bronze-300" />
            <CardTitle>Right to correct</CardTitle>
            <CardDescription>
              Information we hold that is wrong or out of date can be
              corrected.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Shield className="h-5 w-5 text-pounamu-300" />
            <CardTitle>Right to withdraw consent</CardTitle>
            <CardDescription>
              Any consent you've previously given can be withdrawn at any
              time. Withdrawal doesn't affect processing already done.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="mt-12 rounded-lg border border-bronze-500/30 bg-bronze-900/20 p-8">
        <h2 className="font-display text-2xl">Contact us</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          To exercise any of these rights without signing in, email{" "}
          <a
            href="mailto:privacy@anamatakahui.co.nz"
            className="text-bronze-300 hover:text-bronze-200 underline"
          >
            privacy@anamatakahui.co.nz
          </a>{" "}
          with your request. Include enough detail to verify your identity.
          We respond within 20 working days as required by the Privacy
          Act 2020.
        </p>
      </section>
    </div>
  );
}
