# Anamata Kāhui — Public Pages Audit

**Date:** 2026-07-22 · **Method:** Static analysis of `src/app/(public)/[locale]/**`
**Auditor:** platform audit agent

## Scope

31 public pages across 5 branches (Kāhui apex, Music/Records, Research,
Creative Arts, Dev & Tech) + 3 dynamic route groups (`[slug]` for
branch landing, `waiata/[slug]`, `research/papers/[id]`).

## Headline findings

| # | Severity | Finding | Fix effort |
|---|---|---|---|
| 1 | **Critical** | 30 / 31 public pages missing `useTranslations` / `getTranslations` — only the home page hero is wired. `/mi/about` renders English body copy. **NZ Privacy Act 2020 + UNDRIP risk** for legal pages users can't read in their language. | 4-7 days |
| 2 | **High** | Top-level `not-found.tsx` and `error.tsx` are English-only; `/mi/...` 404s and errors show English to te reo speakers | 1 day |
| 3 | **High** | Sitemap still uses `localePrefix: 'as-needed'` logic — `/sitemap.xml` lists `/about` for `en` (correct: redirects to `/en/about`) but doesn't list `/en/about` directly. Search engines see wrong URL. | 1 hour |
| 4 | **High** | 3 public pages missing `metadata` export: `page.tsx` (home), `waiata/[slug]/page.tsx`, `[slug]/page.tsx` (branch landing) — generic site title only; no OG image, no description | 1 day |
| 5 | **Medium** | No per-page custom Open Graph — waiata and papers don't have social-share previews | 1 day |
| 6 | **Medium** | `privacy-controls/page.tsx` has 2 `<h1>` elements (anon + authed branches both render `<h1>`) — WCAG H42 violation | 1 hour |
| 7 | **Medium** | No `(public)/[locale]/loading.tsx` — pages with DB queries show no skeleton during initial load. Affects perceived performance | 1 day |
| 8 | **Medium** | Cookie consent banner, privacy-controls page, and all 3 legal pages not translated | (overlap with #1) |
| 9 | **Low** | No dynamic imports for heavy interactive components (concordance search form, audit viewer tables) | 1 day |
| 10 | **Low** | Sitemap list is missing `/impact`, `/transparency`, `/kaitiakitanga`, `/for-funders`, `/press`, `/funding`, `/accessibility`, `/sustainability`, `/evidence`, `/open-source`, `/governance`, `/about` + `/dev`, `/records`, `/research`, `/arts` (branch landings), `/waiata` + `/waiata/[slug]`, `/research/papers` + `/research/papers/[id]` + `/research/scholarships` + `/research/scholarships/portfolio` + `/research/field-projects` + `/research/about`, `/artist` — only 9 paths listed | 1 hour |
| 11 | **Low** | `<html lang>` stays static `'en'` on non-i18n routes (auth, dashboard) | 30 min |
| 12 | **Low** | No `<Image>` components used anywhere — external images (none currently) would use raw `<img>`. No `next/image` setup | (only matters when real images added) |

## Verified live (during audit)

- ✅ 53 routes in `(public)/[locale]/...`
- ✅ Build green
- ✅ All routes return 200 on dev server smoke tests
- ❌ Same dev-server 404 bug noted earlier (production unaffected)
- ❌ `[locale]/loading.tsx` and `[locale]/error.tsx` missing

## Detailed findings

### 1. Translation coverage (Critical)

| Page | `useTranslations` wired? |
|---|---|
| `/[locale]` (home) | ✅ hero only (eyebrow, headline, lede, stats, CTAs) |
| All other 30 pages | ❌ |

The bilingual dictionary has **103 keys** in `en.json` + `mi.json`.
Almost none are wired into components. Pages render English-only body
content under `/mi/...` URLs.

**Specific high-risk pages** (legal + privacy):
- `/legal/privacy-notice`
- `/legal/cookie-policy`
- `/legal/terms-of-use`
- `/privacy-controls`

These are the pages where users must **understand their rights** to give
informed consent. Showing them English while they navigate te reo is a
NZ Privacy Act 2020 risk (IPP #3 — right to be informed).

**Fix order:**
1. Top-bar + footer + nav (already done)
2. Cookie consent banner (so users can accept/reject in their language)
3. Privacy notice + cookie policy + terms (legal obligation)
4. Privacy controls page (user-facing rights UI)
5. Remaining pages incrementally

### 2. Top-level 404 / error pages (High)

`src/app/not-found.tsx` and `src/app/error.tsx` are hardcoded English.

For `/mi/...` routes that 404, Next.js still renders this file — so a
te reo speaker gets "Page not found" in English.

**Fix:** move both files under `(public)/[locale]/not-found.tsx` and
`(public)/[locale]/error.tsx` (Next 16 supports per-locale error UIs).

### 3. Sitemap using old routing config (High)

`src/app/sitemap.ts` was written when `localePrefix: 'as-needed'`. After
we moved to `'always'`, every URL on the sitemap is wrong:

| Sitemap URL | Actual URL | Behaviour |
|---|---|---|
| `/about` | `/en/about` | 307 → works, but sitemap should say `/en/about` |
| `/mi/about` | `/mi/about` | ✅ correct |

**Fix:** update the conditional in `sitemap.ts`. One-file change, 1 hour.

### 4. Missing metadata on 3 pages (High)

`page.tsx`, `waiata/[slug]/page.tsx`, `[slug]/page.tsx` (branch landing)
have no `metadata` export. They use the root layout's default title.

For waiata detail specifically: the title is just "Anamata Kāhui". A
Waiata shared on Twitter shows nothing identifying.

**Fix:** add per-page metadata to each. WAIATA detail should expose
title + description + release date + cultural provenance summary.

### 5. Per-page OG (Medium)

Generic OG image only (`src/app/opengraph-image.tsx`). No dynamic OG
for waiata or papers.

**Fix:** in `waiata/[slug]/page.tsx` and `research/papers/[id]/page.tsx`,
generate dynamic OG via `opengraph-image.tsx` route segments.

### 6. Two `<h1>` on privacy-controls (Medium)

`src/app/(public)/[locale]/privacy-controls/page.tsx:34` and `:60`
both render `<h1>`. Both branches (anon + authed) are mutually exclusive
in JSX, so only one renders per request — but **the source has 2**.

**Fix:** change the anon branch from `<h1>` to `<h2>` (or wrap in a
`<header>` with a single `<h1>` outside).

### 7. No loading skeleton (Medium)

Pages with DB queries (`/waiata/[id]`, `/research/papers/[id]`, `/press`,
etc.) show nothing while loading. Server components suspend; users see
a blank page for ~200-800ms.

**Fix:** add `src/app/(public)/[locale]/loading.tsx` with a skeleton.

### 8. Cookie consent + legal + privacy not translated (Medium)

Covered by #1.

### 9. No dynamic imports (Low)

Pages like `/dev/tools/audit` load entire tables eagerly. For a public
surface this is fine; an optimisation, not a blocker.

### 10. Sitemap coverage (Low)

`publicPaths` only lists 9 paths. Missing 22+ pages.

**Fix:** include all 31 paths.

### 11. Static `<html lang>` (Low)

`<html lang="en">` on auth + dashboard routes. Doesn't affect i18n
pages (which have their own lang via next-intl middleware when
properly wired).

### 12. No `<Image>` (Low)

We don't use any raster images on public pages yet. Future addition
(cover art for waiata) should use `next/image`.

## Prioritized fix list

**Block 1 (Critical) — 4-5 days**
- [ ] Wire `useTranslations` into cookie consent banner
- [ ] Wire translations into privacy notice + cookie policy + terms
- [ ] Wire translations into privacy-controls page
- [ ] Wire translations into top-5 most-trafficked: `/about`, `/contact`, `/waiata`, `/research`, `/for-funders`

**Block 2 (High) — 1 day**
- [ ] Move `not-found.tsx` + `error.tsx` to locale-aware locations
- [ ] Fix sitemap (3-line change)
- [ ] Add metadata to home + waiata detail + branch landing

**Block 3 (Medium) — 2 days**
- [ ] Add `loading.tsx` skeleton
- [ ] Add per-page OG via `opengraph-image.tsx` route segments
- [ ] Fix double-`<h1>` on privacy-controls

**Block 4 (Low) — 1 day**
- [ ] Add remaining 22 paths to sitemap
- [ ] Dynamic imports for heavy tools
- [ ] Add `<Image>` infrastructure (when first image arrives)

## Recommended next move

Block 1 + Block 2 together. That's **5-6 days of focused work** that
turns the platform from "mostly English under /mi/ URLs" to "real
bilingual surface + correct SEO + clean 404s."

Or alternatively: Block 1 only (the translation work), which is what
funder panels + Māori data sovereignty commitments actually require.

Standing by for direction.