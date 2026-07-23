import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

/**
 * Robots policy — disallows all crawlers from auth + dashboard routes,
 * allows every locale-prefixed public URL.
 *
 * With `localePrefix: 'always'`, the disallow list must also cover the
 * locale-prefixed variants of auth + dashboard URLs.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anamatakahui.co.nz";

  // Routes under /<locale>/<auth-or-dashboard>/... — all locales must be
  // disallowed to keep crawlers out of auth + dashboard URLs.
  const protectedPaths = ["/admin", "/records", "/releases", "/analytics",
    "/research", "/dev", "/login", "/register", "/reset-password"];
  const localeProtectedDisallow = routing.locales.flatMap((loc) =>
    protectedPaths.map((p) => `/${loc}${p}`),
  );
  // Plus the same paths unprefixed (older links may exist).
  const disallow = ["/api/", ...protectedPaths, ...localeProtectedDisallow];

  // Public routes that crawlers may index, across all locales.
  const allowedLocalePaths = routing.locales.flatMap((loc) => [
    `/${loc}`,
    `/${loc}/press`,
    `/${loc}/waiata`,
    `/${loc}/for-funders`,
  ]);

  return {
    rules: [
      {
        userAgent: "*",
        allow: allowedLocalePaths,
        disallow,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}