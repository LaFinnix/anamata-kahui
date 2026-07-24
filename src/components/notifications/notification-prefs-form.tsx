"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Mail, Bell, Save, RotateCcw } from "lucide-react";

import {
  updateNotificationPrefsAction,
  type NotificationPrefsState,
} from "@/lib/actions/notification-prefs";
import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_KIND_ORDER,
  normaliseNotificationPrefs,
  type ChannelPrefs,
  type NotificationPrefs,
} from "@/lib/notifications/prefs";
import { KIND_LABEL } from "@/lib/notifications/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  initial: NotificationPrefs;
}

/** Wrapper — <form action> needs (formData) => Promise<void>, but
 *  updateNotificationPrefsAction returns state with no args bindable. */
async function saveFormAction(formData: FormData): Promise<void> {
  await updateNotificationPrefsAction(null, formData);
}

export function NotificationPrefsForm({ initial }: Props) {
  const t = useTranslations("notifications.prefs");
  const tKind = useTranslations("notifications.kind");

  // Local optimistic state — what the form displays. The server action
  // writes to DB; we update local state only on the next page load (which
  // the server revalidates via revalidatePath). This keeps the source of
  // truth in the DB.
  const [draft, setDraft] = useState<NotificationPrefs>(initial);
  const [state, formAction, pending] = useActionState<NotificationPrefsState, FormData>(
    updateNotificationPrefsAction,
    { error: undefined, success: undefined },
  );

  const setChannel = (kind: keyof NotificationPrefs, channel: keyof ChannelPrefs, value: boolean) => {
    setDraft((d) => ({ ...d, [kind]: { ...d[kind], [channel]: value } }));
  };

  const resetToDefaults = () => setDraft(DEFAULT_NOTIFICATION_PREFS);

  const json = JSON.stringify(draft);

  return (
    <form action={saveFormAction} className="space-y-4">
      <input type="hidden" name="prefs" value={json} />

      <div className="rounded-lg border border-border bg-card">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>Notification kind</span>
          <span className="flex items-center gap-1">
            <Bell className="h-3 w-3" />
            {t("inApp")}
          </span>
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {t("email")}
          </span>
        </div>

        {/* One row per kind */}
        {NOTIFICATION_KIND_ORDER.map((kind) => {
          const prefs = draft[kind];
          return (
            <div
              key={kind}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium">{tKind(kind as never)}</p>
                <p className="text-xs text-muted-foreground">{t(`kindDesc.${kind}`)}</p>
              </div>
              <Toggle
                checked={prefs.in_app}
                onChange={(v) => setChannel(kind, "in_app", v)}
                ariaLabel={`${tKind(kind as never)} ${t("inApp")}`}
              />
              <Toggle
                checked={prefs.email}
                onChange={(v) => setChannel(kind, "email", v)}
                ariaLabel={`${tKind(kind as never)} ${t("email")}`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={resetToDefaults}>
          <RotateCcw className="h-3 w-3" />
          {t("resetToDefaults")}
        </Button>

        <div className="flex items-center gap-3">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-sm text-pounamu-300">{state.success}</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("save")}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        checked ? "bg-pounamu-400" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

/** Helper for the page to feed the form's initial state. */
export function getInitialPrefs(raw: unknown): NotificationPrefs {
  return normaliseNotificationPrefs(raw);
}
