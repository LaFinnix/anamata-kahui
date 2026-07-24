import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Inbox, ArrowLeft, Check, CheckCheck } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { listMyNotifications } from "@/lib/queries/notifications";
import {
  KIND_GROUP,
  notificationLink,
  type NotificationRow,
} from "@/lib/notifications/types";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Wrapper — <form action> needs (formData) => Promise<void>, but
 *  markAllNotificationsReadAction takes no args and returns state. */
async function markAllReadFormAction(_formData: FormData): Promise<void> {
  await markAllNotificationsReadAction();
}

export const metadata = {
  title: "Notifications · Dashboard",
  description:
    "Activity from the kāhui: endorsements given and received, tono proposals, and fulfillments.",
};

interface SearchParams {
  kind?: "endorsement" | "tono";
  filter?: string;
}

/**
 * /notifications — full notification inbox.
 *
 * Query params:
 *   - ?kind=endorsement → only show endorsement notifications
 *   - ?kind=tono        → only show tono notifications
 *   - (no kind)         → show all
 *
 * Server-rendered list with per-row "mark read" links (which navigate
 * to the related entity, marking on visit — see cross-page mark logic).
 *
 * The "Mark all read" button is a server action form.
 */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t = await getTranslations("notifications.inbox");
  const tKind = await getTranslations("notifications.kind");

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const groupFilter = params.kind;

  const notifications = await listMyNotifications({ limit: 100 });

  // Filter by group (endorsement vs tono) if requested
  const filtered: NotificationRow[] = groupFilter
    ? notifications.filter((n) => KIND_GROUP[n.kind] === groupFilter)
    : notifications;

  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to dashboard
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-bronze-300">
            <Inbox className="h-4 w-4" />
            {t("subtitle")}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("lede")}</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllReadFormAction}>
            <Button type="submit" variant="secondary">
              <CheckCheck className="h-4 w-4" />
              {t("markAllRead")}
            </Button>
          </form>
        )}
      </header>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
        <FilterTab href="/notifications" active={!groupFilter} count={notifications.length}>
          {t("all")}
        </FilterTab>
        <FilterTab
          href="/notifications?kind=endorsement"
          active={groupFilter === "endorsement"}
          count={notifications.filter((n) => KIND_GROUP[n.kind] === "endorsement").length}
        >
          {t("endorsement")}
        </FilterTab>
        <FilterTab
          href="/notifications?kind=tono"
          active={groupFilter === "tono"}
          count={notifications.filter((n) => KIND_GROUP[n.kind] === "tono").length}
        >
          {t("tono")}
        </FilterTab>
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">{t("emptyTitle")}</CardTitle>
            <CardDescription>
              {groupFilter
                ? groupFilter === "endorsement"
                  ? t("emptyDescFilter", { kind: t("endorsement") })
                  : t("emptyDescFilter", { kind: t("tono") })
                : t("emptyDescAll")}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => (
            <li key={n.id}>
              <Link
                href={notificationLink(n)}
                className={cn(
                  "block rounded-md border border-border p-3 transition-colors hover:bg-muted/50",
                  n.read_at === null && "border-l-4 border-l-pounamu-400 bg-pounamu-400/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {tKind(n.kind as never)}
                      </Badge>
                      {n.read_at === null && (
                        <Badge variant="secondary" className="text-xs">
                          Unread
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {summarizePayload(n)}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("en-NZ", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterTab({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      <Badge variant={active ? "secondary" : "outline"} className="text-xs">
        {count}
      </Badge>
    </Link>
  );
}

/** Short summary line for a notification's payload. */
function summarizePayload(n: NotificationRow): string {
  const p = n.payload as Record<string, unknown>;
  if (n.kind === "endorsement_revoked") {
    const reason = p.reason as string | undefined;
    if (reason) return `Reason: ${reason}`;
    return "An endorsement was revoked.";
  }
  if (n.kind === "tono_proposal_declined") {
    const reason = p.reason as string | undefined;
    if (reason) return `Reason: ${reason}`;
    return "A proposal was declined.";
  }
  if (n.kind === "tono_fulfilled") {
    return "A tono you helped on was marked fulfilled.";
  }
  // Default
  return "Click to view details.";
}
