# Anamata Kāhui — Collaboration Marketplace: Phased Build Plan (v1)

**Date:** 2026-07-23 · **Pairs with:** `docs/COLLABORATION-MARKETPLACE-PLAN.md`
**Goal of v1:** ship a working cross-iwi collaboration system that is small,
honest, culturally grounded, and end-to-end usable. Cut anything that
doesn't contribute to that.

---

## v1 scope (what we are building)

Three things, working together, with real data and real users:

1. **Kaikōrero profile** — every creator declares their cultural knowledge
   areas and iwi affiliations, opt-in public discovery
2. **Endorsements** — revocable, work-anchored, visible lineage
3. **Tono (help request) board** — post a need, get proposals, accept,
   close the loop

**Deferred to v2 (cuts from the design doc):**

- Koha ledger — the reciprocal balance view is genuinely useful but v1
  needs the *exchange* to be visible on profile. The ledger is bookkeeping.
  We'll log the koha as an endorsement note in v1; proper ledger is v2.
- Pair-balance dashboard
- Discovery inbox / "tono I could respond to"
- CSV export, email fanout
- Public `/collaborations` index

This is the **honest cut**: v1 ships the system that *creates* a koha
exchange and *records* it on profile. v2 ships the system that tracks
whether it was reciprocated. v1 doesn't claim reciprocity tracking it
can't actually keep honest.

---

## Phase 0 — foundations (must land first, everything else depends on it)

**Time:** 1–2 days
**Owner:** 1 dev
**Outcome:** all v1 migrations applied; profile extensions live; the
notification table exists.

### Tasks

1. **Migration `0025_collaboration_marketplace.sql`**
   - `knowledge_domain` enum (15 values per design doc §3.1)
   - `profile_knowledge_areas` table with RLS
   - Profile columns: `kaikorero_bio`, `kaikorero_visible`,
     `available_for_tono`, `contribution_count`

2. **Migration `0026_endorsements.sql`**
   - `endorsement_type` enum (7 values)
   - `endorsement_status` enum (3 values: active / revoked / superseded)
   - `endorsements` table with RLS
   - `endorsements_allow_revocation_only()` trigger function + trigger

3. **Migration `0027_tono.sql`**
   - `tono_status` enum (5 values)
   - `tono_help_type` enum (10 values)
   - `proposal_status` enum (4 values)
   - `tono` table with RLS
   - `tono_proposals` table with RLS

4. **Migration `0028_notifications.sql`** (new — was deferred to v2 but
   needed for v1 dashboard inbox)
   - `notifications` table (recipient_id, kind, payload jsonb, read_at)
   - RLS: own notifications only

5. **`db:push` and verify** — all four migrations apply clean, RLS
   enabled on every new table, no regressions on existing 31 migrations

### Verification

- `npm run typecheck` clean
- `npm run build` clean
- `supabase db reset` succeeds end-to-end
- RLS smoke test: anon user gets 0 rows from any new table

### What this phase ships externally

**Nothing visible.** It's the data layer only. The right outcome here is
"migrations applied, dashboard still works."

---

## Phase 1 — Kaikōrero profile (the discovery layer)

**Time:** 3–4 days
**Owner:** 1 dev
**Outcome:** a creator can declare their knowledge areas; the public can
discover them.

### Tasks

1. **Server actions** in `src/lib/actions/kaikorero-profile.ts`
   - `updateKaikoreroProfileAction(prev, formData)`
     - Updates: `kaikorero_bio`, `kaikorero_visible`, `available_for_tono`,
       `iwi_affiliation`, `te_reo_proficiency` (existing fields)
     - Add/remove `profile_knowledge_areas` rows
   - Returns `KaikoreroProfileState` discriminated union
   - Pattern follows `src/lib/actions/cultural-review.ts` (decision-result,
     not redirect)

2. **Dashboard route** `src/app/(dashboard)/kaikorero/profile/page.tsx`
   - Edit form: bio (textarea), knowledge areas (chip multi-select with
     scope_iwi + scope_region per chip), opt-in toggle, availability toggle
   - Server-rendered, action via form `action={updateKaikoreroProfileAction}`
   - i18n: `en` + `mi` keys in `src/locales/{en,mi}.json`
   - Sidebar nav entry: "Kaikōrero profile"

3. **Public route** `src/app/(public)/[locale]/artist/[id]/page.tsx`
   - Read-only profile: name, bio, iwi affiliations, knowledge areas
     (with scope), contribution count placeholder (set in phase 2)
   - Only renders if `kaikorero_visible = true` AND
     `opted_in_public_directory = true` (existing field) — both gates must
     pass
   - `app/(public)/[locale]/artist/[id]/not-found.tsx` for "this profile
     is private"
   - 404 if user doesn't exist
   - 404 if user exists but isn't opted in (don't leak existence)

4. **Public index enhancement** `src/app/(public)/[locale]/artist/page.tsx`
   - Add filter UI: `knowledge_domain` (multi-select) and `scope_iwi`
     (text or chip select)
   - Filter is client-side over already-fetched profiles (≤100 expected
     in v1; server-side filter via search params if list grows)
   - Empty state in both `en` + `mi`

5. **Translation keys** added to `src/locales/en.json` and `mi.json`:
   - `kaikorero.bio.label`, `kaikorero.bio.placeholder`
   - `kaikorero.knowledgeAreas.label`, `kaikorero.knowledgeAreas.help`
   - `kaikorero.visibility.label`, `kaikorero.availability.label`
   - `kaikorero.discover.title`, `kaikorero.discover.empty`
   - `artist.filter.domain`, `artist.filter.iwi`

### Verification

- Authed user can edit their profile → row appears in
  `profile_knowledge_areas` and `profiles` columns
- Anon user hitting `/artist` sees the directory (opt-in only)
- Anon user hitting `/artist/<uuid-of-opted-out-user>` → 404, not "private"
- Anon user hitting `/artist/<uuid-of-non-existent-user>` → 404
- `kaikorero_visible = true` + `opted_in_public_directory = false` → 404
  (both gates required)
- Filter by `knowledge_domain = purakau` returns only profiles with that
  knowledge area
- Typecheck, lint, build all clean
- Visual: smoke test both locales

### What this phase ships externally

- Public Kaikōrero directory with discovery filters
- A creator can claim "I carry knowledge of X, scoped to iwi Y"
- Funder demo: "the platform enables cultural-knowledge discovery across iwi"

---

## Phase 2 — Endorsements (the credibility layer)

**Time:** 4–5 days
**Owner:** 1 dev
**Outcome:** an approved release auto-endorses its collaborators;
contributions become visible lineage on public profiles.

### Tasks

1. **Server actions** in `src/lib/actions/endorsements.ts`
   - `giveEndorsementAction(prev, formData)` — endorser_id = auth.uid(),
     validation: recipient_id ≠ endorser_id, work_id exists, required
     fields (notes, type)
   - `revokeEndorsementAction(prev, formData)` — endorser_id or super_admin
     only; sets status, revoked_reason, revoked_at; trigger enforces
     no other field changes; creates a notification row for recipient
   - Both return discriminated unions (pattern: see `cultural-review.ts`)
   - Both `revalidatePath` appropriate surfaces

2. **Extend cultural review action** in `src/lib/actions/cultural-review.ts`
   - When decision = "approved" AND `split_participants` has rows with
     `profile_id IS NOT NULL`, auto-create one `endorsements` row per
     participant where:
     - `recipient_id = split_participants.profile_id`
     - `endorser_id = release.artist_id` (the work creator)
     - `work_id = release.id`
     - `endorsement_type = 'co_creator'`
     - `notes` references the role and koha
   - When decision = "approved", increment `profiles.contribution_count`
     for each participant
   - Wrap in a server-side transaction (use `supabase.rpc` for atomicity)
   - Failure mode: if any auto-endorsement fails, surface the error
     but do **not** roll back the cultural-review decision. The audit
     row is the source of truth; endorsements are derived state.

3. **Public display** on `src/app/(public)/[locale]/artist/[id]/page.tsx`
   - "Contribution lineage" section
   - Group by `(knowledge_domain, scope_iwi)` — NOT a single count
   - Show: work name (linked), role, date, endorser name + iwi, status
   - Revoked endorsements show with muted styling + reason tooltip
   - "New contributor" badge if `contribution_count < 3`

4. **Public display** on existing `src/app/(public)/[locale]/waiata/[slug]/`
   - Endorsement ribbon above the fold:
     - "Endorsed by [Name], [Iwi], [Role] — [Date]"
     - If multiple: list first 2, "+N more" link
     - "With cultural guidance from..." phrasing (matches funding-doc
       language)

5. **Dashboard route** `src/app/(dashboard)/endorsements/page.tsx`
   - Two tabs: "Given" and "Received"
   - Given tab: list of endorsements I gave, with revoke button
   - Received tab: list of endorsements I received
   - Tabs use existing tab pattern (`/admin/kaitiaki` has a similar tab UI)

6. **Notification triggers**
   - `endorsement_received` → notify recipient
   - `endorsement_revoked` → notify recipient with reason in payload

### Verification

- Approve a release with split_participants → auto-endorsements appear on
  each participant's public profile within the same request
- Recipient gets a `notifications` row
- `contribution_count` increments correctly per auto-endorsement
- Revoking an endorsement: only status/revoked_reason/revoked_at change
  (verify via direct DB read after action)
- Anon user sees endorsements on `/artist/[id]` and `/waiata/[slug]`
- Trying to update endorsement.notes after creation → fails (trigger test)
- "New contributor" badge shows on profile with 0 contributions, hides
  after the 3rd
- Typecheck, lint, build clean

### What this phase ships externally

- The credibility layer lands. Approved releases now carry visible
  cultural lineage.
- A funder can see, on any public profile, exactly what kind of
  cultural contribution that person has made, to which works, by whom
  endorsed.
- "New contributor" marker visible — signals openness, not exclusion.

---

## Phase 3 — Tono board (the request layer)

**Time:** 5–6 days
**Owner:** 1 dev (or split: 1 dev schema+actions, 1 dev UI in parallel)
**Outcome:** a creator can post a help request, get proposals, accept one,
close the loop. The proposal acceptance creates an endorsement and a
notification — wired into phase 2's plumbing.

### Tasks

1. **Server actions** in `src/lib/actions/tono.ts`
   - `createTonoAction(prev, formData)` — creator_id = auth.uid();
     validates work_id if provided, scope_iwi for iwi_specific visibility,
     expires_at if set
   - `proposeOnTonoAction(prev, formData)` — proposer_id = auth.uid();
     UNIQUE (tono_id, proposer_id) enforced by DB
   - `respondToProposalAction(prev, formData)` — accept/decline by tono
     creator; on accept: tono.status = 'in_conversation'; notification
   - `fulfillTonoAction(prev, formData)` — tono creator marks fulfilled
     when work lands; on fulfill: optional auto-endorsement of proposer
     (if work_id linked), increment proposer.contribution_count
   - `withdrawTonoAction(prev, formData)` — creator withdraws
   - All return discriminated unions; `revalidatePath` appropriate
     surfaces; create notifications on every state change

2. **Visibility enforcement** — server-side
   - `listVisibleTonosForUser(profile_id)` query helper in
     `src/lib/queries/tono.ts`
   - Filters: status='open' AND (visibility='open' OR
     (visibility='invited' AND invitee list contains profile_id) OR
     (visibility='iwi_specific' AND profile.iwi_affiliation_attested ∩
     tono.scope_iwi ≠ ∅))
   - `iwi_specific` uses Postgres `&&` operator on the `text[]`
     `iwi_affiliation_attested` column — **NOT the claimed set** (see
     `MARKETPLACE-PLAN.md` §4.9 for the layered defence model)
   - This is a *query-level* filter, NOT RLS. RLS still allows creator
     to see their own tono at any visibility.
   - The "new contributor" badge (≤3 contributions) is shown on proposals
     to the tono creator, surfacing but not blocking low-contribution accounts

3. **Dashboard routes**
   - `src/app/(dashboard)/tono/page.tsx` — My tono board (kanban-ish
     with status columns: open / in conversation / fulfilled / closed /
     withdrawn). Each card shows: help_type, scope_iwi, proposal count.
   - `src/app/(dashboard)/tono/new/page.tsx` — Compose tono form:
     help_type (select), knowledge_domain (optional), scope_iwi (optional,
     required if visibility='iwi_specific'), request_body (textarea),
     offered_koha (textarea, free-text), visibility (radio: open /
     invited / iwi_specific), work_id (optional link picker).
   - `src/app/(dashboard)/tono/[id]/page.tsx` — Tono detail:
     - Creator view: see proposals, accept/decline, mark fulfilled
     - Proposer view: see status of own proposal, withdraw
   - Use existing form patterns (server action, no client-side fetch)

4. **Profile integration** `src/app/(public)/[locale]/artist/[id]/page.tsx`
   - On public profile, show:
     - Currently fulfilled tono (with work link) — only `fulfilled` and
       `closed` statuses
     - **No open tono displayed publicly**
   - This is the explicit rule: public surfaces show resolved outcomes only

5. **Sidebar nav updates** `src/app/(dashboard)/layout.tsx`
   - "Tono" entry under Records branch (or top-level — design decision)
   - "Kaikōrero profile" entry (added in phase 1)
   - "Endorsements" entry (added in phase 2)
   - Use existing `NAV_ITEMS` pattern

6. **Notification triggers**
   - `tono_proposal_received` → notify tono creator
   - `tono_proposal_accepted` → notify proposer
   - `tono_proposal_declined` → notify proposer (private; chill-effect safe)
   - `tono_fulfilled` → notify proposer + create auto-endorsement if
     work_id is linked

7. **Translation keys** for all new UI: `tono.*`, `proposal.*` namespaces
   in both `en.json` and `mi.json`

### Verification

- Tono creator can post a tono with visibility='iwi_specific',
  scope_iwi='Taranaki'
- User with Taranaki only in `iwi_affiliation_claimed` (NOT in attested
  set) does NOT see this tono — verified via direct query
- User with Taranaki in `iwi_affiliation_attested` sees it
- User WITH Taranaki in `iwi_affiliation_attested` but
  tono.creator_id = someone else → still sees it (visibility is
  content-level, not ownership-level)
- Two proposals from same user → second one fails (UNIQUE)
- Accepting a proposal flips tono.status to 'in_conversation' and
  notifies proposer
- Fulfilling a tono linked to a work: an auto-endorsement is created on
  the proposer, contribution_count increments, notification sent
- Anon user hitting `/artist/[id]` sees fulfilled tono but NOT open ones
- Tono with `expires_at` in the past: query excludes from open list
  (defer auto-close logic to v2 — for v1, expired stays visible to creator
  only, no list filter needed)
- A proposal from an account with `contribution_count < 3` shows the
  "unestablished contributor" badge to the tono creator
- Typecheck, lint, build clean

### What this phase ships externally

- The core system. A creator from iwi A can post "need someone from iwi B
  to verify this pūrākau," get proposals, accept one, and the
  collaboration shows up on both profiles.
- The `iwi_specific` visibility filter demonstrates the inter-iwi
  discovery primitive working — funder-grade evidence.

---

## Phase 4 — v1 polish (cut for v1 unless trivial)

**Time:** 2 days buffer
**Owner:** 1 dev
**Outcome:** the rough edges that block funder demos are gone.

### Tasks (in priority order)

1. **Empty states** — every new route has a meaningful empty state in
   both `en` and `mi`. The existing pattern (italic muted text on a
   dashed card) ships in `/artist` already; replicate.

2. **Loading skeletons** — every new dashboard route uses the existing
   `(dashboard)/loading.tsx` skeleton pattern. Verify by throttling.

3. **Error handling** — server actions return informative errors. Every
   `.catch` surface has been considered. Use existing `decision-result`
   pattern.

4. **Test suite smoke** — at minimum:
   - Migration applies clean against a fresh `db:reset`
   - Existing cultural-review flow still works
   - Existing kaitiaki dashboard still works
   - New tono flow end-to-end (manual or one Vitest spec per phase)

5. **README + RUNBOOK update** in `docs/RUNBOOK.md`:
   - How to add a kaikōrero profile
   - How to post a tono
   - How endorsement revocation works
   - What `iwi_specific` visibility does and does NOT do

6. **One funder-grade screenshot pass** — visual review of:
   - `/artist/[id]` (a profile with 3+ endorsements)
   - `/waiata/[slug]` (a release with the endorsement ribbon)
   - `/dashboard/tono` (a creator's board with mixed statuses)
   - `en` + `mi` versions of each

### What we explicitly do NOT do in phase 4

- Add Vitest if it's not already in `package.json` (the audit doc says
  it's not; adding it is a 1-day spike that's better as v1.1)
- Email fanout
- Public `/collaborations` index
- CSV export
- Visual polish beyond "presentable for a demo"

---

## Sequencing summary

| Phase | Days | Cumulative | Ships externally |
|---|---|---|---|
| 0 | 1–2 | 1–2 | Nothing (data layer) |
| 1 | 3–4 | 4–6 | Public Kaikōrero directory with filters |
| 2 | 4–5 | 8–11 | Endorsements visible on profiles + waiata |
| 3 | 5–6 | 13–17 | Tono board, end-to-end working |
| 4 | 2 | 15–19 | Polish, empty states, runbook |

**Total v1: ~3 weeks (15–19 days), one developer.**

This is shippable. Every phase has its own demo: phase 1 ships discovery,
phase 2 ships credibility, phase 3 ships the working collaboration loop.
If we had to stop at any phase boundary, we'd have something usable.

---

## v2 (parking lot — explicitly out of v1)

| Feature | Why deferred |
|---|---|
| `koha_ledger` table + pair-exchanges view | v1 records the exchange on profile via endorsements + fulfilled-tono; v2 ships the relational ledger with both-party attestation (see `MARKETPLACE-PLAN.md` §3.5) |
| `/koha` dashboard | Same — exchange UI ships with v2 |
| Discovery inbox ("tono I could respond to") | Tono board is the *first* loop; inbox comes once board is proven |
| Email notifications (Resend or equivalent) | Notifications table exists; email is fanout |
| Public `/collaborations` index | Reuses fulfilled-tono query; build after phase 3 has data |
| CSV export of endorsement + tono logs | Funder ask, not user ask |
| Auto-match suggestions | Anti-pattern; user-triggered filter only |
| Anonymous kaitiaki review | Separate fork; not part of collaboration marketplace |
| Vitest test framework | Add as v1.1 spike, not block v1 on it |
| Reciprocity nudge banner | Engagement territory; deferred until pair-exchange data exists |
| Server-side rate-limit on `iwi_specific` views | v1 ships the soft banner only (Layer 3 of §4.9); enforcement is v2 if needed |
| `koha` cron auto-archive (30-day unattended) | v1 manual entries aren't supported (no manual koha table yet); cron ships with v2 |

---

## Risks and watch-points

1. **`iwi_specific` visibility uses attested (not claimed) affiliation.**
   v1 ships the Layer 1 + Layer 2 defences from `MARKETPLACE-PLAN.md`
   §4.9 (contribution-count flag + attested promotion). Layer 3 (soft
   banner) and Layer 4 (kaitiaki visibility) are also in scope. v1 does
   **not** ship iwi-org attestation — that would require federation
   with iwi membership systems that don't publicly exist. Flag in
   runbook: v1 is robust against casual bad faith, not against a
   determined actor willing to wait 30 days.
2. **Cultural-review auto-endorsement can fail mid-flight.** Phase 2 task
   #2 is explicit: failure does NOT roll back the cultural decision. The
   audit row is sacred. If auto-endorsement breaks, log it loudly; the
   koha is owed regardless.
3. **Public profile 404 vs "private" leak.** Phase 1 task #3 specifies
   404 (not "this profile is private") so the existence of opted-out
   users doesn't leak. Don't change this without thinking.
4. **The "new contributor" badge is permanent below 3 contributions.**
   If a creator only ever makes 2 contributions, the badge stays
   forever. That's intentional — it's not a graduation, it's a period.
5. **No email means quiet notifications.** A user who doesn't log in
   daily will miss proposal acceptances. v1 accepts this. v2 fixes with
   email. Don't promise real-time collaboration in v1 marketing.
6. **The koha ledger cut is the biggest v1 loss.** Without it, there's
   no reciprocity tracking. The plan accepts this trade: ship the
   exchange first, track reciprocity later. The trade is honest because
   nothing about v1 *claims* reciprocity that it can't keep. The full
   v2 design with both-party attestation is documented in
   `MARKETPLACE-PLAN.md` §3.5; v2 implementation must use that model,
   not invent a new one.
7. **No platform-granted cultural standing.** Per
   `MARKETPLACE-PLAN.md` §13.1, no Tohunga/Rangatira badges. Runbook
   must explain *why* so this doesn't get re-requested by a funder or
   new contributor.

---

## Open decisions before phase 0 starts

1. **Do we need Vitest before phase 0?** No — manual + DB smoke is
   sufficient for v1. Add Vitest in v1.1.
2. **Do we need Resend before phase 3?** No — notifications are
   dashboard-only in v1.
3. **Branch layout for the tono dashboard route.** Phase 3 task #5 says
   "Records branch or top-level — design decision." Recommend top-level
   (the tono board is cross-branch by nature; it lives under Records in
   data but not in nav).
4. **Are we comfortable with the v1 cuts?** Specifically the koha
   ledger. If funders specifically ask about reciprocity tracking in
   the demo, we answer with "exchange visible on profile; reciprocity
   tracking ships v2." If that answer is unacceptable, we revisit.

---

*End of phased build plan. v1 = phases 0–4. Ship it.*
