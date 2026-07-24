# Collaboration Marketplace — Runbook Addendum

**Date:** 2026-07-23 · **Phase 0 applied:** 2026-07-23
**Pairs with:** `docs/RUNBOOK.md`, `docs/COLLABORATION-MARKETPLACE-PLAN.md`,
`docs/COLLABORATION-MARKETPLACE-PHASES.md`

This is the operational companion to the design and phase docs. It answers
"how do I run / fix / extend the collaboration marketplace?" — not
"what should it do?" For the why, read the design doc.

---

## Deployment notes (Phase 0, applied 2026-07-23)

**Applied via direct `pg` connection to Supabase pooler endpoint**
(`aws-0-ap-southeast-2.pooler.supabase.com:6543`) using
`postgres.fydhhyakfkceupibqnps` user.

The Supabase CLI (`npm run db:push`) was not usable from the build
environment due to missing access tokens; the `pg` driver via the pooler
worked. **For local dev iteration, use the Supabase CLI normally** — the
pooler route is a fallback when the CLI isn't available.

**Migration order matters.** The first migrations create functions
referenced by later ones:
- `set_updated_at()` — from `0001_initial_schema.sql`
- `is_super_admin()` — from `0001_initial_schema.sql`
- `has_branch_access()` — from `0001_initial_schema.sql`
- `deny_modification()` — from `0010_collaboration.sql`
- `is_kaitiaki()` — from `0025_collaboration_marketplace.sql` (NEW)

If you ever need to re-apply migrations 0025–0028 in isolation, ensure
`0010_collaboration.sql` has run first (creates `deny_modification`).

**Known fix applied during initial apply:** `0027_tono.sql` originally
used `scope_iwi = any ((select iwi_affiliation_attested from profiles where
id = auth.uid()))` which fails with `operator does not exist: text = text[]`.
Fixed by expanding the array with `unnest()`: `scope_iwi = any (select
unnest(iwi_affiliation_attested) from profiles where id = auth.uid())`.
This is the only material change to the originally-written SQL.

---

## Quick reference

| If you want to... | Go to |
|---|---|
| Add a new migration | `supabase/migrations/0025_collaboration_marketplace.sql` (and onwards) |
| Edit a server action | `src/lib/actions/{kaikorero-profile,endorsements,tono}.ts` |
| Add a new dashboard route | `src/app/(dashboard)/{kaikorero,tono,endorsements,koha}/` |
| Add a new public route | `src/app/(public)/[locale]/artist/[id]/` |
| Run a smoke test | Manual checklist in §Verification of each phase in PHASES.md |
| Reset the DB to a known state | `npm run db:reset` (standard Supabase flow) |

---

## Why iwi-specific tono is gated on attested (not claimed) affiliation

**The rule:** A user's `iwi_specific` tono visibility checks
`profiles.iwi_affiliation_attested`, NOT
`profiles.iwi_affiliation_claimed`.

**The reason:** Without this split, a bad-faith user can declare
"Taranaki" in their iwi affiliation at signup and immediately see
Taranaki-only tono. The attested-promotion requirement (30 days +
signal, OR endorsed by an attested member, OR on `kaitiaki_roopu`) makes
that path expensive.

**Implementation reminder for anyone touching the visibility query:**

```sql
-- CORRECT
where visibility = 'iwi_specific'
  and scope_iwi && (select iwi_affiliation_attested from profiles where id = auth.uid())

-- WRONG — never query the claimed set for visibility
where visibility = 'iwi_specific'
  and scope_iwi && (select iwi_affiliation_claimed from profiles where id = auth.uid())
```

The claimed set IS displayed on the public profile (with a "claimed"
tag) and IS used in some UI elements — just not for visibility
filtering.

---

## Why we don't recommend Tohunga or Rangatira (even if asked)

A funder or new contributor may suggest adding a "verified cultural
authority" badge. The answer is **no, and here's why**:

1. **Standing is community-held, not platform-issued.** Acknowledgement
   as Tohunga or Rangatira is conferred by iwi, hapū, or whānau — not
   by software.
2. **Small-pool pressure.** With one kaitiaki currently rostered, a
   recommendation feature would route every iwi-specific tono to that
   person. Single point of failure.
3. **Funder optics.** "Our algorithm recommends Tohunga-ranked creators"
   misrepresents the platform's role.

**What we do instead:** discovery by filter (knowledge_domain + iwi +
endorsement lineage). The existing `/kaitiakitanga` page already lists
named kaitiaki with their declared terms — they speak for themselves,
the platform doesn't amplify them.

If asked by a funder, the honest answer is: *"Cultural authority is
held by iwi and communities, not by the platform. The platform records
whakapapa through endorsements and the kaitiaki roster. We do not rank
cultural standing."*

Full reasoning in `MARKETPLACE-PLAN.md` §13.1.

---

## Why the koha ledger isn't in v1 (and why that's OK)

**The trade:** v1 records exchanges via endorsements + fulfilled-tono
on profiles. v2 ships the relational ledger with both-party attestation.

**Why we cut it:** without the ledger, the exchange is still honest. A
fulfilled tono says "Creator A got cultural guidance from Creator B on
Work X." That's truthful. Adding a ledger before we have the
attestation model (both-party, dispute-able, non-aggregable) would be
the wrong v1 — it would create the very gaming vectors the design
guards against.

**What v2 must use:** the design in `MARKETPLACE-PLAN.md` §3.5, not a
new invention. Specifically:
- Both-party attestation (`status = 'awaiting_attestation' → 'attested'`)
- Append-only (no updates, no deletes)
- Pair view shows two separate directional counts, NOT a net balance
- UI framing avoids "debt" / "balance ahead" / "owed" language
- Manual entries auto-archive after 30 days without attestation

---

## Why no aggregate counts on profile

A profile cannot show "47 endorsements received" or "+5 koha ahead."
This is enforced in three places:

1. **Schema:** no `endorse_count` or `koha_balance` columns exist. Don't
   add them.
2. **Views:** `v_koha_pair_exchanges` returns two separate directional
   counts (`gifts_a_to_b`, `gifts_b_to_a`), never a net.
3. **UI review:** before merging any profile-related UI, check that
   aggregates aren't shown.

The reasoning is in `MARKETPLACE-PLAN.md` §4.3 and §11.

---

## Cultural-review auto-endorsement — failure handling

When the kaitiaki approves a release, the cultural-review action
(`src/lib/actions/cultural-review.ts`) auto-creates endorsements for
each `split_participants` row with a `profile_id IS NOT NULL`. This
extends the existing transactional flow.

**If the auto-endorsement insert fails:**

- **DO** log the failure loudly (console.error + a notifications row
  to the kaitiaki if practical)
- **DO NOT** roll back the cultural-review decision
- The `cultural_review_cycles` audit row is sacred; it stands
- The endorsement can be re-created manually if needed; the audit
  trail is the source of truth, the endorsement is derived state

**Verification:** the test in PHASES.md §Phase 2 (Verification #3)
specifically asserts this — endorsement failure does NOT undo the
cultural decision.

---

## Endorsement revocation — what's allowed, what's not

The `endorsements_allow_revocation_only()` trigger enforces that only
these fields can change on an existing endorsement row:
- `status` (e.g. active → revoked)
- `revoked_reason`
- `revoked_at`

All other fields (recipient, endorser, work_id, type, domain, scope,
notes) are append-only after creation. If you need to "edit" an
endorsement in any way other than revoking it, you must:

1. Revoke the existing one (with reason)
2. Create a new endorsement with the correct values

The new endorsement will show in lineage; the revoked one will show
with its reason. Both are visible. This is intentional — endorsements
leave a trace.

---

## Notification table usage (v1)

`public.notifications` ships in migration `0028_notifications.sql`.
It's the source of truth for in-platform notifications; email fan-out
is v2.

**Kind values currently used:**

| Kind | When | Recipient |
|---|---|---|
| `endorsement_received` | New endorsement | recipient_id |
| `endorsement_revoked` | Endorsement revoked | recipient_id |
| `tono_proposal_received` | New proposal on own tono | tono creator |
| `tono_proposal_accepted` | Proposal accepted | proposer |
| `tono_proposal_declined` | Proposal declined | proposer |
| `tono_fulfilled` | Tono marked fulfilled | proposer (if linked) |

**Don't** add email fields to the `notifications` table — fan-out is
its own concern.

---

## What NOT to add (even if it seems helpful)

These will look like good ideas. They are not. See design doc §8 and
§13 for the full list.

| Tempting idea | Why no |
|---|---|
| Profile-level aggregate counts | §4.3 specificity |
| "Top helper" leaderboard | §4.8 |
| Auto-match suggestions | §8 anti-patterns |
| Public endorsements without a work anchor | §13.2 |
| Tohunga/Rangatira verification badges | §13.1 |
| Engagement streaks | §8 gamification |
| Anonymous feedback paths | §4.9 + principle 9 |
| Anonymous cultural review | §12 question 4 (separate fork) |

If a feature request touches any of these, link to the design doc and
the conversation where they were declined. Don't re-litigate in
isolation.

---

## When to escalate vs decide

This codebase has a clear principle: **default to design-doc rules,
ask if genuinely ambiguous, don't invent new patterns in isolation.**

**Decide yourself** (single-dev scope):
- Adding new knowledge domains to the enum
- Adding new translation keys
- Adding new dashboard routes following the existing pattern
- Bug fixes that don't change semantics

**Ask first:**
- New visibility tier (extends `tono.visibility` enum)
- New endorsement type
- New koha kind
- Changes to RLS policies
- Changes to append-only triggers
- Anything that affects public profile rendering for opted-out users
- Anything that creates or removes an aggregate count
- Anything that adds platform-granted standing to a role

---

*End of runbook addendum. The design is in PLAN, the sequence is in
PHASES, the operational rules are here.*
