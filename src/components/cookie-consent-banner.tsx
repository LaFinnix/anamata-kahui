"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/**
 * Cookie consent banner — first-visit gate.
 *
 * Shows on first visit (or when kahui_cookie_consent isn't set). Records the
 * user's choice in `kahui_cookie_consent` cookie for 1 year. Three options:
 *   - "Accept all" — sets consent=accepted
 *   - "Reject non-essential" — sets consent=essential_only
 *   - "Customise" — links to /privacy-controls for granular control
 *
 * Strictly necessary cookies (Supabase auth, NEXT_LOCALE) are always on
 * regardless of choice. This banner only gates the optional preference
 * cookie itself; the current build ships zero analytics cookies so the
 * practical impact of "Reject non-essential" today is just preventing
 * the preference cookie from being set.
 *
 * Privacy-conscious: no third-party scripts loaded, no fingerprinting,
 * no network requests on consent. Purely client-side state.
 *
 * Translated via next-intl — all strings come from `cookieConsent.*`.
 */
export function CookieConsentBanner() {
  const t = useTranslations("cookieConsent");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const hasConsent = document.cookie.includes("kahui_cookie_consent=");
    if (!hasConsent) setVisible(true);
  }, []);

  function setConsent(value: "accepted" | "essential_only") {
    document.cookie = `kahui_cookie_consent=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("title")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-bronze-500/30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex-1">
          <p className="text-sm">
            <strong>{t("title")}.</strong> {t("body")}{" "}
            <Link
              href="/legal/cookie-policy"
              className="text-bronze-300 hover:text-bronze-200 underline"
            >
              {t("viewPolicy")}
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground"
          >
            <Link href="/privacy-controls">{t("customise")}</Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConsent("essential_only")}
          >
            {t("reject")}
          </Button>
          <Button size="sm" onClick={() => setConsent("accepted")}>
            {t("accept")}
          </Button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label={t("title")}
            className="ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}