"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown, Globe } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ACTIVE_LOCALES, ALL_LOCALES, type LocaleCode } from "@/i18n/locales";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  /**
   * The currently active locale. Once `[locale]` route group is wired up,
   * read this from `useLocale()`. For now it defaults to "en" and the
   * picker links to `/en/...` and `/mi/...` URLs (which 404 until the
   * locale wrap is committed, but structurally functional).
   */
  currentLocale?: LocaleCode;
}

/**
 * Language switcher for the public site header.
 *
 * - Active locales are clickable — they swap to the same path under the new
 *   locale prefix.
 * - Stub locales (ja, zh, es, ...) are visible in the list with a "coming soon"
 *   badge so the platform signals global-readiness without claiming support
 *   it doesn't have.
 */
export function LanguageSwitcher({ currentLocale = "en" }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const activeMeta = ACTIVE_LOCALES.find((l) => l.code === currentLocale);

  // Strip any leading /:locale/ segment so we can rebuild the URL with a new prefix.
  const stripLocale = (path: string) => {
    const match = path.match(/^\/([a-z]{2,3})(\/|$)/);
    if (!match) return path;
    return path.slice(match[0].length - (match[2] === "/" ? 1 : 0)) || "/";
  };

  const buildHref = (locale: string) => `/${locale}${stripLocale(pathname)}`;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
          "text-foreground/80 hover:text-foreground hover:bg-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "data-[state=open]:bg-muted data-[state=open]:text-foreground",
        )}
        aria-label="Switch language"
      >
        <Globe className="h-4 w-4 opacity-70" />
        <span className="hidden sm:inline">{activeMeta?.endonym ?? "Language"}</span>
        <span className="sm:hidden">{activeMeta?.code.toUpperCase() ?? "EN"}</span>
        <ChevronDown className="h-4 w-4 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Language · Reo</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {ACTIVE_LOCALES.map((locale) => {
          const isActive = currentLocale === locale.code;
          return (
            <DropdownMenuItem
              key={locale.code}
              asChild
              className={cn(isActive && "bg-muted text-foreground")}
            >
              <Link
                href={buildHref(locale.code)}
                className="flex items-center justify-between py-2"
                onClick={() => setOpen(false)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{locale.endonym}</span>
                  <span className="text-xs text-muted-foreground">
                    {locale.englishName}
                  </span>
                </div>
                {isActive && <Check className="h-4 w-4 text-bronze-300" />}
              </Link>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground/70">
          Coming soon
        </DropdownMenuLabel>
        {ALL_LOCALES.filter((l) => l.status === "stub").map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            disabled
            className="flex items-center justify-between opacity-60"
          >
            <div className="flex flex-col">
              <span className="font-medium">{locale.endonym}</span>
              <span className="text-xs text-muted-foreground">
                {locale.englishName}
              </span>
            </div>
            <span className="text-xs text-muted-foreground/70">soon</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
