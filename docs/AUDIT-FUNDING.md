# Anamata Kāhui — Funding-Application Audit
**Audit date:** 2026-07-22 · **Path:** `/opt/data/anamata-kahui/`
**Scope:** what exists vs. what a 2026 NZ cultural-funder would expect to see on the live site.

---

## 1. Public pages (with URLs)

### 1.1 Inventory — what exists

| URL                              | File                                                                      | What it does                                                                                  |
|----------------------------------|---------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| `/`                              | `src/app/(public)/page.tsx`                                               | Landing — hero ("Four branches. One kāhui."), 4 branch cards, secondary CTA to `/about` + `/contact`. No te reo copy, no NZSL, no impact metrics. |
| `/records`                       | `src/app/(public)/[slug]/page.tsx` (slug=`records`)                       | Records branch landing — tagline + 4 highlight cards. CTA → `/records/dashboard` (the (dashboard)/records page). |
| `/research`                      | `src/app/(public)/[slug]/page.tsx` (slug=`research`)                      | Research branch landing — tagline + 4 cards (Document vault / Field projects / Language tools / Publications). CTA → `/research/dashboard`. |
| `/arts`                          | `src/app/(public)/[slug]/page.tsx` (slug=`arts`)                          | Arts branch landing — 4 cards. CTA → `/arts` (same page — circular). |
| `/dev`                           | `src/app/(public)/[slug]/page.tsx` (slug=`dev`)                           | Dev branch landing — 4 cards. CTA → `/dev/dashboard`. |
| `/about`                         | `src/app/(public)/about/page.tsx`                                         | 3 "pillars" cards (Tino rangatiratanga / Kaitiakitanga / Whanaungatanga) + Join/Contact CTA. No team, governance, kaumātua. |
| `/contact`                       | `src/app/(public)/contact/page.tsx`                                       | Static form posting to `/api/contact` — **API route does not exist**. |
| `/legal/privacy-notice`          | `src/app/(public)/legal/privacy-notice/page.tsx`                          | **Placeholder** ("Final wording will be drafted by counsel"). |
| `/legal/cookie-policy`           | `src/app/(public)/legal/cookie-policy/page.tsx`                           | **Placeholder** ("Placeholder — drafted before launch"). |
| `/legal/terms-of-use`            | `src/app/(public)/legal/terms-of-use/page.tsx`                            | **Placeholder** ("Placeholder — drafted before launch"). |
| `/login`                         | `src/app/(auth)/login/page.tsx`                                           | Static form posting to `/api/auth/login` — **API route does not exist**. |
| `/register`                      | `src/app/(auth)/register/page.tsx`                                        | Static form posting to `/api/auth/register` — **API route does not exist**. |
| `/reset-password`                | `src/app/(auth)/reset-password/page.tsx`                                  | Static form posting to `/api/auth/reset` — **API route does not exist**. |

### 1.2 Missing — public pages a funder will look for

Concrete files to create under `src/app/(public)/`:

- **`governance/page.tsx`** — Te Kāhui board / kaumātua / kaitiaki rōpū, meeting cadence, conflicts of interest.
- **`kaitiakitanga/page.tsx`** (or `/cultural-protocol`) — iwi-gate / kaitiaki consent framework.
- **`impact/page.tsx`** — public-facing impact dashboard pulled from Supabase.
- **`open-source/page.tsx`** — repo index, contribution guide, licences.
- **`accessibility/page.tsx`** — formal accessibility statement (WCAG 2.2 AA target).
- **`mi` or `/te-reo`** — full te reo Māori landing variant.
- **`partners/page.tsx`** — iwi / distributor / broadcaster / university partners.
- **`newsroom` or `/news`** — announcements, release notes, research outputs.
- **`careers` or `/join-the-team`** — open roles / contractor calls.
- **`app/not-found.tsx`**, **`app/error.tsx`**, **`app/global-error.tsx`** — currently using Next.js defaults.

### 1.3 Broken

- `/contact`, `/login`, `/register`, `/reset-password` POST to `/api/contact`, `/api/auth/login`, `/api/auth/register`, `/api/auth/reset`, `/api/auth/logout`. **None of these route handlers exist** (`src/app/api/**` is empty).
- `/arts` branch CTA points back to `/arts` — circular.

---

## 2. Dashboard routes (with URLs)

### 2.1 Inventory — what exists

All under `src/app/(dashboard)/`. Layout enforces `auth.getUser()` and redirects to `/login` if missing. Middleware (`src/lib/supabase/middleware.ts`) also redirects unauthenticated users for `/admin`, `/records/dashboard`, `/releases`, `/analytics`, `/research/dashboard`, `/dev/dashboard`.

| URL                              | File                                          | State                                                                                                  |
|----------------------------------|-----------------------------------------------|--------------------------------------------------------------------------------------------------------|
| `/admin`                         | `src/app/(dashboard)/admin/page.tsx`          | Renders. Two real cards (Releases count, Profiles count). Two `—` placeholders (Research docs, Active sessions). No member-management UI. |
| `/records`                       | `src/app/(dashboard)/records/page.tsx`        | Renders. Lists releases (title, status, release_date). "New release" button is a stub.                |
| `/releases`                      | `src/app/(dashboard)/releases/page.tsx`       | Renders. 3-column kanban (draft/scheduled/released). Cards link to `/releases/{id}` — **page missing**. |
| `/releases/{id}`                 | (missing)                                     | Referenced from two pages. Not built.                                                                  |
| `/analytics`                     | `src/app/(dashboard)/analytics/page.tsx`      | All four KPI cards show `—`. References a `release_metrics` table — **not in migration**.            |
| `/research`                      | `src/app/(dashboard)/research/page.tsx`       | Both cards display `Badge "Scaffold — table not yet created"`. README confirms `research_documents` + `field_projects` are not in the migration. |
| `/dev`                           | `src/app/(dashboard)/dev/page.tsx`            | 4 cards (API keys / Webhooks / Client tools / Automation jobs). All buttons are non-functional stubs. |
| `/arts` (dashboard)              | (missing)                                     | No dashboard route for the Arts branch.                                                                |
| `/{slug}/dashboard`              | (referenced in middleware, missing)           | `/records/dashboard`, `/research/dashboard`, `/dev/dashboard` are checked in the middleware gate but no `app/(dashboard)/{slug}/dashboard/page.tsx` exists — those URLs always 404/redirect. |

### 2.2 Missing — dashboards a funder will expect

- `/releases/{id}` — release detail (cover art, stems, schedule, royalty split).
- `/(dashboard)/arts/page.tsx` + sub-routes for galleries / portfolios / commissions.
- `/(dashboard)/research/documents`, `/(dashboard)/research/field-projects`.
- `/(dashboard)/analytics/artist/[id]` — per-artist breakdown.
- `/(dashboard)/settings` — profile edit, branch membership view, data export, account deletion.
- `/(dashboard)/admin/members`, `/(dashboard)/admin/branches` — kaitiaki can grant/revoke roles.
- `/(dashboard)/audit-log` — every iwi-gate / kaitiaki decision visible.

---

## 3. Supabase tables, RLS policies, storage

### 3.1 Inventory — single migration `supabase/migrations/0001_initial_schema.sql`

**Tables (5):**

- **`public.profiles`** — `id` (FK auth.users), `full_name`, `email`, `role` (enum), `avatar_url`, `bio`, timestamps.
- **`public.branches`** — `id`, `slug` (enum: records/research/arts/dev), `name`, `description`, seeded.
- **`public.user_branches`** — `id`, `user_id`, `branch_id`, `role` (lead/admin/member/guest). Unique on (user_id, branch_id).
- **`public.releases`** — Records branch. `id`, `artist_id`, `branch_id`, `title`, `description`, `release_date`, `upc_isrc`, `cover_art_url`, `status` (enum), `metadata jsonb`, timestamps.
- **`public.stems`** — `id`, `release_id`, `storage_path`, `file_name`, `mime_type`, `size_bytes`, `uploaded_by`, `created_at`.

**Triggers:** `set_updated_at()` (profiles + releases), `handle_new_user()` (auth.users → profile).

**RLS helper functions:**
- `public.is_super_admin()` — SECURITY DEFINER, reads `profiles.role`.
- `public.has_branch_access(p_branch uuid)` — super_admin OR row in `user_branches`.

**RLS policies (all five tables have RLS enabled):**

| Table          | Select policies                                                       | Write policies                                                                                       |
|----------------|----------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| profiles       | `profiles_select_authenticated` — any signed-in user                  | self update OR super_admin; super_admin insert/delete                                                |
| branches       | `branches_select_public` — `using (true)`                            | `branches_write_super` — super_admin for all                                                          |
| user_branches  | `user_branches_select_self_or_super`                                 | `user_branches_write_super` — super_admin for all                                                    |
| releases       | `releases_select_public` (status='released' only) + branch member + super | super + branch lead/admin insert/update                                                              |
| stems          | `stems_select_branch_members`                                        | branch lead/admin only + super                                                                       |

**Storage buckets:** **commented out** in the migration. README checklist says create `covers` (public), `press` (public), `stems` (private), `research` (private). **No buckets in code.**

### 3.2 Missing — schema a funder would expect

- **`iwi_gates`** / **`kaitiaki_consents`** — iwi/hapū authorisation, expiry, scope (public/internal/restricted), revocation timestamp.
- **`consent_log`** — append-only audit trail of every consent decision.
- **`kaitiaki_roopu`** — named kaitiaki, role, term, voting weight.
- **`research_documents`** + **`field_projects`** — referenced in research dashboard UI. Need `language_code`, `iwi_partner`, `consent_id` (FK), `access_tier`, `doi`.
- **`release_metrics`** — referenced in analytics "Wiring plan". Per-platform stream counts, royalty split rows, geography rollup.
- **`revenue_events`** — royalty income, distributor splits, dates.
- **`audit_log`** — generic append-only (actor, action, target, before, after, at).
- **`content_translations`** — bilingual content metadata for te reo variant.
- **`profiles`** missing: `pronouns`, `iwi_affiliation text[]`, `te_reo_proficiency` (none/basic/intermediate/advanced/first-language), `preferred_language` (en/mi), `region`, `opted_in_public_directory boolean`, `data_export_requested_at`, `data_deletion_requested_at`. **iwi_affiliation and te_reo_proficiency** are the ones a funder will look for.
- **`releases`** missing: `language_code`, `iwi_consent_id` (FK), `access_tier`, `explicit_content boolean`, `territory_rights jsonb`, `distributors jsonb`, separate `upc` + `isrc` (currently combined `upc_isrc`), `parental_advisory text`.
- **`stems`** missing: `instrument text`, `version int`, `license text`, `cultural_sensitivity text` (taonga/open/restricted-iwi-only).
- **`branches`** missing: `kaitiaki_lead_id` (FK profiles), `public_email`, `public_phone`, `charter_url`.

### 3.3 Storage

- Bucket creation **commented out** in migration.
- No storage policies in migration.
- `next.config.ts` allows `*.supabase.co` and `*.supabase.in` for images, but until buckets exist nothing loads.

---

## 4. Metadata / SEO infrastructure

### 4.1 Inventory — what exists

- `src/app/layout.tsx` — root metadata: `title.default "Anamata Kāhui"`, `title.template "%s · Anamata Kāhui"`, one-line `description`, `metadataBase` from `NEXT_PUBLIC_SITE_URL`.
- Each public page sets local `metadata = { title: "..." }`. No `description`, `openGraph`, `twitter`, `alternates`, `robots` anywhere.
- `vercel.json` security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy. **Missing:** HSTS, CSP, X-XSS-Protection.

### 4.2 Missing — SEO surface

- `app/sitemap.ts` — zero sitemap. Releases + research docs become a real artefact funders link to.
- `app/robots.ts` — not built.
- `app/manifest.ts` (PWA manifest) — cheap, signals professionalism.
- `app/opengraph-image.tsx` + `app/twitter-image.tsx` — dynamic OG via `ImageResponse`.
- `<html lang>` is hard-coded to `en` (`src/app/layout.tsx` line 22). Needs to be dynamic for te reo variant.
- No `alternates: { canonical, languages: { en, mi } }` on any page.
- No JSON-LD structured data (`Organization`, `MusicGroup`, `ResearchProject`).
- No RSS / Atom feeds.

---

## 5. Accessibility infrastructure

### 5.1 Inventory — what exists

- `lang="en"` on `<html>`.
- `<main>` used in public + dashboard layouts.
- `aria-hidden` on decorative spans (header dot, footer dot).
- `aria-label="Switch branch"` on the branch-switcher trigger.
- Radix primitives (DropdownMenu, Avatar) accessible by default.
- Form inputs use `<Label htmlFor>` correctly.
- `vercel.json` Permissions-Policy disables camera/microphone/geolocation.
- Color contrast — Tailwind v4 tokens use `#f4ede0` foreground on `#0b0a08` background (≥15:1, well above WCAG AAA).
- Focus-visible ring uses `--color-ring` (bronze).

### 5.2 Missing — accessibility surface a funder will check

- **NZSL video hero on `/`** — no `<video>` element anywhere in the codebase.
- **Easy Read variant** — no `/(public)/[slug]/easy-read/page.tsx` or similar.
- **Accessibility statement** — `/(public)/accessibility/page.tsx`. WCAG 2.2 AA target, known issues, contact email, last reviewed date.
- **Skip-to-content link** — none in public or dashboard layouts.
- **`prefers-reduced-motion`** — no media query handling anywhere in `globals.css`.
- **`focus-visible` global styles** — none. Tailwind v4 + Radix provide utilities but no global `:focus-visible` reset.
- **`<noscript>` fallback** — none.
- **High-contrast / `forced-colors`** — no adjustments.
- **Reduced-data** — no `<picture>` with low-bandwidth variants (critical for rural/whānau Māori audiences).
- **Captions / transcripts** — no media exists yet, so no captions infra.

---

## 6. Te reo Māori content

### 6.1 Inventory — what is currently in the scaffold

Total te reo Māori phrases across the codebase (~30 instances across ~10 files). All are kupu hoahoa (decorative) alongside English — never the primary text.

- `package.json:description` — "Anamata Kāhui".
- `app/layout.tsx:title` — "Anamata Kāhui".
- `app/(public)/page.tsx` — "Aotearoa · Māori-led ecosystem", "Four branches. **One kāhui.**", "Join the Kāhui".
- `app/(public)/about/page.tsx` — "Tino rangatiratanga", "Kaitiakitanga", "Whanaungatanga", "Get involved", "There's a place in the Kāhui".
- `app/(auth)/layout.tsx` — "Anamata Kāhui".
- `app/(dashboard)/layout.tsx` — "Anamata Kāhui", "Kāhui member", "Full access", "Sign out".
- `app/(dashboard)/admin/page.tsx` — "Kāhui overview", "Super admin".
- `components/kahui/site-header.tsx` — "Anamata Kāhui", "About", "Contact", "Sign in", "Join", "Branches".
- `components/kahui/branch-switcher.tsx` — "Branches", "Switch branch", "The Kāhui".
- `components/kahui/site-footer.tsx` — "Branches", "Platform", "Legal", branch names, "Anamata Kāhui".

Whakairo kupu present: "kāhui", "Aotearoa", "Anamata", "Anamata Kāhui". Absent: kaumātua, whānau, mahi, iwi (only used in `about/page.tsx` body copy), mana, tapu, noa, whakapapa.

### 6.2 Missing — te reo Māori surface

This is the **biggest gap** relative to Te Mātāwai / Te Māngai Pāho criteria.

- **No `/mi` route group.** Create `src/app/(public-mi)/page.tsx` and equivalents — full te reo Māori translations of every public page.
- **No i18n library.** `package.json` has no `next-intl`, `next-i18next`, `react-i18next`, `@formatjs/intl`, or any translation framework.
- **No macrons in some brand text.** Add a te reo spellcheck step.
- **No te reo language declaration.** `<html lang="en">` hard-coded.
- **No kupu/kōrero footer** — no karakia, no whakataukī on the landing page.
- **No bilingual CTA pairings.** Buttons are English only.
- **No hui/process copy** in te reo.
- **No translation workflow / contributor model** showing how te reo translations are reviewed.

---

## 7. Cultural-governance UI (iwi-gate, kaitiaki, consent metadata)

### 7.1 Inventory — what exists

- RLS function `public.has_branch_access(p_branch uuid)` — branch-scoped access (operational, not cultural).
- README footnote: "Source of truth for cultural / iwi-gate policy: `legal/templates/cultural-kaitiaki-protocol.md` in the parent Anamata project."
- `about/page.tsx` mentions kaitiakitanga conceptually.
- `/research` landing card mentions "iwi-gate and consent metadata" in body copy only.
- `(dashboard)/research/page.tsx` mentions "consent metadata, location, iwi partner" in placeholder copy.

That is **zero actual governance UI** and **zero consent tables**.

### 7.2 Missing — cultural-governance surface

This is the **second-largest gap** (after §6).

- `/(public)/governance/page.tsx` — kaitiaki rōpū members, terms, decision rights, conflict-of-interest policy, meeting schedule, public minutes.
- `/(public)/kaitiakitanga` or `/cultural-protocol` — how iwi consent works, how to request withdrawal.
- `/(public)/data-sovereignty` — statement of compliance with Te Kāhui Māori data sovereignty principles.
- `/(dashboard)/admin/iwi-gate` — UI for kaitiaki to approve / restrict / revoke content.
- `/(dashboard)/audit-log` — visible to super_admin + kaitiaki; every consent decision with actor + timestamp.
- `iwi_gates` and `consent_log` tables (see §3.2).
- Schema-level **`kaitiaki` role** — current role enum is `super_admin · branch_admin · artist · researcher · client`. **No `kaitiaki` role.** This is the most important missing enum value.
- **Per-content consent banner** — when a release or research doc is restricted, public view should display iwi attribution + access tier.
- **Withdrawal request form** — public-facing, findable from the footer.

---

## 8. Analytics / measurement infrastructure

### 8.1 Inventory — what exists

- `supabase/config.toml` `[analytics]` block: `enabled = false`. **Supabase Analytics is off.**
- `(dashboard)/analytics/page.tsx` — four KPI cards with `—` placeholders + a "Wiring plan" describing future Spotify/Apple ingest.
- `(dashboard)/admin/page.tsx` — two real Supabase count queries. Two `—` placeholders.
- No Vercel Analytics or Speed Insights script in `app/layout.tsx`.
- No third-party analytics (Plausible, Fathom, PostHog, GA4) wired up. `package.json` lists none.
- No event tracking SDK installed.

### 8.2 Missing — measurement surface

- No platform-level analytics script (Plausible is the de facto NZ choice — privacy-friendly, no cookie banner needed).
- No `events` table or event-tracking helper for in-app actions.
- No public `/impact` page that pulls from real metrics.
- No export endpoint (CSV/JSON) of platform metrics for quarterly reports to funders.
- No uptime / status page.
- No te reo Māori analytics breakdown (% of releases that are primarily te reo, % bilingual).

---

## 9. Cross-cutting missing items — what would meaningfully strengthen an application

Listed in priority order. Each entry names the specific file/route/column to add.

### HIGH PRIORITY (a Creative NZ / Te Mātāwai assessor would notice the absence within 30 seconds)

1. **Broken forms.** `src/app/api/auth/login/route.ts`, `register`, `reset`, `logout`, `contact` — all missing. Wire up `@supabase/ssr` server actions.
2. **Te reo Māori landing route** `/(public-mi)/page.tsx` and friends — full te reo Māori translations.
3. **`lang` attribute** dynamic in `app/layout.tsx`.
4. **NZSL video on `/`** — `<video>` element with NZSL interpretation of the hero.
5. **Accessibility statement** `/(public)/accessibility/page.tsx`.
6. **Governance page** `/(public)/governance/page.tsx`.
7. **Impact dashboard** `/(public)/impact/page.tsx` — public-facing numbers from Supabase views.
8. **Kaitiaki role** added to `profiles.role` enum + RLS helper.
9. **`iwi_gates` and `consent_log` tables** in new migration `0002_cultural_governance.sql`.
10. **Sitemap** `app/sitemap.ts` + **robots** `app/robots.ts`.

### MEDIUM PRIORITY

11. `/(public)/data-sovereignty` statement.
12. `/(public)/partners` — partner directory with logos.
13. `/(public)/open-source` — repo list + contribution guide.
14. `/releases/{id}` detail page.
15. `/arts` dashboard route.
16. `research_documents` and `field_projects` tables + UI.
17. `release_metrics` table + per-artist analytics.
18. Per-route `openGraph` + `twitter` images via `app/opengraph-image.tsx`.
19. JSON-LD structured data (`Organization` minimum).
20. Plausible or similar privacy-friendly analytics.
21. WCAG accessibility statement with named owner + review date.
22. `<noscript>`, skip-to-content, `prefers-reduced-motion`, `forced-colors` handling.
23. HSTS + CSP in `vercel.json` headers.
24. Storage bucket creation + storage policies.
25. `iwi_affiliation`, `te_reo_proficiency`, `preferred_language` columns on `profiles`.

### LOWER PRIORITY (each noted positively)

26. `/(public)/news` or `/(public)/newsroom`.
27. `/(public)/careers`.
28. PWA manifest.
29. RSS/Atom feeds.
30. `app/error.tsx`, `app/not-found.tsx`, `app/global-error.tsx`.
31. Per-release `language_code`, `iwi_consent_id`, `access_tier`, `parental_advisory`.
32. Per-stem `instrument`, `version`, `license`, `cultural_sensitivity`.
33. `/(dashboard)/audit-log`.
34. `/(dashboard)/settings` (profile edit, data export, deletion).
35. `/(dashboard)/admin/members` UI.
36. Public `/api/health` + status page.
37. `scripts/seed.ts` (README says "seed manually").
38. Vitest / Playwright tests — `package.json` has zero test dependencies.

---

## 10. Summary (one-glance)

**Structurally complete marketing shell** with:
- working auth + dashboard route groups,
- 5 Supabase tables with thorough RLS,
- 4 branch landings + home + about + contact + 3 legal placeholders,
- branch switcher, sticky header, dark-mode bronze theme.

**Not yet:**
- a usable product (login/register/contact are dead — API routes don't exist),
- a te reo Māori platform (only ~30 decorative kupu; no /mi route, no i18n),
- an accessible platform (no accessibility statement, no NZSL, no Easy Read),
- a culturally governed platform (no kaitiaki role, no consent tables, no governance page),
- a measurable platform (no analytics script, all KPI cards show `—`),
- a discoverable platform (no sitemap, no OG images, no structured data),
- a tested platform (zero test dependencies).

**Fastest path to a funding-grade live site, in order:**
1. wire missing API routes so site works end-to-end,
2. add `/mi` bilingual variant + `lang` switching,
3. add `/governance`, `/accessibility`, `/impact`, `/kaitiakitanga` public pages,
4. add `kaitiaki` role + `iwi_gates` + `consent_log` tables + admin UI,
5. add NZSL video on `/`,
6. add sitemap + OG + Plausible,
7. add per-release and per-profile cultural metadata columns.

After those seven blocks, the live site becomes credible evidence in itself for Creative NZ, NZ On Air, Te Māngai Pāho, Te Mātāwai, and NZ Music Commission applications.
