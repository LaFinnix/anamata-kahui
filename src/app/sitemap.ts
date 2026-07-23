import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/clients";

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
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    "/dev/tools/cron",
    "/dev/tools/json",
    "/dev/tools/regex",
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
    "/reads",
    "/reads/kind/note",
    "/reads/kind/research",
    "/reads/kind/data_drop",
    "/research/about",
    "/research/field-projects",
    "/research/papers",
    "/research/scholarships",
    "/research/scholarships/portfolio",
    "/sustainability",
    "/transparency",
    "/waiata",
  ];

  // Fetch published reads for individual article entries
  const admin = createAdminClient();
  const { data: reads } = await admin
    .from("reads_public")
    .select("slug, kind, updated_at, published_at, is_seo_focused")
    .order("published_at", { ascending: false })
    .limit(200);

  const readEntries = (reads ?? []).flatMap((read) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}/reads/${read.slug}`,
      lastModified: read.updated_at ? new Date(read.updated_at) : now,
      changeFrequency: "monthly" as const,
      priority: read.is_seo_focused ? 0.9 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${base}/${l}/reads/${read.slug}`]),
        ),
      },
    })),
  );

  return [
    ...routing.locales.flatMap((locale) =>
      publicPaths.map((path) => {
        const url = `${base}/${locale}${path}`;
        return {
          url,
          lastModified: now,
          changeFrequency:
            path === "" || path === "/impact" || path === "/waiata" || path === "/reads"
              ? ("weekly" as const)
              : ("monthly" as const),
          priority:
            path === ""
              ? 1.0
              : path === "/impact" || path === "/about" || path === "/for-funders" || path === "/reads"
                ? 0.8
                : 0.5,
          alternates: {
            languages: Object.fromEntries(
              routing.locales.map((l) => [l, `${base}/${l}${path}`]),
            ),
          },
        };
      }),
    ),
    ...readEntries,
  ];
}