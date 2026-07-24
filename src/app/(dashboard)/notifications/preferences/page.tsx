import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Bell, Mail, Settings, Info } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { getInitialPrefs, NotificationPrefsForm } from "@/components/notifications/notification-prefs-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Notification preferences · Dashboard",
  description:
    "Choose which activity you hear about in-app and which gets emailed to you.",
};

export default async function NotificationPreferencesPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getTranslations("notifications.prefs");

  // Load the user's existing prefs (default if NULL — shouldn't happen
  // post-migration, but defensive).
  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", user.id)
    .maybeSingle();

  const initial = getInitialPrefs(profile?.notification_prefs);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/notifications"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        {t("back")}
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-bronze-300">
          <Settings className="h-4 w-4" />
          {t("title")}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t("lede")}
        </h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </header>

      {/* Channel legend */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ChannelLegend
          icon={<Bell className="h-4 w-4" />}
          title={t("inAppLabel")}
          description={t("inAppDesc")}
        />
        <ChannelLegend
          icon={<Mail className="h-4 w-4" />}
          title={t("emailLabel")}
          description={t("emailDesc")}
        />
      </div>

      {/* The form */}
      <NotificationPrefsForm initial={initial} />

      {/* Cultural note */}
      <Card className="border-bronze-400/30 bg-bronze-400/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-bronze-300" />
          <div>
            <p className="text-foreground">{t("culturalTitle")}</p>
            <p className="mt-1">{t("culturalDesc")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChannelLegend({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
