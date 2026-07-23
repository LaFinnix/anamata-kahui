import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";
import { isReadSlugPublished } from "@/lib/supabase/check-read-status";

/**
 * Root proxy — Next 16's renamed middleware.
 *
 * Composes three middlewares:
 *   1. Draft-read gate — returns HTTP 404 for /[locale]/reads/[slug]
 *      if the slug isn't in the published set. Drafts return 404 instead
 *      of Next.js's default 200 + not-found body so search engines don't
 *      index unpublished URLs.
 *   2. next-intl locale handling — negotiates + persists user language.
 *   3. Supabase session refresh + dashboard route protection.
 *
 * The draft-read gate is intentionally cheap (cached 60s).
 */
const intl = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  // 1. Draft-read gate — return 404 for /[locale]/reads/[slug] URLs
  //    that aren't published. Runs before locale so the path is raw.
  const path = request.nextUrl.pathname;
  const readMatch = path.match(/^\/(en|mi)\/reads\/([a-z0-9-]+)\/?$/);
  if (readMatch) {
    const slug = readMatch[2];
    const published = await isReadSlugPublished(slug);
    if (!published) {
      // Return a 404 with no body — search engines won't index
      // draft URLs, and the Next.js not-found UI never renders.
      return new NextResponse("Not Found", {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }
  }

  // 2. Locale handling.
  const intlResponse = intl(request);

  // Short-circuit on redirect/rewrite so the auth chain doesn't run.
  if (
    intlResponse.headers.get("location") !== null ||
    intlResponse.headers.get("x-middleware-rewrite") !== null
  ) {
    return intlResponse;
  }

  // 3. Supabase session refresh + dashboard route protection, carrying
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
