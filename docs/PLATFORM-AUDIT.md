# Anamata Kāhui — Platform Audit & Improvement Recommendations

**Audit date:** 2026-07-22 · **Codebase:** `/opt/data/anamata-kahui/`
**Method:** static analysis of 92 files / 5,149 LOC of TS/TSX + schema + migrations + GitHub presence.

---

## 1. What's working

The platform is **structurally complete and live in production**:

- ✅ Next.js 16 App Router · React 19 · TS 5 · Tailwind v4 · Supabase
- ✅ 40 routes generated, build green (`npx next build` exits 0)
- ✅ Database: 3 migrations applied, 24 waiata imported, 5 iwi_gates, 4 governance entries, 5 storage buckets, Anamata Records artist profile
- ✅ Auth flow: 5 server actions wired (login / register / reset / logout / contact)
- ✅ All 5 Tier-1 funding-evidence pages live with real data (`/transparency`, `/impact`, etc.)
- ✅ 12 commits on `main`, pushed to `github.com/LaFinnix/anamata-kahui`
- ✅ Tailwind v4 design tokens — single-file palette swap, zero hex literals in TSX

## 2. Structural gaps (must fix before Vercel deploy)

| # | Issue | Severity | Why it matters |
|---|---|---|---|
| 1 | **Dev server returns 404 on every route** | High | Local DX broken; only production builds work. Cause: `localePrefix: "as-needed"` + `next-intl` middleware + `(public)` route group not wrapped in `[locale]`. |
| 2 | **`/[locale]` route group not wired** | High | Pages exist in English only. `/mi/about` returns 404. The locale switcher in the header links to non-existent routes. |
| 3 | **`/admin` dashboard layout bypasses auth** | Medium | The dashboard layout reads `auth.getUser()` and `redirect()`s — but the proxy/middleware in `proxy.ts` already gates the dashboard routes. They double-check, but if a session expires mid-session the user sees a flash. |
| 4 | **No test coverage** | Medium | `package.json` has zero test deps. Build is green because TS compiles, but no integration tests for server actions or RLS policies. |
| 5 | **No image optimisation** | Low | `next/image` is imported in some places, but `next.config.ts` `images.remotePatterns` is broad (`*.supabase.co`). Should be tightened per bucket. |
| 6 | **HSTS in `vercel.json` blocks apex on first deploy** | Low | `max-age=31536000; includeSubDomains; preload` will be cached by browsers and require testing. Reconsider for preview deployments. |

### Fix #1+#2: the `[locale]` migration

This is the single biggest item. It unlocks:
- Working dev server (no more 404s)
- Working `/mi/...` routes (real te reo Māori content)
- Clean locale-prefixed URLs in production
- `useLocale()` actually returns the active locale
- The language switcher's `/mi/about` links resolve

**Estimated cost:** ~3-4 days of careful refactor across ~30 files. Every page needs `useTranslations()`, every `<Link>` needs to be locale-aware.

I recommend doing this **before** the next round of feature work.

## 3. Content gaps (visible to funders / users)

| # | Page | Issue | Recommended action |
|---|---|---|---|
| 7 | `/legal/{privacy,cookie,terms}` | All three are placeholder text ("drafted by counsel") | Either commission counsel, or write actual content using the existing privacy/cookie/terms templates from `opt/data/anamata/legal/` if they exist |
| 8 | `/research` (public + dashboard) | Landing is a 4-card skeleton. Dashboard says "Scaffold — table not yet created". **No research papers infrastructure.** | This is the **scholarship** opportunity — see §4 below |
| 9 | `/analytics` | All KPIs show `—` placeholders | Build the Spotify Web API + Apple Music Reports ingestion pipeline. Estimated 3-5 days. |
| 10 | `/admin` dashboard | No member-management UI; kaitiaki can't be onboarded through the UI | Build `(dashboard)/admin/members` |
| 11 | `/artist` (public) | Empty (no opt-in yet) | Once members opt in, list populates. The page is built correctly; the bottleneck is opt-in flow. |

## 4. Research papers — answering your question directly

**Q: Do we have an existing page for these?**

**A: No. Not yet.**

What exists today:
- `/research` (public landing) — 4 marketing cards
- `/research` (dashboard) — "Scaffold" placeholder
- No `research_documents` or `research_papers` table in any migration
- No `/research/[id]` or `/research/papers/[id]` route
- No DOI minting, no PDF upload, no citation export

**What a "linked research papers" page needs:**

```
src/app/(public)/research/
├── page.tsx                       # research landing (exists, 4 cards)
├── papers/
│   ├── page.tsx                   # papers index — list of every paper
│   └── [id]/
│       └── page.tsx               # individual paper with full metadata
└── authors/
    └── page.tsx                   # researcher roster (cross-link to /artist)

supabase/migrations/0004_research_papers.sql:
- research_documents (id, branch_id, title, abstract, authors[], 
                      publication_date, doi, pdf_url, language_code, 
                      iwi_consent_id, access_tier, methodology)
- research_documents_authors (junction)
- research_documents_keywords
- research_documents_citations (cross-link to waiata)

Dashboard:
- /(dashboard)/research/documents — staff upload + metadata
- /(dashboard)/research/field-projects — field project tracker
```

This becomes the **canonical evidence base** for funding applications — Te Mātāwai, HRC, Royal Society Te Apārangi all weight "public research outputs + iwi partnership + Vision Mātauranga alignment" heavily. The audit doc (`docs/FUNDING-AUDIT.md`) already lists `/research` surface as Tier 2 build item.

## 5. Architecture improvements

| # | Item | Why | Effort |
|---|---|---|---|
| 12 | **Extract i18n strings to messages catalogue** | Currently all UI text is hardcoded English in TSX. The `en.json` + `mi.json` dictionaries exist but aren't connected to components. | 2-3 days — wrap every component in `useTranslations()` |
| 13 | **Add error boundaries per route group** | Only `app/error.tsx` (top-level) exists. A dashboard error shouldn't 500 the marketing pages. | 4 hours |
| 14 | **Move `proxy.ts` routing logic into `next.config.ts` rewrites** | Middleware-vs-rewrites confusion is causing the dev 404 bug. Switching to `rewrites()` for locale prefixes is cleaner. | 1 day |
| 15 | **Add `Suspense` boundary to `/transparency` and `/impact`** | Currently both are async server components that could block render if Supabase is slow. Wrap in `<Suspense>` with skeleton fallback. | 2 hours |
| 16 | **Add a `notFound()` page per route group** | Only root `not-found.tsx` exists. Dashboard 404s should redirect to login, not the marketing 404. | 1 hour |
| 17 | **Add `loading.tsx` skeletons** | Top-level pages have no loading state. Adding skeleton components improves perceived perf. | 1 day |
| 18 | **Add `metadata` to every page** | Many pages inherit root metadata but lack descriptions / OG / Twitter cards. SEO impact. | Half day |
| 19 | **Add `crossOrigin="anonymous"` to audio preview embeds** | Currently `/waiata/[slug]` mentions streaming links but doesn't embed. When Spotify Apple links land, `crossOrigin` on `<iframe>` ensures CORS-safe. | Half day |

## 6. Database / RLS improvements

| # | Item | Why |
|---|---|---|
| 20 | **Per-release `metadata` JSONB lacks validation** | Currently anything goes in. Add a CHECK constraint or move to typed columns over time. |
| 21 | **`kaitiaki_roopu` still empty** | We deferred seeding until a real kaitiaki signs up. Add an onboarding flow: invited kaitiaki → accept invite → ropū row created. |
| 22 | **No `audit_log` table** | `consent_log` covers consent decisions; general mutations aren't audited. Add generic `audit_log` (actor, action, target, before, after, at). |
| 23 | **Storage policies don't restrict by branch** | `stems`, `research` buckets are branch-scoped at the file level but the RLS doesn't enforce this. Should restrict to user's branch. |
| 24 | **Missing `notifications` table** | The funding radar cron fires to Telegram but we don't have in-app notification persistence. Build `(dashboard)/admin/notifications` later. |

## 7. Security audit

| # | Item | Severity | Status |
|---|---|---|---|
| 25 | HSTS + CSP in `vercel.json` | High | ✅ Done |
| 26 | `next.config.ts` `typescript.ignoreBuildErrors = false` | ✅ Strict |
| 27 | Supabase RLS enabled on every table | ✅ Done in 0001 + 0002 |
| 28 | Service-role key only imported in `src/lib/supabase/clients.ts` (server-only) | ✅ Verified |
| 29 | `.env.local` gitignored | ✅ |
| 30 | **Anamata Records artist profile is opted into public directory by default** | ⚠️ Worth confirming with Fin — opt-in should be explicit, not default-true on system accounts |
| 31 | **No rate limiting on contact form** | Medium | Add Cloudflare Turnstile or simple rate-limit middleware |
| 32 | **No CSRF protection on server actions** | Low | Next 15+ has built-in form-action CSRF via cookies; verify |

## 8. Documentation gaps

| # | Item | Action |
|---|---|---|
| 33 | No `CONTRIBUTING.md` | Write one — explains how kaitiaki can submit pull requests, how translators contribute, code review process |
| 34 | No `CHANGELOG.md` | Adopt conventional commits + auto-gen from PR titles |
| 35 | No design tokens documented | `globals.css` has the tokens but no `DESIGN-SYSTEM.md` like Anamata Records has. Critical for future palette swaps. |
| 36 | No runbook for "Supabase is down" | Write `docs/RUNBOOK.md` — failure modes, recovery steps, contact list |
| 37 | No funding-application playbook | `docs/FUNDING-AUDIT.md` exists but isn't in the kaitiaki rōpū handover doc. |
| 38 | No translation memory | `en.json` + `mi.json` exist but no glossary of approved te reo kupu. Build a `docs/REO-GLOSSARY.md` so translators use consistent terms. |

## 9. Performance / scalability

| # | Item | Action |
|---|---|---|
| 39 | No `Suspense` streaming on dashboard pages | Wrap data-fetching sections in `<Suspense>` so sidebar renders immediately |
| 40 | `revalidate = 60` on `/transparency` and `/` is too aggressive if Supabase is slow | Make revalidation configurable; consider 5-min default |
| 41 | No CDN caching headers on `/waiata/[slug]` | Add `Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` via `headers()` |
| 42 | Image-heavy pages (future) need `next/image` everywhere | Currently inconsistent |

## 10. What I'd build next, ranked

If I were Fin, this is the order:

| Priority | Item | Why |
|---|---|---|
| 🥇 | **`[locale]` route group refactor** | Fixes dev server, unlocks real `/mi/...` routes, makes the locale switcher work |
| 🥇 | **Research papers infrastructure** (§4) | The PM Scholarship Japan deliverable lives here. Plus this is the highest-ROI funding piece — research outputs score for Te Mātāwai, HRC, Marsden |
| 🥈 | **Anamata Records artist profile public page + real `opted_in_public_directory` onboarding** | The PM Scholarship Japan would list research outputs by affiliated researchers — they need to opt in |
| 🥈 | **Spotify/Apple analytics ingestion** | `/impact` reaches its full potential only with real stream data |
| 🥈 | **Per-release `release_date` import** | Currently null in Supabase — needs extraction from the catalog |
| 🥉 | **All other gaps** | in priority order from §5–9 |

## 11. Quick wins (≤1 day each)

- [ ] Add `loading.tsx` to `/admin`, `/records`, `/releases`, `/research`, `/dev`, `/analytics`
- [ ] Add `metadata` export with description + OG tags to every public page
- [ ] Add Cloudflare Turnstile to `/contact`
- [ ] Add `Cache-Control` headers via `next.config.ts` `headers()`
- [ ] Write `CONTRIBUTING.md`
- [ ] Write `DESIGN-SYSTEM.md`
- [ ] Write `RUNBOOK.md`
- [ ] Write `REO-GLOSSARY.md`

---

*Next step after scholarship research returns: build the research-papers infrastructure per §4. That's the work the PM Scholarship Japan deliverable will surface on.*
