import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Root proxy — Next 16's renamed middleware.
 *
 * Runs on every request. Composes two middlewares in order:
 *   1. next-intl locale middleware — adds locale prefix, negotiates first-visit
 *      language, persists user choice in a cookie.
 *   2. Supabase session refresh — refreshes the JWT, gates (dashboard) routes.
 *
 * Order matters: locale first means an unauthed user hitting `/mi/admin`
 * is redirected to `/mi/login` (consistent UX) rather than `/en/login`.
 */
const intl = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // 1. Locale handling — may rewrite / redirect.
  const intlResponse = intl(request);

  // If intl returned a redirect/rewrite, return it directly.
  const isIntlRedirect =
    intlResponse.headers.get("x-middleware-rewrite") !== null ||
    intlResponse.headers.get("location") !== null;
  if (isIntlRedirect) {
    return intlResponse;
  }

  // 2. Supabase session refresh + dashboard route protection, carrying
  //    through any cookies the intl middleware set.
  return updateSession(request, intlResponse);
}

export const config = {
  matcher: [
    // Skip static assets, _next internals, image optimisations, and any path
    // that already starts with /api (handled by their own route handlers).
    "/((?!_next/static|_next/image|_vercel|favicon.ico|api|.*\\..*).*)",
  ],
};
