import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

/**
 * Robots policy — disallows all crawlers from auth + dashboard routes,
 * allows everything else.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://anamatakahui.co.nz";

  return {
    rules: [
      {
        userAgent: "*",
        allow: routing.locales.map((l) => `/${l}`),
        disallow: ["/api/", "/admin", "/records", "/releases", "/analytics", "/research", "/dev"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
