import type { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Root proxy — Next 16's renamed middleware.
 *
 * Composes two middlewares:
 *   1. next-intl locale handling — negotiates + persists user language.
 *   2. Supabase session refresh + dashboard route protection.
 *
 * The locale middleware runs first. If it returns a redirect/rewrite we
 * short-circuit. Otherwise we pass its response into updateSession as the
 * passthrough so cookies set by the locale middleware survive.
 *
 * Note: dev-server route resolution can hit edge cases when locale + page
 * trees are partially set up — see docs/FUNDING-AUDIT.md for the
 * `[locale]` migration plan. Production builds are unaffected.
 */
const intl = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  // 1. Locale handling.
  const intlResponse = intl(request);

  // Short-circuit on redirect/rewrite so the auth chain doesn't run.
  if (
    intlResponse.headers.get("location") !== null ||
    intlResponse.headers.get("x-middleware-rewrite") !== null
  ) {
    return intlResponse;
  }

  // 2. Supabase session refresh + dashboard route protection, carrying
  //    through any cookies the locale middleware set.
  return updateSession(request, intlResponse);
}

export const config = {
  matcher: [
    // Skip static assets, _next internals, image optimisations, and any path
    // that already starts with /api (handled by their own route handlers).
    "/((?!_next/static|_next/image|_vercel|favicon.ico|api|.*\\..*).*)",
  ],
};
