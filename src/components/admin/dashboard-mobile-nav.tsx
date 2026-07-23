"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

interface Props {
  groups: NavGroup[];
}

/**
 * <DashboardMobileNav/> — hamburger + slide-out drawer for mobile.
 *
 * The desktop sidebar (hidden md:flex) renders the same nav. This
 * component provides a mobile-friendly equivalent: a hamburger button
 * in the top header that opens a Sheet from the left.
 *
 * Built inline rather than via shadcn/ui so we don't need to add
 * radix-ui to the dependency tree. The animation is CSS-only (no
 * framer-motion / radix).
 */
export function DashboardMobileNav({ groups }: Props) {
  const [open, setOpen] = useState(false);
  const currentPath = usePathname() ?? "/";

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close when path changes (user clicked a link)
  useEffect(() => {
    setOpen(false);
  }, [currentPath]);

  const onLinkClick = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      {/* Hamburger trigger — only visible on mobile */}
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="dashboard-mobile-nav"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-md text-foreground/80 hover:bg-muted hover:text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Drawer */}
      <aside
        id="dashboard-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-card shadow-xl transition-transform duration-200 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <span className="flex items-center gap-2 font-display text-lg font-semibold">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full bg-bronze-400"
            />
            Anamata Kāhui
          </span>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-foreground/80 hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 p-4">
          {groups.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.label}>
                <div className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {group.label}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive =
                      currentPath === item.href ||
                      (item.href !== "/" && currentPath.startsWith(item.href + "/"));
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={onLinkClick}
                        className={cn(
                          "flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                          isActive
                            ? "bg-bronze-400/10 text-foreground"
                            : "text-foreground/80 hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <ItemIcon className="h-4 w-4 text-bronze-300" />
                        {item.label}
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}