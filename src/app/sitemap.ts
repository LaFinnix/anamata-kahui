import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

/**
 * Sitemap — Next.js generates /sitemap.xml from this.
 *
 * Lists every public route under every active locale. The (dashboard) and
 * (auth) route groups are excluded — they're auth-gated or irrelevant to
 * search engines.
 *
 * With `localePrefix: 'always'`, every URL is prefixed with its locale.
 * /en/about is canonical for English; /mi/about for te reo Māori.
 * Search engines see distinct URLs, not redirects.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anamatakahui.co.nz";
  const now = new Date();

  // All public paths under the [locale] route group.
  const publicPaths = [
    "", // home — renders as /en, /mi
    "/about",
    "/accessibility",
    "/artist",
    "/contact",
    "/dev",
    "/dev/tools/audit",
    "/dev/tools/concordance",
    "/dev/tools/stem-browser",
    "/evidence",
    "/for-funders",
    "/funding",
    "/governance",
    "/impact",
    "/kaitiakitanga",
    "/legal/cookie-policy",
    "/legal/privacy-notice",
    "/legal/terms-of-use",
    "/open-source",
    "/press",
    "/press/funder-kit.pdf",
    "/privacy-controls",
    "/research/about",
    "/research/field-projects",
    "/research/papers",
    "/research/scholarships",
    "/research/scholarships/portfolio",
    "/sustainability",
    "/transparency",
    "/waiata",
  ];

  return routing.locales.flatMap((locale) =>
    publicPaths.map((path) => {
      const url = `${base}/${locale}${path}`;
      return {
        url,
        lastModified: now,
        changeFrequency:
          path === "" || path === "/impact" || path === "/waiata"
            ? ("weekly" as const)
            : ("monthly" as const),
        priority:
          path === ""
            ? 1.0
            : path === "/impact" || path === "/about" || path === "/for-funders"
              ? 0.8
              : 0.5,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => [l, `${base}/${l}${path}`]),
          ),
        },
      };
    }),
  );
}