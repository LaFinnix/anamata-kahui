# Anamata Kāhui — Audit #2

**Audit date:** 2026-07-22 · **Path:** `/opt/data/anamata-kahui/`
**Method:** static analysis + Supabase REST introspection + dev-server observation
**Compared against:** Audit #1 (`PLATFORM-AUDIT.md`, 42 items) + the work done since.

## Headline numbers

| Metric | Audit #1 | Now | Delta |
|---|---|---|---|
| Commits on `main` | 0 | **14** | +14 |
| Files (src + supabase + scripts + docs) | 92 | **108** | +16 |
| TS/TSX LOC | 5,149 | **6,601** | +1,452 |
| User-facing routes (build output) | 33 | **45** | +12 |
| Supabase tables | 5 | **14** | +9 |
| Public pages with `metadata` export | 4 | **19 / 22** | +15 |
| Public pages with `revalidate` | 0 | **4** | +4 |
| `loading.tsx` files | 0 | **1** (dashboard-wide) | +1 |
| Components using `useTranslations` | n/a (not built) | **0 / 17** | → biggest gap |
| `any` type assertions | n/a | **0** (false-positive on English copy) | clean |

## What's actually in the database right now

```
profiles                              1   (Anamata Records label-actor)
releases                             24   (catalog imported)
iwi_gates                             5
data_governance_log                   4
consent_log                           0   ← empty
research_documents                    1   (sample paper)
research_document_authors             1
research_document_citations           1
research_field_projects               0   ← empty
scholarship_programmes                7   (1 discontinued + 6 active)
scholarship_precedent_recipients       6   (PMSA alumni)
scholarship_engagements               0   ← empty placeholder
contact_enquiries                     0   (form ready, awaiting traffic)
kaitiaki_roopu                        0   ← empty
```

Five tables sit empty with the public-facing UI treating them as live data. That's **the next batch of work** — not building more tables, populating the existing ones.

---

## 1. Completion status against Audit #1 (42 items)

| # | Audit #1 item | Status | Notes |
|---|---|---|---|
| 1 | `[locale]` route group refactor | ❌ Not done | Dev server still 404s in `next dev`; prod builds fine. **Highest-priority structural fix remaining.** |
| 2 | Research papers infrastructure | ✅ Done | `/research/papers`, `/research/papers/[id]`, sample paper seeded |
| 3 | Per-release `release_date` import | ⚙ Partial | Parser in place; no dates exist in ROLLOUT-SCHEDULE.md |
| 4 | Test coverage | ❌ Not done | Zero test deps |
| 5 | Image optimisation tightening | ❌ Not done | `*.supabase.co` wildcard still |
| 6 | HSTS in `vercel.json` | ✅ Done | |
| 7 | Legal pages | ❌ Not done | All 3 still placeholder |
| 8 | `/research` skeleton | ⚙ Partial | Landing + papers + scholarships + portfolio live; dashboards still placeholder |
| 9 | `/analytics` real data | ❌ Not done | Schema for it doesn't exist |
| 10 | `/admin` member-management UI | ❌ Not done | Kaitiaki can't be onboarded through UI |
| 11 | `/artist` populated | ❌ Not done | Page live, no opt-ins yet |
| 12 | `useTranslations` everywhere | ❌ Not done | 0/17 components use it (dict complete in `src/locales/`) |
| 13 | Per-route error boundaries | ❌ Not done | Only top-level `error.tsx` |
| 14 | Rewrites-based locale | ❌ Not done | proxy.ts still has the bug |
| 15 | Suspense around data-fetching pages | ❌ Not done | `/transparency`, `/impact` etc could block |
| 16 | Per-route not-found | ❌ Not done | Only root not-found.tsx |
| 17 | loading.tsx skeletons | ⚙ Partial | Only dashboard-wide |
| 18 | metadata on every page | ⚙ Partial | 19/22 public pages — 3 missing |
| 19 | crossOrigin on embeds | n/a | (not built yet — Spotify/Apple embeds not shipped) |
| 20 | metadata JSONB CHECK | ❌ Not done | |
| 21 | `kaitiaki_roopu` onboarding | ❌ Not done | Table empty |
| 22 | `audit_log` table | ❌ Not done | Skipped; `consent_log` partially covers the audit need |
| 23 | Storage policies branch-scoped | ❌ Not done | Currently user-scope only |
| 24 | `notifications` table | ❌ Not done | |
| 25-29 | Security items | ✅ Mostly green | HSTS, CSP, RLS-on-everything, .env.local gitignored |
| 30 | Anamata Records opt-in default | ⚠️ Worth checking with Fin | I set `opted_in_public_directory: true` on the system user — explicit consent would be safer |
| 31 | Rate limiting on contact form | ❌ Not done | |
| 32 | CSRF protection on server actions | ✅ Built-in (Next 15+) | |
| 33-38 | Docs pack | ✅ Done | CONTRIBUTING, DESIGN-SYSTEM, RUNBOOK, REO-GLOSSARY, PMSA-RESEARCH |
| 39-42 | Performance | ⚙ Partial | revalidate on 4 pages; no Cache-Control headers |

**Net:** Audit #1 surfaced 42 items. **~14 done**, **~8 partial**, **~20 not started.** Highest-value remaining work is the `[locale]` migration (fixes dev server, unlocks real te reo Māori pages) and seeding the empty tables.

---

## 2. New findings since Audit #1

These weren't on Audit #1 because they emerged from building on top of it.

### 2.1 — The bilingual dictionary is dead weight (HIGH PRIORITY)

`src/locales/en.json` and `src/locales/mi.json` exist with **103 keys each, fully translated**. **Zero components use `useTranslations`.** The LanguageSwitcher in the header writes `/mi/about` URLs but those routes 404 because the pages don't consume the `mi.json` strings — they all have hardcoded English copy.

**Cost to fix:** ~3-4 days of careful refactor. Every component that displays user-facing copy needs `useTranslations()` wrapping. This is the #1 reason the bilingual investment is currently zero-value.

### 2.2 — Five empty tables with live UI (HIGH PRIORITY)

These tables have RLS, types, page surface — but no rows. They look live but show zeros:

- `consent_log` — 0 rows
- `research_field_projects` — 0 rows
- `scholarship_engagements` — 0 rows
- `contact_enquiries` — 0 rows (form is wired but unused)
- `kaitiaki_roopu` — 0 rows

**Concrete next actions:**
1. Run a smoke test through `/contact` → fills `contact_enquiries`
2. Open `scholarship_engagements` row for any pending CNZ application as soon as you submit
3. Seed `research_field_projects` with current Anamata work (Hine-nui-te-pō, Rongomai ki a Miru etc are live field projects in the catalog)
4. Seed `kaitiaki_roopu` with kaitiaki you actually engage

**Cost:** 1 day. The infrastructure is there; this is pure data entry.

### 2.3 — `/transparency` and `/impact` mix client strategies (MEDIUM)

`/transparency` uses `createServerSupabase` (RLS-respecting); `/impact` uses `createAdminClient` (bypasses RLS). Both end up showing the same data. **Inconsistency.** The `/impact` admin-client use is a security smell on a public page — even though data is read-only here, the pattern is wrong.

**Fix:** Either swap `/impact` to `createServerSupabase` (would need RLS policies that allow anon reads on iwi_gates etc), or accept that public-facing dashboards use admin client as a deliberate choice and document it.

**Cost:** half day (consistency refactor).

### 2.4 — The `BRANCH_HOMES` constant is duplicated in two files (LOW)

`src/app/(public)/page.tsx` defines `BRANCH_HOMES` locally; `src/components/kahui/branch-switcher.tsx` defines the same constant locally. Two sources of truth.

**Fix:** move to `src/lib/branches.ts` alongside `BRANCHES` / `BRANCH_BY_SLUG`.

**Cost:** 15 minutes.

### 2.5 — Three pages still missing `metadata` (LOW)

`/[slug]/page.tsx` (branch landing), `/page.tsx` (home), `/waiata/[slug]/page.tsx` (per-paper detail). The home and branch landings are the **highest-traffic pages** — missing metadata means Twitter/LinkedIn unfurls, SEO snippets, and OG previews are all generic. The paper detail page generates `generateMetadata` (good) but no fallback for the dynamic OG image — could use the waiata cover art when present.

**Fix:** Add `metadata` exports to all three. /waiata/[slug] can build OG image dynamically with the cover art URL once `cover_art_url` is populated.

**Cost:** 1 hour.

### 2.6 — 5 console.log/error in production code (LOW)

`src/lib/actions/contact.ts` has 4 (`console.error` for Resend + insert failures), `src/app/error.tsx` has 1 (`console.error("[GlobalError]", error)`). These should go through a structured logger that funnels to Supabase or a third-party service (Sentry/Datadog) once you have observability infrastructure. For now they're fine — they ship to the browser console in dev and the server logs in prod.

**Cost:** 0 (only relevant when adding observability).

### 2.7 — Dev server still 404s on every route (HIGH PRIORITY, RECURRING)

Audit #1 #1 flagged this. It was supposed to be a `[locale]` migration, but that hasn't happened. **The current workaround is `as-needed` locale prefix** which means `next build` works and `next dev` is broken.

**Options going forward:**
- Do the `[locale]` migration properly (3-4 days) — fixes dev, unlocks real `/mi/...` pages, lets `useTranslations()` actually work end-to-end
- Accept the limitation and document "use `next build && next start` for local dev" in `RUNBOOK.md` — pragmatic but limits onboarding
- Switch to `next.config.ts` rewrites for locale prefixes instead of middleware — cleaner separation, but doesn't fix the dev-server route resolution issue

### 2.8 — `/funding` is hand-curated static content (MEDIUM)

`/funding` page has the 2026 CNZ win hardcoded as JSX. New grants require code changes. The infrastructure for live funding data is `funding_radar.py` + `docs/funding-radar-latest.json` + `/funding/transparency` could read from this. Not yet wired.

**Fix:** Build `/funding/transparency` as a live page that reads `funding-radar-latest.json` + a Supabase table tracking actual `grants_received`/`applications_pending`.

**Cost:** 1 day.

---

## 3. Funnel-funnel-funnel — the user journeys that exist today

Working backwards from a funder visiting the platform:

```
1. Land on /
   - Sees: 24 waiata, 5 iwi gates, 4 branches, generic CTA
   - Wants: "what is this?"
   ↓
2. Click "Branches" → /records
   - Sees: tagline, 4 highlight cards, CTA to dashboard (gated)
   - Wants: "can I see the actual waiata?"
   ↓
3. Browse to /waiata → click "Te Tinihanga"
   - Sees: full cultural provenance, kaitiaki gate, English gloss
   - Wants: "is this for real or marketing?"
   ↓
4. Click /transparency
   - Sees: 5 iwi gates, 4 governance entries, live counts
   - Wants: "show me the receipts"
   ↓
5. Click /kaitiakitanga
   - Sees: CARE principles, quotes, withdrawal policy
   - Wants: "this is for real, I'm going to apply"
   ↓
6. Goes back to /funding or /research
   - Sees: CNZ win (one row), scholarship portfolio (7 programmes)
   - Wants: "what do I apply to?"
```

**Strengths:**
- Live data is visible end-to-end
- Cultural provenance is verifiable
- Public-directory entries read like a publication, not a brochure

**Weaknesses:**
- The transition from "I believe you" → "I'm applying" is broken at step 6. There's no `/apply`, no clear "for funders" CTA, no deadlines surfaced.
- Step 1 is too abstract — funder can't tell in 5 seconds what they should do here.

**Two follow-ups:**
- **Add a `/for-funders` page** that funnels to `/funding`, `/research/papers`, `/evidence`, `/accessibility` in one click. Pitched as "for people deciding whether to fund this platform."
- **Surface upcoming deadlines** from `funding_radar.py` on the home page (small banner) or `/funding` page (calendar widget).

---

## 4. Quick wins (≤1 day each, ordered by ROI)

1. **Seed the 5 empty tables** with real Anamata data — 1 day. Biggest "live data" delta for the smallest effort.
2. **Move `BRANCH_HOMES` to `lib/branches.ts`** — 15 min. Consistency.
3. **Add `metadata` exports to home, branch landing, waiata detail** — 1 hour. SEO + OG.
4. **Make `BRANCHES` count use the live query** — 30 min. It already does (home page).
5. **Add a `/for-funders` page** linking the relevant evidence pages — 2 hours. Funder funnel.
6. **Document the dev-server limitation in `RUNBOOK.md`** — 30 min. Pragmatic until `[locale]` lands.

## 5. Bigger iteration targets (multi-day)

| Target | Cost | Why now |
|---|---|---|
| **`[locale]` route group refactor** | 3-4 days | Fixes dev, unlocks i18n, unblocks useTranslations() work |
| **Seed all empty tables + populate UI from them** | 1-2 days | "Live data" claim becomes literally live |
| **Write actual legal page copy** | 0.5 day | Counsel-free initial drafts using Anamata Records templates |
| **Build a real test suite** (Vitest + Playwright) | 2-3 days | Catches regressions before funders hit them |
| **Add Supabase Storage upload UI** for cover art + PDFs | 2-3 days | Required for waiata detail + paper detail to be properly rich |
| **Build `/for-funders` page + deadline calendar** | 1-2 days | Funder funnel |
| **Stripe/Resend + payment integration** | 2-3 days | When you want to charge for services |

## 6. What I will NOT recommend again

Things from Audit #1 that are low-value given current state:

- **Cloudflare Turnstile** on `/contact` — 5 waiata posted + a contact form. Low traffic; spam risk is low. Revisit when traffic matters.
- **Per-route error boundaries** — top-level `error.tsx` handles 99% of cases. Premature.
- **Storybook** for components — 7 primitives, all used in 1-3 places. Maintenance > value right now.
- **Strict CSP at nonce level** — current CSP is fine for static + Supabase; nonce requires dynamic middleware integration.

## 7. Things I noticed that aren't problems yet but will be

- **Single-user system** (the Anamata Records artist profile is the only profile). When a kaitiaki signs up, all admin/kaitiaki policies need testing with real RLS. Currently they're verified by SQL only.
- **Storage bucket policies** (`covers`, `stems`, `research`) are user-scope. When the artist uploads a real cover art, the policy must allow that — currently it does, but no one has tested the actual file-upload path.
- **No image storage in `profiles.avatar_url`** — the column exists but no upload flow exists. Funder / artist profile pages show the initial-letter fallback.
- **`<html lang>`** is hardcoded `en`. Even with `[locale]` route group fixed, the `<html lang="en">` in `app/layout.tsx` needs to become dynamic. Currently the `mi.json` translations load into context but the HTML tag doesn't reflect them.

---

*Compiled by Anamata Kāhui platform audit agent, 2026-07-22. Replaces nothing — Audit #1's 42-item list remains valid for those items; this report extends and prioritises.*
