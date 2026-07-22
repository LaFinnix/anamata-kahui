import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

/**
 * Sitemap — Next.js generates /sitemap.xml from this.
 *
 * Lists every public route under every active locale. The (dashboard) and
 * (auth) route groups are excluded — they're auth-gated or irrelevant to
 * search engines.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anamatakahui.co.nz";
  const now = new Date();

  const publicPaths = [
    "",
    "/about",
    "/contact",
    "/records",
    "/research",
    "/arts",
    "/dev",
    "/legal/privacy-notice",
    "/legal/cookie-policy",
    "/legal/terms-of-use",
  ];

  return routing.locales.flatMap((locale) =>
    publicPaths.map((path) => ({
      url: `${base}/${locale}${path}`,
      lastModified: now,
      changeFrequency: path === "" ? "weekly" as const : "monthly" as const,
      priority: path === "" ? 1.0 : 0.6,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${base}/${l}${path}`]),
        ),
      },
    })),
  );
}
