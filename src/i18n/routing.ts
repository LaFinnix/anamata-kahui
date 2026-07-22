import { defineRouting } from "next-intl/routing";

/**
 * Routing configuration for the Kāhui platform's multi-language surface.
 *
 * Default locale is `en` — non-Māori speakers land on English.
 * `mi` (te reo Māori) is the actively translated bilingual variant.
 *
 * Future locales (`zh`, `ja`, `niu`, `haw`, `smo`, `fr`, `es`, `pt`) are
 * pre-wired in `locales.ts` so adding a new language is one file edit plus
 * a translation file — no router change.
 *
 * `localePrefix: 'always'` means every URL is prefixed with the locale
 * (`/en/...`, `/mi/...`). This gives clean hreflang for SEO and clear
 * browser history. Public routes are wrapped in `app/(public)/[locale]/...`.
 */
export const routing = defineRouting({
  locales: ["en", "mi"],
  defaultLocale: "en",
  localePrefix: "always",
});
