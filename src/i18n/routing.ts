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
 * browser history. To support unprefixed default-locale URLs later, change
 * to `'as-needed'`.
 */
export const routing = defineRouting({
  locales: ["en", "mi"],
  defaultLocale: "en",
  /**
   * `as-needed` keeps the URLs clean while pages live outside the
   * `[locale]` route group:
   *   - English pages stay at `/about` (no `/en/about`).
   *   - Māori pages live at `/mi/about` (the locale-prefixed URL).
   *   - The locale switcher in the header writes the `/mi/...` form when
   *     the user picks te reo Māori.
   *
   * Switch to `'always'` once pages are wrapped in `app/[locale]/...`,
   * which is the production-ready state. The switcher already supports
   * both URL forms.
   */
  localePrefix: "as-needed",
});
