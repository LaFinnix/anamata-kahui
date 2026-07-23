import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

/**
 * Locale-aware 404 — rendered by Next.js when no [locale]/... route matches.
 *
 * Strings come from `errors.notFound.*`. Sits at `(public)/[locale]/not-found.tsx`
 * so any URL under `/en/...` or `/mi/...` that doesn't match renders in the
 * user's chosen language.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("errors.notFound");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-bronze-300">
        404
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        {t("description")}
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </div>
  );
}