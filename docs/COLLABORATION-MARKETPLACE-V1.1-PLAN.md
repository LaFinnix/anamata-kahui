# Anamata Kāhui — v1.1 Collaboration Marketplace Plan

**Date:** 2026-07-23 · **Status:** Planning
**Builds on:** v1 (shipped across phases 0–4, migrations 0025–0029)

---

## TL;DR

v1 is shipped. v1.1 closes the gaps between "demo-able" and "usable in production." The work is:

1. **Notifications UI** (no surface today — server actions write to the table, but no one reads it)
2. **Manual endorsement UI** (the action exists but no form on the public profile)
3. **Dashboard page chrome i18n** (six pages have inline-English headings; forms are localised)
4. **Bug fixes** picked up during v1 audit (`/tono/new` empty-in.() crash, etc.)
5. **Notification bell + email fanout** (Resend integration)
6. **Vitest test framework** (the audit deferred this; v1.1 picks it up)
7. **Tono `expires_at` auto-archive cron** (deferred from v1)

Items **not** in v1.1 (still deferred to v2): koha ledger, reciprocity tracking, anonymous kaitiaki review, server-side `iwi_specific` rate-limiting. See `MARKETPLACE-PLAN.md` §12 and §13 for the full deferred list.

---

## v1.1 Scope (ordered by risk/value)

| # | Item | Effort | Risk | Why |
|---|---|---|---|---|
| 1 | Bug fixes from v1 audit | 0.5 day | Low | `/tono/new` empty-in.() crash. Other small things. |
| 2 | Notifications UI (dashboard bell + inbox) | 2–3 days | Low | Table exists; no surface. Users will otherwise miss events. |
| 3 | Dashboard page chrome i18n | 1 day | Low | Six pages with inline-English headers. Forms already localised. |
| 4 | Manual endorsement UI on public profile | 1 day | Medium | Comment in `/endorsements` claims it exists; it doesn't. |
| 5 | Vitest test framework + initial coverage | 2 days | Low | Defer from v1 audit. Catches regressions before they ship. |
| 6 | Email fanout (Resend integration) | 2 days | Medium | Phase 4 deferred. Now actually needed. Requires `RESEND_API_KEY` in env. |
| 7 | Tono `expires_at` auto-archive cron | 0.5 day | Low | Currently expired tono still show in open listings. |

**Total v1.1: ~10 days, one developer.**

---

## 1. Bug fixes from v1 audit

These came up during v1 build. Quick cleanup before adding new features.

### 1.1 `/tono/new` empty `id.in.()` crash

**Status:** Fixed in this planning session (committed).

The release-anchor picker used `or(\`artist_id.eq.${user.id},id.in.(${emptyString})\`)` which produces invalid PostgREST `id.in.()` when the user has no split-participant rows. Now branches: artist-only query if no shared releases; combined query otherwise. Also fixed the helper's return type from `string` to `string[]`.

**Why it matters:** Any new user (no split history) hitting `/tono/new` would have hit this. Caught during audit, not in production — no data was lost.

### 1.2 Audit for other empty-`in.()` patterns

Other places that build PostgREST `in.()` filters from potentially-empty arrays:
- `src/lib/queries/tono.ts` `listOpenTonosICanHelp` — uses PostgREST `.in("tono_id", tonoIds)` — `tonoIds` is the filtered list, never empty when there are results.
- `src/components/endorsements/endorsements-tabs.tsx` — no `in.()` filters.
- `src/lib/actions/endorsements.ts` — no `in.()` filters.
- `src/lib/actions/tono.ts` — no `in.()` filters in actions.

**Verified clean.**

### 1.3 Supabase types — `database.types.ts`

The project uses `src/lib/types.ts` for app-level types and lets Supabase infer table row types via `.from(...).select(...)`. If `npx supabase gen types typescript` is wired, the auto-generated types would catch schema drift. Currently not wired; **add as v1.1 task** alongside Vitest setup.

### 1.4 Tone inbox filtering by knowledge area

The v1 inbox filters by visibility (`open` / `iwi_specific`) but not by knowledge area. A user with `kaikorero_bio` saying "I carry Taranaki pūrākau" will see ALL open tono regardless of whether they're a pūrākau match. The filter UI exists on the public directory but not the inbox.

**Fix in v1.1:** Add knowledge-area filter to `/tono/inbox` (URL-driven, server-side). Mirrors the existing directory filter pattern.

---

## 2. Notifications UI (the biggest v1 gap)

### 2.1 What exists today

- `notifications` table exists (migration 0028)
- Server actions write notifications for 6 kinds: `endorsement_received`, `endorsement_revoked`, `tono_proposal_received`, `tono_proposal_accepted`, `tono_proposal_declined`, `tono_fulfilled`
- **No surface reads them.**

### 2.2 What to build

**Header bell icon (dashboard-wide)**
- Add to `src/app/(dashboard)/layout.tsx` header (where LogoutButton sits).
- Polls `/api/notifications/unread-count` on mount and after mutations.
- Shows badge with count; "0" hides the badge.
- Click → dropdown with last 10 notifications + "See all" link.

**Notification inbox page**
- `/dashboard/notifications` — full list, paginated (server-side, cursor-based).
- Mark-as-read action (per-row + "mark all read").
- Filter by kind (Endorsement / Tono / all).
- Empty state when zero notifications.

**Cross-page "mark as read" on navigation**
- When user visits a notification's related entity (e.g. opens a tono), auto-mark related notifications read.
- Implementation: pass `notification_id` query param; the relevant page's server component calls `markReadAction`.

**i18n**
- Add `notifications` namespace to `en.json` + `mi.json` with all the strings.
- Notification kinds map to human-readable labels (te reo + English).

### 2.3 Schema additions (none expected)

The existing `notifications` table covers all needs:
```sql
public.notifications (
  id, recipient_id, kind (text), payload (jsonb), read_at, created_at
)
```

A partial index already supports unread queries:
```sql
idx_notifications_recipient_unread ON notifications (recipient_id, created_at DESC) WHERE read_at IS NULL
```

### 2.4 Effort

2–3 days. Mostly UI; no schema changes; i18n is mechanical.

---

## 3. Dashboard page chrome i18n

### 3.1 What needs i18n

Six dashboard pages currently render static English:

| Page | Static strings |
|---|---|
| `/kaikorero/profile` | "Kaikōrero profile", "Your cultural-knowledge surface", "Not currently public…" |
| `/endorsements` | "Endorsements", "Contribution lineage", empty-state headers |
| `/tono` | "Tono board", "Your help requests", count labels |
| `/tono/new` | "New tono", "Ask the kāhui for help" |
| `/tono/inbox` | "Tono inbox", "Help requests you can answer" |
| `/tono/[id]` | "Back to your tono board" / "Back to inbox" |

### 3.2 Approach

Server components can use `getTranslations` from `next-intl/server` (already used in `src/app/(public)/[locale]/privacy-controls/page.tsx`). Each page makes a single `const t = await getTranslations("namespace")` call at the top, then `t("lede")`, `t("title")`, etc. for each literal.

### 3.3 Locale parity

Verify after the changes that `en` and `mi` have matching keys (same approach as Phase 4 verification — diff the key sets, fail on mismatches).

### 3.4 Effort

1 day for all six pages.

---

## 4. Manual endorsement UI

### 4.1 Why it matters

The `/endorsements` page comment in v1 says: *"You can also give endorsements manually from a collaborator's public profile."* This is aspirational — no such UI exists. The server action `giveEndorsementAction` is implemented and tested at the DB level, but no form invokes it.

In v1, endorsements come from:
1. Cultural-review approval auto-endorses split participants
2. Tono fulfillment auto-endorses the proposer

Manual endorsement matters for cases like:
- "I just want to say this person mentored me" (no release, no tono)
- "I collaborated with this person on a private project" (no public work)

### 4.2 What to build

**Public profile enhancement** (`/[locale]/artist/[id]`)
- For authed users viewing another profile, show a "Endorse" button when:
  - viewer is authed
  - viewer is NOT the profile owner (can't self-endorse — DB constraint enforces)
  - viewer hasn't already endorsed this person for this work/scope
- Click → opens a modal/sheet with the endorsement form (work selector, type, scope, notes).
- Modal posts to `giveEndorsementAction`.

**Dashboard tone**
- The form should make the cultural-stakes clear: "Endorsements are public, work-anchored, and revocable. Once given, the recipient's contribution lineage updates."
- Default work_type = "profile" for general standing endorsements; work_id optional unless work_type != "profile".

### 4.3 i18n

Add `endorsements.give` namespace with form labels. Reuse existing kind labels where possible.

### 4.4 Effort

1 day. No schema changes.

---

## 5. Vitest + initial coverage

### 5.1 Why now

The v1 audit deferred this. With v1 shipped, the next refactor (or bug fix) is the first chance to introduce regressions. A test framework catches them before they're deployed.

### 5.2 Scope (initial)

**Unit tests for:**
- `src/lib/endorsements/types.ts` — type-level invariants
- `src/lib/tono/types.ts` — label mapping
- `src/lib/kaikorero/types.ts` — DOMAIN_LABEL completeness
- `src/lib/auth/active-context.ts` — branch switching logic

**Integration tests for:**
- `src/lib/queries/tono.ts` — visibility filtering (mock Supabase client)
- `src/lib/actions/tono.ts` — state transitions (mock + DB snapshot if practical)

**E2E smoke (later, not v1.1):**
- One end-to-end test that creates a tono, accepts a proposal, fulfills it, and verifies the endorsement lands. Requires the live DB which complicates CI — defer until v1.2.

### 5.3 Tooling

- `vitest` (lightweight, ESM-native)
- `@testing-library/react` for component tests
- Mock Supabase client via `vi.mock('@/lib/supabase/clients', ...)`
- CI: not in scope for v1.1 — set up later when there's a CI workflow

### 5.4 Effort

2 days (one day setup, one day initial coverage).

---

## 6. Email fanout (Resend integration)

### 6.1 Why now

The v1 deferred email with the comment "until Resend is configured." If we're shipping v1.1 as a real release, dashboard-only notifications is a UX ceiling — users miss events when they're not actively in the dashboard.

### 6.2 Architecture

The `notifications` table stays the source of truth. Email is a fan-out, not a replacement.

**Pattern:**
1. Server action writes a `notifications` row (existing).
2. Same action (or a `pg_notify` trigger) signals to an email worker.
3. Email worker fetches unread + recent notifications for a user and batches into a digest email.
4. User preferences: per-kind email toggle in `profiles.notification_prefs` jsonb column (new).

**Resend integration**
- Install `resend` npm package.
- Add `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` to env (already in `.env.example`).
- Edge function OR Next.js API route (`/api/cron/email-digest`) handles the worker.
- Cron runs every 6 hours; sends one digest per user per period.

### 6.3 Schema addition

```sql
alter table public.profiles
  add column notification_prefs jsonb not null default '{
    "endorsement_received": {"in_app": true, "email": true},
    "endorsement_revoked": {"in_app": true, "email": true},
    "tono_proposal_received": {"in_app": true, "email": true},
    "tono_proposal_accepted": {"in_app": true, "email": false},
    "tono_proposal_declined": {"in_app": true, "email": false},
    "tono_fulfilled": {"in_app": true, "email": true}
  }'::jsonb;
```

Defaults reflect v1 behaviour: proposals-accepted/declined are in-app only (less urgent), fulfillment + endorsement events are email-worthy.

### 6.4 What NOT to build

- No individual transactional emails per event (too noisy; batches only)
- No email templating system — hand-rolled React-rendered HTML for the digest
- No unsubscribe mechanism beyond per-kind prefs (out of scope; v2)

### 6.5 Effort

2 days. Mostly the email worker + Resend template; schema addition is a small migration.

---

## 7. Tono `expires_at` auto-archive cron

### 7.1 What exists

Tono have an optional `expires_at timestamptz` field (migration 0027). When set, the tone is meant to stop accepting proposals after that date. **In v1, expired tono still appear in open listings.** Phase 4 deferred the auto-close cron.

### 7.2 What to build

**SQL function** (migration 0030):
```sql
create or replace function public.auto_expire_tonos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer;
begin
  update public.tono
    set status = 'closed', closed_at = now()
    where status = 'open'
      and expires_at is not null
      and expires_at < now();
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;
```

**Cron endpoint** `/api/cron/auto-expire-tonos`
- Existing pattern: `/api/cron/auto-archive` (from earlier work) for some other archive — model after that.
- Requires `CRON_SECRET` in env (already in `.env.example`).
- Returns the count of expired tono in the response.

**Hermes cron registration** (if Hermes is the scheduler)
- Daily at 00:00 UTC.
- Path: `/api/cron/auto-expire-tonos`.
- Auth: `CRON_SECRET` header.

### 7.3 Behaviour

- Open tono past `expires_at` → `closed` with `closed_at = now()`.
- `closed_at` is visible in lineage. Public profile surfaces closed tono (per §5.1).
- Decline any pending proposals with reason "Tono expired."

### 7.4 Effort

0.5 day. Function + cron endpoint + Hermes registration.

---

## Sequencing (recommended order)

```
Day 1  ┐ Bug fixes (1.1.1–1.1.4) — fix the broken picker, audit empty-in.() patterns
       │
Day 2  ├ Vitest setup + first coverage (item 5)
       │
Day 3  ├ Dashboard i18n sweep (item 3)
Day 4  │  └─ locale parity check
       │
Day 5  ┤ Notifications UI start (item 2)
Day 6  │  ├─ header bell + dropdown
Day 7  │  ├─ /notifications page
Day 8  │  └─ cross-page mark-read + i18n
       │
Day 9  ┤ Manual endorsement UI (item 4)
Day 10 │
       │
Day 11+ ┐ Email fanout + Resend (item 6)
Day 12 │
Day 13 │
       │
Day 14  ┘ Tono expires cron (item 7)
```

**Total: ~14 days, one developer.** The two-week estimate above assumes the items are taken in order. Items 2 (notifications) and 4 (manual endorsement) can run in parallel with the email work if two devs are available.

---

## Schema additions summary

| Migration | Adds |
|---|---|
| `0030_tono_expire_function.sql` | `auto_expire_tonos()` function + cron endpoint |
| `0031_notification_prefs.sql` | `profiles.notification_prefs jsonb` column with default |

Two migrations total for v1.1. No breaking changes to existing tables.

---

## Items explicitly NOT in v1.1

These are deferred to v2 (see `MARKETPLACE-PLAN.md` §12):

| Item | Reason |
|---|---|
| `koha_ledger` table + pair-balance view | v2 ships the relational ledger with both-party attestation. v1 records exchanges via endorsements + fulfilled-tono. |
| `/koha` dashboard | Same — exchange UI ships with v2. |
| Reciprocity nudge banner | Engagement territory; deferred until pair-exchange data exists. |
| Server-side rate-limit on `iwi_specific` views | v1 ships the soft banner only (Layer 3 of §4.9). Enforcement is v2 if needed. |
| Anonymous kaitiaki review | Separate fork; not part of collaboration marketplace. |
| Funder-observer role for koha visibility | Wait for Te Mātāwai to formally ask. |

---

## Decisions to make before starting v1.1

1. **Resend env vars**: do you have a Resend account + domain? The email fanout work item requires this to test end-to-end. Without it, item 6 ships without verification.

2. **Cron scheduler**: is Hermes the cron, or Vercel Cron, or something else? The `/api/cron/auto-expire-tonos` endpoint is portable; the scheduler binding is not. If Vercel Cron, the `vercel.json` schedule needs updating.

3. **Notifications email cadence**: every 6 hours? Once daily? Just-in-time (immediate, transactional)? The design above assumes every 6 hours batched. Let me know if you want different.

4. **Test framework choice**: Vitest vs Jest vs Node's built-in test runner. Recommendation is Vitest (fastest, ESM-native, integrates well with Next 16). Confirm or override.

5. **Manual endorsement as `profile`-anchored only**: the v1 server action allows `work_type='profile'` for general standing endorsements. Should the v1.1 form default to this, or require a specific work? Default profile-anchored feels safer for casual use cases.

6. **Dashboard i18n priority**: should this be done before or after notifications UI? My recommendation is i18n first (cleaner throughout), then notifications. But if notifications is the more urgent gap, swap.

---

## What "v1.1 done" looks like

After v1.1:
- New user signs up → kaitiaki approves their release → they receive a notification (in-app + email)
- They see the bell badge in the dashboard → click → see "Anamata Records endorsed you on 'Tada koe hitotsu / One Voice' as a co-creator"
- They click through to `/[locale]/artist/[their_id]` and see their new contribution lineage
- They go to `/tono`, post a help request, get proposals in their inbox, accept one, fulfill it
- They receive another notification + email when the proposer gets auto-endorsed
- They see the related tono on the proposer's profile (resolved lineage)
- They post a tono with `expires_at` → it auto-closes after that date
- All of the above works in `en` and `mi`

That's the v1.1 bar.

> *project2 — PioneeringAgentBot · status: waiting*
