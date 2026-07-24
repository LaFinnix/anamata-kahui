import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

/**
 * Robots policy — allow all public content, disallow only auth + admin
 * routes and API endpoints.
 *
 * With `localePrefix: 'always'`, the disallow list must cover the
 * locale-prefixed variants of auth + dashboard URLs.
 *
 * Philosophy: index everything public so funders, artists, journalists
 * and the wider community can find the platform via search. Only:
 *   - /api/* (internal endpoints)
 *   - /admin/* (admin dashboard)
 *   - /login, /register, /reset-password (auth pages)
 *   - /dashboard (dashboard landing if it exists)
 * are off-limits to crawlers.
 *
 * Note: the dashboard has /records, /releases, /research, /dev pages
 * that are currently shadowed by the public (public)/[locale]/[slug]
 * marketing pages (those slugs match the branch pages). The marketing
 * pages are what real users see, and they're public, so they're
 * indexable. The dashboard versions are effectively dead routes.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anamatakahui.co.nz";

  // Auth + admin routes. Exclude these from crawlers.
  const protectedPaths = [
    "/admin",           // admin dashboard
    "/login",
    "/register",
    "/reset-password",
    "/dashboard",       // dashboard landing
  ];
  const localeProtectedDisallow = routing.locales.flatMap((loc) =>
    protectedPaths.map((p) => `/${loc}${p}`),
  );
  // Plus the same paths unprefixed (older links may exist without locale prefix).
  const disallow = ["/api/", ...protectedPaths, ...localeProtectedDisallow];

  return {
    rules: [
      {
        userAgent: "*",
        // No explicit `allow` — anything not on the disallow list is
        // indexable. The `["/"]` allow keeps this explicit about intent
        // and ensures root URLs are always crawlable.
        allow: ["/"],
        disallow,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
