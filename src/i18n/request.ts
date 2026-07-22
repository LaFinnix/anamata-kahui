import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * next-intl request configuration.
 *
 * Loads the message catalogue for the active locale on every server-side
 * render. Falls back to `en` if the locale isn't recognised (defence in
 * depth — the router already enforces `routing.locales`).
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale =
    requested && routing.locales.includes(requested as (typeof routing.locales)[number])
      ? requested
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
    timeZone: "Pacific/Auckland",
    now: new Date(),
  };
});
