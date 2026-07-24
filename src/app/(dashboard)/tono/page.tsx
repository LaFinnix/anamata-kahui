import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, Inbox, ArrowRight, Megaphone } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase/clients";
import { listMyTonos, countTonosByStatus, listOpenTonosICanHelp } from "@/lib/queries/tono";
import { TonoCard } from "@/components/tono/tono-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TONO_STATUS_LABEL,
  type TonoStatus,
} from "@/lib/tono/types";

export const metadata = {
  title: "Tono board · Dashboard",
  description:
    "Help requests you've posted. Track proposals, fulfillments, and your cross-iwi collaboration loop.",
};

const STATUS_ORDER: TonoStatus[] = [
  "open",
  "in_conversation",
  "fulfilled",
  "closed",
  "withdrawn",
];

/**
 * /tono — my tono board.
 *
 * Kanban-ish view of the user's own help requests. The user sees:
 *   - Status counts (board-wide summary)
 *   - Active statuses (open, in_conversation) prominent
 *   - Resolved statuses (fulfilled, closed, withdrawn) collapsed below
 *
 * Inbox discovery is a separate route (/tono/inbox).
 */
export default async function TonoBoardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const t = await getTranslations("tono.board");

  const [tonos, counts, inboxPreview] = await Promise.all([
    listMyTonos(user.id),
    countTonosByStatus(user.id),
    listOpenTonosICanHelp(),
  ]);

  const activeTonos = tonos.filter((t) => t.status === "open" || t.status === "in_conversation");
  const resolvedTonos = tonos.filter((t) => t.status !== "open" && t.status !== "in_conversation");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-bronze-300">
            <Megaphone className="h-4 w-4" />
            {t("subtitle")}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("lede")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/tono/inbox">
              <Inbox className="h-4 w-4" />
              Inbox
              {inboxPreview.length > 0 && (
                <Badge variant="outline" className="ml-1">
                  {inboxPreview.length}
                </Badge>
              )}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/tono/new">
              <Plus className="h-4 w-4" />
              New tono
            </Link>
          </Button>
        </div>
      </header>

      {/* Status counts */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="rounded-md border border-border p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {TONO_STATUS_LABEL[s]}
                </div>
                <div className="mt-1 font-display text-2xl font-semibold">
                  {counts[s]}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active tonos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Active
        </h2>
        {activeTonos.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">No active tono</CardTitle>
              <CardDescription>
                Post one when you need cultural help with a work in progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/tono/new">
                  <Plus className="h-4 w-4" />
                  Post your first tono
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeTonos.map((t) => (
              <TonoCard key={t.id} tono={t} perspective="creator" />
            ))}
          </div>
        )}
      </section>

      {/* Resolved tonos */}
      {resolvedTonos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Resolved
          </h2>
          <div className="space-y-3">
            {resolvedTonos.map((t) => (
              <TonoCard key={t.id} tono={t} perspective="creator" />
            ))}
          </div>
        </section>
      )}

      {/* Inbox preview */}
      {inboxPreview.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Open tono you can help on
            </h2>
            <Link
              href="/tono/inbox"
              className="inline-flex items-center gap-1 text-sm text-bronze-300 hover:text-bronze-200"
            >
              See all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {inboxPreview.slice(0, 3).map(({ tono, creator, has_proposed }) => (
              <TonoCard
                key={tono.id}
                tono={tono}
                perspective="helper"
                creator={creator}
                hasProposed={has_proposed}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
