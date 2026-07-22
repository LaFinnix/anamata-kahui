import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale, getMessages } from "next-intl/server";

import { SiteHeader } from "@/components/kahui/site-header";
import { SiteFooter } from "@/components/kahui/site-footer";
import { SkipToContent } from "@/components/kahui/skip-to-content";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { NextIntlClientProvider } from "next-intl";
import { routing } from "@/i18n/routing";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Locale layout — wraps all public (public) routes.
 *
 * Validates the [locale] segment, sets next-intl's request locale
 * (so child pages can call getTranslations() / useTranslations()),
 * and provides the NextIntlClientProvider with the loaded messages.
 */
export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;

  // Validate locale — next-intl handles "not found" for invalid locales
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Set request locale + load messages server-side
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-dvh flex-col">
        <SkipToContent />
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <CookieConsentBanner />
      </div>
    </NextIntlClientProvider>
  );
}
