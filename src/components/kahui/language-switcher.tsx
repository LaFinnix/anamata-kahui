"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Check, ChevronDown, Globe } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ACTIVE_LOCALES, ALL_LOCALES } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Language switcher for the public site header.
 *
 * Reads the active locale from next-intl's `useLocale()`. When the user
 * picks a different locale, we strip the existing prefix from the
 * pathname and prepend the new locale. The middleware then resolves
 * `/mi/about` → the `/[locale]/about` route with the message catalogue
 * for `mi`.
 */
export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = useLocale();

  function switchTo(target: string) {
    setOpen(false);
    if (target === currentLocale) return;

    // Strip the existing locale prefix (if any) and prepend the new one
    const stripped = pathname.replace(/^\/(en|mi)/, "") || "/";
    const targetPath =
      stripped === "/" ? `/${target}` : `/${target}${stripped}`;
    router.push(targetPath);
  }

  const activeMeta = ACTIVE_LOCALES.find((l) => l.code === currentLocale);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-label="Switch language"
      >
        <Globe className="h-3 w-3" />
        <span className="hidden sm:inline">{activeMeta?.endonym ?? "Language"}</span>
        <span className="sm:hidden">{currentLocale.toUpperCase()}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Language · Reo</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ACTIVE_LOCALES.map((loc) => {
          const isActive = currentLocale === loc.code;
          return (
            <DropdownMenuItem
              key={loc.code}
              onClick={() => switchTo(loc.code)}
              className={cn(
                "flex items-center justify-between py-2",
                isActive && "bg-muted text-foreground",
              )}
            >
              <div className="flex flex-col">
                <span className="font-medium">{loc.endonym}</span>
                <span className="text-xs text-muted-foreground">
                  {loc.englishName}
                </span>
              </div>
              {isActive && <Check className="h-4 w-4 text-bronze-300" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          Coming soon
        </DropdownMenuLabel>
        {ALL_LOCALES.filter((l) => l.status === "stub").map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            disabled
            className="flex items-center justify-between opacity-50 py-2"
          >
            <div className="flex flex-col">
              <span className="font-medium">{loc.endonym}</span>
              <span className="text-xs text-muted-foreground">
                {loc.englishName}
              </span>
            </div>
            <span className="text-xs italic text-muted-foreground">soon</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
