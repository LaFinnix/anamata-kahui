/**
 * Locale catalogue for the Kāhui platform.
 *
 * Only `en` and `mi` are *active* today (localePrefix in `routing.ts`).
 * The `available` list is pre-wired so adding a new language is:
 *   1. Add the code to `available` below
 *   2. Add it to the `locales` array in `routing.ts`
 *   3. Drop a translation file at `src/locales/<code>.json`
 *
 * No router or navigation changes required.
 */
export type LocaleCode = "en" | "mi";
/** Includes codes for stub languages not yet activated. */
export type AnyLocaleCode = LocaleCode | "niu" | "haw" | "smo" | "ton" | "ja" | "zh" | "ko" | "es" | "pt" | "fr" | "de" | "nl";

export interface LocaleMeta {
  code: AnyLocaleCode;
  /** Endonym (the language's own name) — shown in the language picker. */
  endonym: string;
  /** English name — for screen readers and tooling. */
  englishName: string;
  /** ISO 639-1 (or 639-3 for languages without a two-letter code). */
  iso: string;
  /** Text direction. */
  dir: "ltr" | "rtl";
  /** Approximate translation status — drives the UI badge in the picker. */
  status: "active" | "stub";
}

export const ACTIVE_LOCALES: LocaleMeta[] = [
  { code: "en", endonym: "English",     englishName: "English",          iso: "en", dir: "ltr", status: "active" },
  { code: "mi", endonym: "Māori",       englishName: "Te reo Māori",     iso: "mi", dir: "ltr", status: "active" },
];

/**
 * Future-locale placeholder. Add to ACTIVE_LOCALES + routing.ts when
 * translation work begins. No build changes required.
 *
 * Each entry references `AnyLocaleCode` (which includes these stub codes).
 * The `status: "stub"` flag drives a "coming soon" badge in the picker UI
 * so users can see a language exists without being able to switch to it.
 */
export const FUTURE_LOCALES: LocaleMeta[] = [
  { code: "niu", endonym: "Niuē",            englishName: "Niuean",         iso: "niu", dir: "ltr", status: "stub" },
  { code: "haw", endonym: "ʻŌlelo Hawaiʻi", englishName: "Hawaiian",       iso: "haw", dir: "ltr", status: "stub" },
  { code: "smo", endonym: "Gagana Sāmoa",    englishName: "Samoan",         iso: "sm",  dir: "ltr", status: "stub" },
  { code: "ton", endonym: "Lea faka-Tonga",  englishName: "Tongan",         iso: "to",  dir: "ltr", status: "stub" },
  { code: "ja",  endonym: "日本語",          englishName: "Japanese",       iso: "ja",  dir: "ltr", status: "stub" },
  { code: "zh",  endonym: "中文",            englishName: "Chinese",        iso: "zh",  dir: "ltr", status: "stub" },
  { code: "ko",  endonym: "한국어",          englishName: "Korean",         iso: "ko",  dir: "ltr", status: "stub" },
  { code: "es",  endonym: "Español",         englishName: "Spanish",        iso: "es",  dir: "ltr", status: "stub" },
  { code: "pt",  endonym: "Português",       englishName: "Portuguese",     iso: "pt",  dir: "ltr", status: "stub" },
  { code: "fr",  endonym: "Français",        englishName: "French",         iso: "fr",  dir: "ltr", status: "stub" },
  { code: "de",  endonym: "Deutsch",         englishName: "German",         iso: "de",  dir: "ltr", status: "stub" },
  { code: "nl",  endonym: "Nederlands",      englishName: "Dutch",          iso: "nl",  dir: "ltr", status: "stub" },
];

export const ALL_LOCALES: LocaleMeta[] = [...ACTIVE_LOCALES, ...FUTURE_LOCALES];

export const LOCALE_BY_CODE: Record<string, LocaleMeta> = ALL_LOCALES.reduce(
  (acc, l) => {
    acc[l.code] = l;
    return acc;
  },
  {} as Record<string, LocaleMeta>,
);
