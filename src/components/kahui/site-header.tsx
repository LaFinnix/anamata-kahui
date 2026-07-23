"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/kahui/language-switcher";

/**
 * Site header — top nav.
 *
 * Link set:
 *   /about        — About the Kāhui (cross-branch)
 *   /contact      — Contact
 *   /research     — Research & Language Preservation branch
 *   /waiata       — Anamata Records (waiata catalog — public-facing name)
 *   /reads        — Long-form research
 *   /news         — Time-sensitive updates
 *
 * Translations:
 *   We use `t("nav.xxx")` for nav labels — these are added to en.json
 *   and mi.json. Older code used top-level keys like t("research"),
 *   which collided with `research.title` objects. The new keys live
 *   under the `nav` namespace.
 */
export function SiteHeader() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="mr-6 flex items-center gap-2">
          <div className="h-6 w-6 rounded-sm bg-gradient-to-br from-bronze-500 to-bronze-300" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Anamata Kāhui
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/about"
            className="min-h-[44px] rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            {t("about")}
          </Link>
          <Link
            href="/contact"
            className="min-h-[44px] rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            {t("contact")}
          </Link>
          <Link
            href="/research"
            className="min-h-[44px] rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            {t("research")}
          </Link>
          <Link
            href="/waiata"
            className="min-h-[44px] rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            {t("records")}
          </Link>
          <Link
            href="/reads"
            className="min-h-[44px] rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            {t("reads")}
          </Link>
          <Link
            href="/news"
            className="min-h-[44px] rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            {t("news")}
          </Link>
          <LanguageSwitcher />
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t("signIn")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">{t("join")}</Link>
          </Button>
        </div>

        <button
          aria-label="Toggle menu"
          className="ml-auto rounded-md p-2 hover:bg-muted md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="space-y-1 border-t border-border px-4 py-3 md:hidden">
          <Link href="/about" className="block min-h-[44px] rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
            {t("about")}
          </Link>
          <Link href="/contact" className="block min-h-[44px] rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
            {t("contact")}
          </Link>
          <Link href="/research" className="block min-h-[44px] rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
            {t("research")}
          </Link>
          <Link href="/waiata" className="block min-h-[44px] rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
            {t("records")}
          </Link>
          <Link href="/reads" className="block min-h-[44px] rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
            {t("reads")}
          </Link>
          <Link href="/news" className="block min-h-[44px] rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
            {t("news")}
          </Link>
          <div className="pt-2">
            <Link href="/login" className="block min-h-[44px] rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
              {t("signIn")}
            </Link>
            <Link href="/register" className="block min-h-[44px] rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
              {t("join")}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}