import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 404 — rendered by Next.js when no route matches.
 * Sits at the root of `app/` so it's available across every route group.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-bronze-300">
        404
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        The page you were looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/contact">Tell us what you were looking for</Link>
        </Button>
      </div>
    </div>
  );
}
