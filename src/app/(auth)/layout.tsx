import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Auth route group — minimal chrome, no main site header/footer.
 * Centred card layout for login, register, and password reset.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2 font-display text-lg font-semibold"
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full bg-bronze-400 shadow-[0_0_12px_var(--color-bronze-400)]"
            />
            Anamata Kāhui
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
