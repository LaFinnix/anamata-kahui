"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell, Check, Inbox } from "lucide-react";

import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { notificationLink, type NotificationRow } from "@/lib/notifications/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  /** Server-fetched initial notifications + unread count. */
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
  /** Max items to show in the dropdown (default 10). */
  dropdownLimit?: number;
}

/**
 * <NotificationBell/> — header bell with dropdown.
 *
 * Renders the bell + unread count badge. Click opens a dropdown with
 * the most recent N notifications and a "Mark all read" action.
 * Per-item "mark read" via a server action (handled via form submit
 * to avoid client-side fetch complexity).
 *
 * Polls /api/notifications/unread-count every 60s while the dashboard
 * is open so the badge stays fresh without a full reload.
 *
 * v1.1: polling interval is conservative; v2 may switch to Supabase
 * Realtime once we have the koha ledger too.
 */
export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
  dropdownLimit = 10,
}: Props) {
  const t = useTranslations("notifications");
  const tKind = useTranslations("notifications.kind");
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Poll unread count every 60s while mounted
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (typeof json.count === "number") {
          setUnreadCount(json.count);
        }
      } catch {
        // Silent — polling failure shouldn't disrupt the UI
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Optimistically decrement when a "mark read" form is submitted by
  // watching for the form submit. useFormStatus would be cleaner but
  // requires nesting in another form — instead we just refresh after
  // revalidatePath() re-runs the page.
  const recent = initialNotifications.slice(0, dropdownLimit);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={t("bell.label")}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px] leading-none"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border border-border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium">{t("bell.title")}</span>
            <form action={markAllReadFormAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                disabled={unreadCount === 0}
              >
                <Check className="h-3 w-3" />
                {t("bell.markAllRead")}
              </button>
            </form>
          </div>

          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
              <Inbox className="h-8 w-8 text-muted-foreground/50" />
              <p>{t("empty.title")}</p>
              <p className="text-xs">{t("empty.hint")}</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {recent.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "border-b border-border last:border-b-0",
                    n.read_at === null && "bg-pounamu-400/5",
                  )}
                >
                  <Link
                    href={notificationLink(n)}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">
                        {tKind(n.kind as never)}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {relativeTime(n.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {truncate(n.kind, n.payload)}
                    </p>
                  </Link>
                  {n.read_at === null && (
                    <form
                      action={markOneReadFormAction}
                      className="px-3 pb-2"
                    >
                      <input type="hidden" name="id" value={n.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-xs text-bronze-300 hover:text-bronze-200"
                      >
                        <Check className="h-3 w-3" />
                        {t("item.markRead")}
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border px-3 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
            >
              {t("bell.seeAll")}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Form action wrappers — <form action={…}> needs (formData) => Promise<void> */
/* -------------------------------------------------------------------------- */

async function markAllReadFormAction(_formData: FormData): Promise<void> {
  await markAllNotificationsReadAction();
}

async function markOneReadFormAction(formData: FormData): Promise<void> {
  await markNotificationReadAction(null, formData);
}

/* -------------------------------------------------------------------------- */
/* Helpers (private)                                                           */
/* -------------------------------------------------------------------------- */

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return "now";
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h`;
  if (diffSec < 604800) return `${Math.round(diffSec / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-NZ", { month: "short", day: "numeric" });
}

/** Truncate a notification's payload into a short hint line. */
function truncate(
  kind: string,
  payload: Record<string, unknown>,
): string {
  const work = payload.work_id ? " on this work" : "";
  const tono = payload.tono_id ? " on a tono" : "";
  const reason = payload.reason as string | undefined;
  if (kind === "endorsement_revoked" && reason) {
    return `Reason: ${reason.slice(0, 60)}${reason.length > 60 ? "…" : ""}`;
  }
  return `${work || tono || "View details"}`;
}
