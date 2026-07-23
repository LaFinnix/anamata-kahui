import Link from "next/link";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/kahui/language-switcher";
import { Button } from "@/components/ui/button";

/**
 * SiteHeader — sticky top navigation used by the public route group.
 * Renders the Kāhui wordmark, primary nav, and auth CTA.
 *
 * Translation wiring: copy lives in `locales/{en,mi}.json` under `nav.*`
 * and `brand.*`. Switches automatically based on the active locale
 * (set by next-intl middleware).
 *
 * Links are locale-aware — the middleware ensures /about renders as
 * /en/about or /mi/about; relative hrefs here resolve to the active
 * locale automatically.
 */
export function SiteHeader() {
  const t = useTranslations("nav");
  const tBrand = useTranslations("brand");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-bronze-400 shadow-[0_0_12px_var(--color-bronze-400)]"
          />
          {tBrand("name")}
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-1">
          <Link
            href="/about"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            {t("about")}
          </Link>
          <Link
            href="/contact"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            {t("contact")}
          </Link>
          <Link
            href="/research"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            {t("research")}
          </Link>
          <Link
            href="/reads"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            Reads
          </Link>
          <Link
            href="/waiata"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            {t("records")}
          </Link>
          <LanguageSwitcher />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t("signIn")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">{t("join")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
