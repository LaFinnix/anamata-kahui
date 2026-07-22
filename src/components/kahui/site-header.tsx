import Link from "next/link";
import { BranchSwitcher } from "@/components/kahui/branch-switcher";
import { Button } from "@/components/ui/button";

/**
 * SiteHeader — sticky top navigation used by the public route group.
 * Renders the Kāhui wordmark, branch switcher, primary nav, and auth CTA.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-bronze-400 shadow-[0_0_12px_var(--color-bronze-400)]"
          />
          Anamata Kāhui
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-1">
          <BranchSwitcher />
          <Link
            href="/about"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            Contact
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Join</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
