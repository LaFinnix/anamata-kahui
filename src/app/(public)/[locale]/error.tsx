"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Locale-aware error boundary for (public) routes.
 *
 * Renders when an unhandled error bubbles up from a server or client
 * component under `/[locale]/...`. Strings come from `errors.generic.*`.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.generic");

  useEffect(() => {
    console.error("[LocaleError]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-destructive">
        Error
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        {t("description")}
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>{t("retry")}</Button>
        <Button asChild variant="secondary">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </div>
  );
}