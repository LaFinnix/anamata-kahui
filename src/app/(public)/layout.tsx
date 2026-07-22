import type { ReactNode } from "react";
import { SiteHeader } from "@/components/kahui/site-header";
import { SiteFooter } from "@/components/kahui/site-footer";
import { SkipToContent } from "@/components/kahui/skip-to-content";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

/**
 * Public route group — the (public) segment does not appear in the URL.
 * All marketing, landing, and branch-overview routes live here.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipToContent />
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <CookieConsentBanner />
    </div>
  );
}
