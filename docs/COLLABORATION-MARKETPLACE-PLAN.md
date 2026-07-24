# Anamata Kāhui — Cross-Iwi Collaboration Marketplace Plan

**Date:** 2026-07-23 · **Status:** Design · **Owner:** TBC
**Builds on:** `0010_collaboration.sql` (shipped), `cultural-review.ts` (shipped),
`profiles.iwi_affiliation` + `opted_in_public_directory` (shipped),
`kaitiaki_roopu` (shipped).

---

## Why this plan exists

A creator from iwi A writes a waiata drawing on kōrero tuku iho of iwi B. Today
the path to legitimacy is informal: cold DMs, mutual contacts, hope. The
platform already has the *infrastructure* for cultural endorsement (kaitiaki
review cycles, iwi_consent_id, consent_log, kaitiaki_roopu) but no
*inter-creator* primitive. This plan adds that primitive on top of what's
shipped, without breaking it.

The framing throughout is **reciprocity, not transaction**. The platform is
a kete of cultural knowledge and a workspace for whakapapa — not a gig
marketplace.

---

## 1. Design principles (the things we will not compromise on)

These were agreed through the conversation. They are the spine of every
downstream decision. If a future feature request conflicts with one of these,
flag it.

1. **Reciprocity, not transaction.** Every koha is a gift that creates an
   obligation in the other direction. No ratings, no leaderboards, no
   marketplace dynamics.
2. **Trust through lineage, not vetting.** Contribution history is the
   credential. The platform does not pre-vet collaborators.
3. **Specificity over generality.** Quality signals must be scoped to
   *what kind* of help and *which iwi/region*. No "47 endorsements"
   abstractions.
4. **Endorsements are revocable.** Cultural standing is not a one-shot stamp.
5. **Cultural authority stays iwi-led.** The platform attests; iwi decide.
6. **Public surfaces show only resolved outcomes.** Tono requests and open
   koha balances are dashboard-only. Public pages show whakapapa, not
   requests.
7. **Dignity over engagement.** No badges, streaks, gamification. The system
   should feel like a wharenui pōwhiri board, not a marketplace.
8. **No "someone from iwi X" pre-verification.** Identity as iwi member is
   *attested over time* through contribution, not verified by platform.
   The platform sets context; iwi decide authority.
9. **No anonymous feedback.** Everything attributed, contextualised, public.
10. **Append-only where it matters.** Endorsements, review cycles, koha
    ledger — once written, no silent edits.
11. **Both-party attestation for relational claims.** A koha entry from
    creator A to creator B requires B's confirmation to be public.
    Reciprocity is bilateral, not self-declared.
12. **No aggregate counts on relational state.** "47 endorsements" or
    "+5 koha ahead" are banned framings. Discovery is by filter, not by
    score. Specificity over aggregation, always.
13. **No platform-granted cultural standing.** Tohunga, Rangatira, and
    similar titles are community-held standing, not platform credentials.
    The platform records whakapapa; it does not rank people by it.

---

## 2. Five new entities

These extend the existing schema. No replacement, no parallel systems.

| Entity | Purpose | Already ships? |
|---|---|---|
| `profile_knowledge_areas` | Self-declared cultural-knowledge domains (reo, pūrākau, tikanga, etc.) | ❌ new |
| `endorsements` | One creator endorsing another, scoped to a work + scope + type | ❌ new |
| `tono` (help requests) | "Need help with X" — visible to invited/qualified users | ❌ new |
| `tono_proposals` | Response to a tono with proposed koha | ❌ new |
| `koha_ledger` | Reciprocal balance per pair of creators, append-only | ❌ new |

Plus extensions to `profiles`:

- `kaikorero_bio` (text) — longer bio surfaced on public profile
- `kaikorero_visible` (boolean, default false) — opt-in to public Kaikōrero directory
- `available_for_tono` (boolean, default true) — toggle to receive tono invitations
- `new_contributor` (computed) — true for first 3 substantive contributions

`iwi_affiliation`, `te_reo_proficiency`, `opted_in_public_directory` already
exist; we use them. No migration alters them.

---

## 3. Schema additions — full spec

### 3.1 `profile_knowledge_areas`

Self-declared cultural-knowledge domains. Distinct from `role` (platform
permission) and `iwi_affiliation` (tribal membership). This is *what you
carry knowledge of*.

```sql
create type public.knowledge_domain as enum (
  'reo_matatini',          -- written/grammar te reo
  'reo_korero',            -- spoken te reo
  'purakau',               -- narrative / mythology
  'whakapapa',             -- genealogy
  'tikanga',               -- protocol / ceremony
  'kapa_haka',             -- performance
  'waiata',                -- composition / songcraft
  'taonga_puoro',          -- traditional instruments
  'whakairo',              -- carving
  'raranga',               -- weaving
  'kai',                   -- kai / food sovereignty
  'whenua',                -- place / whenua-specific knowledge
  'tikanga_digital',       -- Māori data sovereignty, CARE principles
  'matauranga_taiao',      -- environment / natural world
  'other'
);

create table public.profile_knowledge_areas (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  domain      public.knowledge_domain not null,
  -- Optional scoping: is this knowledge iwi-specific? If so, which iwi?
  scope_iwi   text,                  -- free-text, optional, multi-iwi allowed
  scope_region text,                -- rohe / takiwā
  attested_at timestamptz not null default now(),
  -- Attested means: declared by user. Attestation deepens over time via
  -- endorsements_received against this row.
  unique (profile_id, domain, scope_iwi, scope_region)
);

create index idx_pka_profile on public.profile_knowledge_areas (profile_id);
create index idx_pka_domain on public.profile_knowledge_areas (domain);
create index idx_pka_scope_iwi on public.profile_knowledge_areas (scope_iwi);

alter table public.profile_knowledge_areas enable row level security;

-- Read: public (this is the discovery layer)
create policy pka_read_public on public.profile_knowledge_areas for select using (true);

-- Write: own profile only; super_admin
create policy pka_write_self on public.profile_knowledge_areas for insert
  with check (profile_id = auth.uid() or public.is_super_admin());
create policy pka_update_self on public.profile_knowledge_areas for update
  using (profile_id = auth.uid() or public.is_super_admin());
create policy pka_delete_self on public.profile_knowledge_areas for delete
  using (profile_id = auth.uid() or public.is_super_admin());
```

**Why this is *not* a vetting system.** Anyone can declare anything. The
attestation deepens when other people endorse you for that specific domain.
A profile with 0 endorsements against `purakau / Ngāti Porou` and a profile
with 12 endorsements against `purakau / Ngāti Porou` are visibly different —
without the platform judging either.

### 3.2 `endorsements`

The cultural-credibility primitive. **Revocable. Append-only at the audit
layer, but revocable through a new row.**

```sql
create type public.endorsement_type as enum (
  'source_of_knowledge',   -- I taught you this; the pūrākau is mine
  'cultural_endorsement',  -- I vouch for the cultural standing of this work
  'co_creator',            -- I contributed to creating this
  'verification',          -- I verified a factual claim (e.g. place name)
  'translation',           -- I translated / verified reo content
  'blessing',              -- formal blessing, rarely given
  'mentorship'             -- I mentored the creator on this work
);

create type public.endorsement_status as enum (
  'active',
  'revoked',               -- visible on profile with reason
  'superseded'             -- replaced by a newer endorsement on the same work
);

create table public.endorsements (
  id              uuid primary key default gen_random_uuid(),
  -- Who is being endorsed
  recipient_id    uuid not null references public.profiles(id) on delete cascade,
  -- Who is giving the endorsement
  endorser_id     uuid not null references public.profiles(id) on delete restrict,
  -- What is being endorsed (work-anchored; never abstract)
  work_id         uuid references public.releases(id) on delete set null,
  work_type       text,                -- 'release' | 'lyric' | 'stem' | 'profile' (for general endorsements)
  work_ref        text,                -- free-text or path
  -- The shape of the endorsement
  endorsement_type public.endorsement_type not null,
  -- Scoped knowledge domain (FK to keep endorsements queryable)
  knowledge_domain public.knowledge_domain,
  -- Scoped iwi / region if the endorsement is iwi-specific
  scope_iwi       text,
  scope_region    text,
  -- Free-text notes — what specifically is being endorsed, in the endorser's words
  notes           text not null check (length(notes) > 0 and length(notes) <= 2000),
  -- Revocation — never delete, always record
  status          public.endorsement_status not null default 'active',
  revoked_reason  text,
  revoked_at      timestamptz,
  -- Supersession — if a new endorsement supersedes this one
  superseded_by   uuid references public.endorsements(id),
  -- Timestamps
  created_at      timestamptz not null default now(),
  -- Constraint: cannot endorse yourself
  check (endorser_id <> recipient_id)
);

create index idx_endorsements_recipient on public.endorsements (recipient_id);
create index idx_endorsements_endorser on public.endorsements (endorser_id);
create index idx_endorsements_work on public.endorsements (work_id);
create index idx_endorsements_domain on public.endorsements (knowledge_domain);

alter table public.endorsements enable row level security;

-- Read: public (lineage is the value)
create policy endorsements_read_public on public.endorsements for select using (true);

-- Insert: only the endorser themselves (via server action)
create policy endorsements_write_self on public.endorsements for insert
  with check (endorser_id = auth.uid() or public.is_super_admin());

-- Update: only via the revocation flow (endorser or super_admin)
-- We use UPDATE only for status/revoked_* fields. A trigger enforces that
-- nothing else is mutable.
```

**Append-only trigger (the strict version):**

```sql
create or replace function public.endorsements_allow_revocation_only()
returns trigger
language plpgsql
as $$
declare
  changed_non_revoke_fields boolean;
begin
  -- Allow revocation: only status, revoked_reason, revoked_at may change.
  changed_non_revoke_fields :=
    new.recipient_id    is distinct from old.recipient_id or
    new.endorser_id     is distinct from old.endorser_id or
    new.work_id         is distinct from old.work_id or
    new.endorsement_type is distinct from old.endorsement_type or
    new.knowledge_domain is distinct from old.knowledge_domain or
    new.scope_iwi       is distinct from old.scope_iwi or
    new.scope_region    is distinct from old.scope_region or
    new.notes           is distinct from old.notes;

  if changed_non_revoke_fields then
    raise exception 'endorsements are append-only — only status, revoked_reason, revoked_at may change'
      using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end$$;

create trigger endorsements_no_mutation
  before update on public.endorsements
  for each row execute function public.endorsements_allow_revocation_only();
```

**Why revocable, not deletable.** Endorsements leave a trace. If Creator A
revoked an endorsement of Creator B, that fact itself is part of Creator
B's lineage — visible, with reason. You can't quietly disappear an
endorsement you regret; you have to own the reversal. This matches how
cultural authority actually works.

### 3.3 `tono` (help requests)

The kōrero tono board. Where needs are surfaced to the people who can help.

```sql
create type public.tono_status as enum (
  'open',           -- seeking responses
  'in_conversation',-- a proposal has been accepted; in progress
  'fulfilled',      -- work landed; ended well
  'closed',         -- creator closed without fulfilling (still public)
  'withdrawn'       -- creator withdrew the request
);

create type public.tono_help_type as enum (
  'verify_narrative',   -- need someone to verify a pūrākau reference
  'verify_reo',         -- need te reo verification
  'co_create',          -- looking for a collaborator
  'review_cultural',    -- need cultural review (formal kaitiaki role)
  'translate',          -- need translation
  'compose',            -- need a composer / arranger
  'produce',            -- need a producer
  'mentor',             -- looking for mentorship on a work
  'feedback',           -- want creative feedback
  'place_name',         -- need verification of place names
  'other'
);

create table public.tono (
  id              uuid primary key default gen_random_uuid(),
  -- Who is asking
  creator_id      uuid not null references public.profiles(id) on delete cascade,
  -- What they're asking about (work-anchored where possible)
  work_id         uuid references public.releases(id) on delete set null,
  -- The ask itself
  help_type       public.tono_help_type not null,
  knowledge_domain public.knowledge_domain,
  scope_iwi       text,            -- if asking for help with iwi B-specific knowledge
  scope_region    text,
  -- Free-text: what specifically is needed, in the creator's words
  request_body    text not null check (length(request_body) > 0 and length(request_body) <= 4000),
  -- Reciprocity intent: what kind of koha is on offer (could be $0)
  offered_koha    text,            -- free-text: "co-credit", "$0 — reciprocity later", "$200 koha"
  koha_is_monetary boolean default false,  -- explicit flag so we don't normalise money
  -- Visibility: open invitation vs. directed
  visibility      text not null default 'open'
                    check (visibility in ('open', 'invited', 'iwi_specific')),
  -- Status
  status          public.tono_status not null default 'open',
  fulfilled_by    uuid references public.profiles(id),
  fulfilled_at    timestamptz,
  closed_at       timestamptz,
  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  expires_at      timestamptz  -- if set, auto-close after this date
);

create index idx_tono_creator on public.tono (creator_id);
create index idx_tono_work on public.tono (work_id);
create index idx_tono_status on public.tono (status);
create index idx_tono_help_type on public.tono (help_type);
create index idx_tono_knowledge_domain on public.tono (knowledge_domain);
create index idx_tono_scope_iwi on public.tono (scope_iwi);
```

**Visibility is a first-class field.**

- `open` — anyone can see and propose (the discovery layer)
- `invited` — only named invitees (privacy for sensitive cultural work)
- `iwi_specific` — only people who have declared an iwi affiliation matching `scope_iwi`. This is the closest thing to "verified" we get, and it's *self-attested* — the proposal is shown to people whose profile says they're from iwi X, but the platform doesn't verify that claim.

### 3.4 `tono_proposals`

Responses to a tono with a stated koha.

```sql
create type public.proposal_status as enum (
  'pending',       -- awaiting creator response
  'accepted',      -- creator accepted; relationship begins
  'declined',      -- creator declined
  'withdrawn'      -- proposer withdrew before creator responded
);

create table public.tono_proposals (
  id              uuid primary key default gen_random_uuid(),
  tono_id         uuid not null references public.tono(id) on delete cascade,
  proposer_id     uuid not null references public.profiles(id) on delete cascade,
  -- The proposal
  proposal_body   text not null check (length(proposal_body) > 0 and length(proposal_body) <= 4000),
  proposed_koha   text,
  -- Timeframe
  estimated_hours numeric(6,2),  -- optional; hours the proposer estimates
  available_from  date,
  -- Status
  status          public.proposal_status not null default 'pending',
  decided_at      timestamptz,
  decline_reason  text,
  -- If accepted, this becomes a koha_ledger entry
  created_at      timestamptz not null default now(),
  -- One proposal per (tono, proposer)
  unique (tono_id, proposer_id)
);

create index idx_proposals_tono on public.tono_proposals (tono_id);
create index idx_proposals_proposer on public.tono_proposals (proposer_id);
create index idx_proposals_status on public.tono_proposals (status);

alter table public.tono_proposals enable row level security;

-- Read: visible to the tono creator + the proposer + super_admin
create policy proposals_read on public.tono_proposals for select using (
  proposer_id = auth.uid()
  or exists (select 1 from public.tono t where t.id = tono_proposals.tono_id and t.creator_id = auth.uid())
  or public.is_super_admin()
);

-- Write: only the proposer
create policy proposals_write on public.tono_proposals for insert
  with check (proposer_id = auth.uid());

-- Update: proposer can withdraw; creator can accept/decline
create policy proposals_update on public.tono_proposals for update
  using (
    proposer_id = auth.uid()
    or exists (select 1 from public.tono t where t.id = tono_proposals.tono_id and t.creator_id = auth.uid())
    or public.is_super_admin()
  );
```

### 3.5 `koha_ledger` (reciprocal exchanges, both-party attested)

The reciprocity layer. **Append-only. Both-party attested. Non-aggregable.**

Each row records one exchange between two creators. Visibility is
gated by attestation status. The pair view shows exchanges, not
balances.

```sql
create type public.koha_direction as enum (
  'given',         -- from_creator gave to to_creator
  'reciprocated',  -- from_creator reciprocated a previous gift
  'settled'        -- explicit closure; both parties agree the reciprocity is complete
);

create type public.koha_kind as enum (
  'cultural_guidance',      -- taught, advised, verified
  'creative_contribution',  -- co-created, arranged, performed
  'mentorship',             -- ongoing mentorship
  'translation',            -- translation work
  'review',                 -- formal review (kaitiaki, peer)
  'feedback',               -- informal creative feedback
  'introduction',           -- connected someone to someone
  'other'
);

create type public.koha_status as enum (
  'awaiting_attestation',  -- one party created; the other must confirm
  'attested',              -- both parties confirmed; publicly visible
  'disputed',              -- recipient disputes the framing; visible with annotation
  'archived'               -- 30 days without attestation; not queryable on profile
);

create type public.koha_source as enum (
  'manual',               -- hand-logged (rare path)
  'tono_acceptance',      -- auto-created on tono proposal acceptance
  'tono_fulfillment',     -- auto-created on tono fulfillment
  'endorsement',          -- auto-created when an endorsement is given
  'cultural_review'       -- auto-created on cultural review approval with collaborators
);

create table public.koha_ledger (
  id              uuid primary key default gen_random_uuid(),
  -- The directional gift
  from_creator_id uuid not null references public.profiles(id) on delete restrict,
  to_creator_id   uuid not null references public.profiles(id) on delete restrict,
  direction       public.koha_direction not null,
  kind            public.koha_kind not null,
  -- Both-party attestation
  status          public.koha_status not null default 'awaiting_attestation',
  -- Anchors
  tono_id         uuid references public.tono(id) on delete set null,
  proposal_id     uuid references public.tono_proposals(id) on delete set null,
  endorsement_id  uuid references public.endorsements(id) on delete set null,
  work_id         uuid references public.releases(id) on delete set null,
  source          public.koha_source not null default 'manual',
  -- Description
  description     text not null check (length(description) > 0 and length(description) <= 2000),
  -- Optional monetary value (rare; explicit, never implicit)
  monetary_value_nzd numeric(10,2),
  -- Attestation by the recipient
  attested_at     timestamptz,
  attested_by     uuid references public.profiles(id),
  -- Recipient's annotation (visible on profile when attested)
  recipient_note  text,
  -- Dispute by the recipient
  disputed_at     timestamptz,
  dispute_reason  text,
  -- Pair-key for cheap pair queries (not exposed as "balance")
  pair_min_id     uuid generated always as (
    case when from_creator_id < to_creator_id then from_creator_id else to_creator_id end
  ) stored,
  pair_max_id     uuid generated always as (
    case when from_creator_id < to_creator_id then to_creator_id else from_creator_id end
  ) stored,
  created_at      timestamptz not null default now(),
  check (from_creator_id <> to_creator_id),
  -- Source-derivable entries are auto-attested on insert (the underlying
  -- action is itself verified); manual entries require attestation.
  check (
    (source <> 'manual' and status in ('attested', 'disputed'))
    or source = 'manual'
  )
);

create index idx_koha_from on public.koha_ledger (from_creator_id);
create index idx_koha_to on public.koha_ledger (to_creator_id);
create index idx_koha_pair on public.koha_ledger (pair_min_id, pair_max_id);
create index idx_koha_tono on public.koha_ledger (tono_id);
create index idx_koha_status on public.koha_ledger (status);

alter table public.koha_ledger enable row level security;

-- Read: only attested/disputed entries are public to anyone.
-- Awaiting_attestation visible to the two parties + super_admin + kaitiaki
create policy koha_read_public on public.koha_ledger for select using (
  status in ('attested', 'disputed')
  or from_creator_id = auth.uid()
  or to_creator_id = auth.uid()
  or public.is_super_admin()
  or public.is_kaitiaki()
);

-- Insert: the gifter (or super_admin on behalf of the system for auto-derived entries)
create policy koha_write on public.koha_ledger for insert
  with check (
    from_creator_id = auth.uid()
    or public.is_super_admin()
  );

-- Append-only: no silent edits
create trigger koha_no_update
  before update on public.koha_ledger
  for each row execute function public.deny_modification();
create trigger koha_no_delete
  before delete on public.koha_ledger
  for each row execute function public.deny_modification();

-- Auto-archive after 30 days without attestation (cron job, not trigger)
-- Entries move status='awaiting_attestation' → 'archived'.
-- Archived entries are recoverable but not queryable on profile.
```

**Pair view — exchanges, not balances:**

```sql
create or replace view public.v_koha_pair_exchanges as
select
  pair_min_id as creator_a,
  pair_max_id as creator_b,
  -- Two separate counts, NOT a net balance
  count(*) filter (where from_creator_id = pair_min_id) as gifts_a_to_b,
  count(*) filter (where from_creator_id = pair_max_id) as gifts_b_to_a,
  -- Most recent exchange either direction
  max(created_at) as last_exchange_at
from public.koha_ledger
where status in ('attested', 'disputed')
group by pair_min_id, pair_max_id;
```

**UI framing for the pair view:**

| Don't | Do |
|---|---|
| "B is +5 koha ahead of you" | "You and B have exchanged 7 koha. 5 from B to you, 2 from you to B." |
| "Net balance: −2" | "Open reciprocity: 2 exchanges from B to you haven't been reciprocated yet." |
| "Settle your debt" | "Mark this reciprocity as complete (with note)" |

**Auto-derived entries** (source != 'manual') are created immediately
attested, because the underlying action (tono acceptance, endorsement,
cultural review approval) is itself verified. Manual entries require
the recipient's confirmation.

**Kaitiaki visibility:** the `is_kaitiaki()` predicate in the read RLS
lets named kaitiaki see awaiting_attestation entries to flag
misrepresentation. Kaitiaki can also annotate any entry with
"disputed by kaitiaki" via a separate table to avoid the
`deny_modification` trigger blocking their annotation.

### 3.6 Profile extensions

```sql
alter table public.profiles
  add column if not exists kaikorero_bio text,
  add column if not exists kaikorero_visible boolean not null default false,
  add column if not exists available_for_tono boolean not null default true,
  add column if not exists contribution_count integer not null default 0,
  -- Iwi affiliation is split into claimed (immediate, free text) and
  -- attested (promoted after delay + signal). See §4.9 for the rules.
  add column if not exists iwi_affiliation_claimed text[] default '{}',
  add column if not exists iwi_affiliation_attested text[] default '{}';

-- computed `new_contributor` is a query, not a column. UI derives it.
```

`contribution_count` is incremented server-side whenever an endorsement or
accepted proposal lands. The `new_contributor` flag is shown when
`contribution_count < 3` — visible on public profile as a "new contributor"
marker. Not a penalty, a marker of openness.

`iwi_affiliation` (the existing column) is preserved. The two new
columns track the claim/attestation split:
- `iwi_affiliation_claimed` — what the user typed (free text, instant)
- `iwi_affiliation_attested` — promoted set after 30 days + signal, OR
  endorsed by an attested member, OR roster membership in `kaitiaki_roopu`

`iwi_specific` tono visibility checks `iwi_affiliation_attested` (NOT the
claimed set). The claimed set is shown on profile with a "claimed" tag;
the attested set is shown as plain iwi affiliation.

---

## 4. Quality system — explicit guardrails

This is the answer to "how do we ensure quality in collaborators without
the market deciding."

### 4.1 No ratings, ever

No 5-star. No thumbs up. No "verified top helper" badge. Quality is *shown
through lineage*, not *rated through aggregation*.

### 4.2 Contribution lineage is the credential

Each contribution entry on a public profile shows:
- The work name and link
- The role taken (verified, co-created, endorsed, mentored)
- The domain and iwi scope
- Who endorsed the contributor (and whether that endorsement was revoked)
- Date

A profile with 30 contextualised contributions is visibly more credible
than one with 0 — without anyone scoring anything.

### 4.3 Specificity enforcement

The platform **refuses to abstract across iwi or domain**. A helper's
profile shows their endorsements broken down by `(knowledge_domain,
scope_iwi)` — never as a single count. A "47 endorsements" summary is
banned from the UI. Granularity is the point.

### 4.4 The "new contributor" marker

`contribution_count < 3` → profile shows a small "new contributor" badge.

**What the marker does:**
- Signals to potential collaborators: "be patient, scope carefully, mentor."
- Signals to the platform: early contributions warrant closer review.
- Has no negative effect on discovery. Filter by domain/iwi works the same.

**What the marker doesn't do:**
- No restricted access. They can still propose, still get endorsed.
- No public shame. It's a *period* in someone's contribution timeline, not a stain.

### 4.5 Asymmetric endorsement of helpers

When a work publishes with collaborators, the work's creator **endorses
their collaborators** in the contribution lineage. Helpers earn their
standing by being **chosen by people who carry responsibility for the
outcome**. Not by being popular. Not by being vetted.

The cultural-review action (`recordCulturalReviewAction`) is extended to
also create an endorsement record per accepted collaborator when a release
reaches `cultural_review_status = approved`. This way, every collaborator
on an approved release gets a public, named endorsement by the work
creator — automatically, as part of the cultural sign-off.

### 4.6 Revocation is visible, contextualised

If a contributor's work was problematic:
- Endorsement gets `status = 'revoked'` with `revoked_reason` populated.
- The revocation stays on the public profile. It does not disappear.
- A profile with a revoked endorsement shows it: "Endorsement revoked
  2026-09-12: contributor subsequently contested pūrākau accuracy."

This makes the platform **honest about its own history** rather than
sanitising it. The funder-grade audit trail includes revocations.

### 4.7 Failure modes are surfaced, not hidden

- **Open tono never fulfilled** → visible on creator's profile as closed
  with reason. Future collaborators see "asked for help on X three times,
  never followed through" — soft signal, not a rating.
- **Proposal declined** → visible to proposer only, no public list of
  declines. (Rejection of help is private to avoid the chill effect.)
- **Withdrawn tono** → visible publicly with reason. "Creator withdrew
  tono: received help elsewhere."

### 4.8 No leaderboards. Discovery is relational.

Public listing of "top helpers" or "most endorsed" is **forbidden** in
the UI. Discovery works through:

1. **Profile-level filter** — "show me people who carry pūrākau
   knowledge of Taranaki."
2. **Work-anchored attribution** — "this waiata was endorsed by X, iwi Y."
3. **Reciprocal pairs** — "you and A have an open koha balance."

No one competes on a global score. Ever.

### 4.9 Layered defences against bad-faith `iwi_specific` access

A naive `iwi_specific` implementation ("anyone who types 'Taranaki' in
their iwi affiliation sees Taranaki tono") is exploitable. The platform
sets context; it cannot enforce cultural authority. But it can raise
the cost of bad faith. v1 ships four layered defences; v2 may add more.

**Layer 1 — Asymmetric visibility by contribution count.**

Accounts with `contribution_count < 3` can *see* `iwi_specific` tono,
but the tono creator sees a flag on every proposal:
"⚠ This proposal comes from an account that has not yet made 3
contributions." The creator is not blocked from accepting — but is
informed. Same pattern as the existing cultural-review "unestablished"
signals.

**Layer 2 — Two-step iwi claim with attested promotion.**

`iwi_affiliation` is split into two fields (see §3.6):

- `iwi_affiliation_claimed` — what the user typed (free text, immediate)
- `iwi_affiliation_attested` — promoted after a delay + signal

Promotion rules (any one of):
- 30 days since signup AND `contribution_count ≥ 1`, OR
- An attested member has given an `endorsement_type = 'verification'`
  row that mentions the iwi affiliation, OR
- A `kaitiaki_roopu` row exists in that iwi (named kaitiaki roster)

`iwi_specific` tono visibility checks `iwi_affiliation_attested` — NOT
the claimed set. The claimed set is shown on profile with a "claimed"
tag; the attested set is shown as plain iwi affiliation.

**Cost to bad-faith actor:** 30 days of legitimate activity, OR earning
endorsement from an attested member, OR joining the kaitiaki roster.
All real friction.

**Layer 3 — Soft rate-limit banner (displayed, not enforced in v1).**

Users with `contribution_count < 3` see a soft banner on the third
`iwi_specific` tono view in a calendar month: "You've viewed 2 of 3
iwi-specific tono this month." No server-side enforcement in v1; the
banner is enough to deter casual bad faith. v2 may enforce.

**Layer 4 — Kaitiaki visibility (already structurally present).**

Kaitiaki see the dashboard. Repeated off-pattern proposing surfaces
to kaitiaki attention through existing visibility patterns. No new
detection system is needed; the kaitiaki dashboard already aggregates
contributor activity for cultural review.

**The honest boundary:** even with all four layers, a determined
bad-actor who waits 30 days and does some legitimate work can see
iwi-specific tono. The platform is not and cannot be a cultural-
authority enforcer — it is a context-setter. The actual enforcement
happens iwi-side. The platform's job is to make the bad-faith path
expensive enough that it stops being the easy path.

---

## 5. Public surface vs dashboard surface

This is the explicit split we agreed through the conversation.

### 5.1 Public (the vitrine — `app/(public)/[locale]/`)

| Surface | Content | Why public |
|---|---|---|
| `/artist` index | Opted-in profiles | Already ships; filterable by knowledge area |
| `/artist/[id]` (new) | Full Kaikōrero profile: bio, knowledge areas, contribution lineage | The discovery layer |
| `/waiata/[slug]` (existing) | Add: endorsement ribbon above the fold, "with cultural guidance from X, iwi Y" | The cultural proof |
| `/kaitiakitanga` (existing) | Add: cross-link to Kaikōrero directory | Bridges the formal and informal |
| `/collaborations` (new) | Public list of *fulfilled* collaborations only (work + named collaborators) | Shows the system working |
| `/endorsements/[id]` (new, optional) | Public page for one endorsement, with full context | Verifiability |

**Forbidden on public pages:**
- Open tono list
- Pending proposals
- Unsettled koha balances
- "Seeking help" badges on works
- Anything that reads as transactional

### 5.2 Dashboard (the workshop — `app/(dashboard)/`)

| Route | Content |
|---|---|
| `/kaikorero/profile` (new) | Edit own bio, knowledge areas, availability, opt-in |
| `/kaikorero/discover` (new) | Browse other Kaikōrero by domain/iwi |
| `/tono` (new) | My tono: open / in conversation / fulfilled / closed |
| `/tono/new` (new) | Compose a new tono |
| `/tono/[id]` (new) | Tono detail: proposals, conversation, accept/decline, status |
| `/tono/inbox` (new) | Open tono I could respond to (filtered by my knowledge areas + iwi) |
| `/koha` (new) | Reciprocal balances: who I owe, who owes me, what for |
| `/endorsements/given` (new) | Endorsements I've given; revoke if needed |
| `/endorsements/received` (new) | Endorsements I've received; how they show publicly |

### 5.3 Cross-cutting

Every page must respect **i18n** — `en` + `mi` (the existing pattern). New
strings land in `src/locales/en.json` and `src/locales/mi.json`. UI labels
use the **reo glossary** (`docs/REO-GLOSSARY.md`) — e.g. "Kaikōrero" for
"cultural collaborator", "Tono" for "request", "Koha" for "reciprocal
gift".

Every server action returns a discriminated union (the `cultural-review.ts`
pattern). Errors inline, not redirects.

---

## 6. Notification layer (lightweight, no email dependency)

Notification table (already in scope from the dashboard audit):

```sql
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,  -- 'tono_proposal', 'tono_accepted', 'endorsement_received', 'koha_logged', 'endorsement_revoked'
  payload     jsonb not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
```

Notification triggers:
- New proposal on your tono → notification to tono creator
- Proposal accepted → notification to proposer
- Endorsement received → notification to recipient
- Endorsement revoked → notification to recipient (with reason)
- Tono fulfilled → notification to creator
- Koha logged against you → notification to recipient

**Email is deferred.** Until Resend is configured, notifications are
dashboard-only. The notification table is the source of truth; email is a
fanout later.

---

## 7. Build sequencing (4 weeks, shippable in slices)

This plan deliberately starts narrow. Each slice is shippable.

### Week 1 — Profile extensions + Knowledge Areas

1. Migration `0025_collaboration_marketplace.sql`: enums, `profile_knowledge_areas`, profile column additions, basic RLS
2. Server action `src/lib/actions/kaikorero-profile.ts`: edit bio, knowledge areas, opt-in flags
3. Dashboard `/kaikorero/profile` route (edit form)
4. Public `/artist/[id]` route (read-only kaikōrero profile)
5. Public `/artist` index: add filter by `knowledge_domain` and `scope_iwi`

**Ship gate:** creator can declare knowledge areas; visitor can filter by them.

### Week 2 — Endorsements

1. Migration `0026_endorsements.sql`: `endorsements` table, append-only-with-revocation trigger, RLS
2. Server action `src/lib/actions/endorsements.ts`: give / revoke
3. Cultural review action extended: on approval, auto-create endorsements for accepted collaborators
4. Public display on `/artist/[id]`: contribution lineage
5. Public display on `/waiata/[slug]`: endorsement ribbon
6. Notification: `endorsement_received`, `endorsement_revoked`

**Ship gate:** an approved release auto-endorses its collaborators; line shows on profile.

### Week 3 — Tono board

1. Migration `0027_tono.sql`: `tono`, `tono_proposals` tables, RLS
2. Server action `src/lib/actions/tono.ts`: create, propose, accept, decline, withdraw, close
3. Dashboard `/tono`, `/tono/new`, `/tono/[id]`, `/tono/inbox` routes
4. Discovery integration: `/artist/[id]` shows "currently seeking help on: [link]"
5. Notification: all tono events
6. **Public-facing rule enforced:** `/artist` index shows tono status as a small icon only when `status = 'fulfilled'` or `status = 'closed'`. No open tono badges on public surfaces.

**Ship gate:** A creator can post a tono, get proposals, accept one, and the work ends up in `fulfilled` state with the koha ledger recording the exchange.

### Week 4 — Koha ledger + reciprocal view

1. Migration `0028_koha_ledger.sql`: `koha_ledger` table, pair-balance view, append-only triggers
2. Server action `src/lib/actions/koha.ts`: log gift, log return, settle
3. Dashboard `/koha` route: pair-balance view, "open balances" list, settle flow
4. Auto-ledger on proposal acceptance: koha entry created automatically
5. Reciprocity nudge: dashboard banner when you have an open balance with someone you've collaborated with
6. Notification: `koha_logged`

**Ship gate:** Two creators who collaborated can see the reciprocal balance; either can settle with a free-text note.

### Deferred past week 4 (do not ship)

- Email fan-out (until Resend or equivalent is configured)
- Reciprocity-nudge email digests
- Public `/collaborations` index page
- CSV export of koha ledger for accounting
- Stripe integration for monetary koha (only if/when explicitly needed)

---

## 8. What we explicitly do NOT build

| Excluded | Why |
|---|---|
| **5-star ratings** | Transforms reciprocity into service-delivery. Kills the cultural integrity. |
| **Public leaderboards** | Same. |
| **Vetting/credentialing on signup** | Centralises cultural authority. Locks out emerging creators. |
| **"Verified from iwi X" badges** | Can't be done honestly. Identity as iwi member is attested over time, not certified. |
| **Gig-economy tone in UI** | "Jobs" / "tasks" / "rates per hour" language is forbidden. The product is kōrero tono + koha, not Upwork. |
| **Anonymous feedback** | Everything attributed. Even revocations show reason. |
| **Gamification (streaks, levels, badges)** | Cheapens the cultural signal. Whakapapa is not a game. |
| **Auto-matching AI** | "Here are 5 people who could help you" feels convenient but bypasses the relational discovery process. The filter UI is the matchmaker; the platform does not pre-select. |
| **Public profile on first signup** | `kaikorero_visible` defaults to `false`. Profile is opt-in, not opt-out. (Matches the existing `opted_in_public_directory` pattern.) |
| **Public endorsements without a work anchor** | Endorsements without a work are profile-level attestations. These exist (work_type = 'profile') but are de-emphasised in UI in favour of work-anchored ones. Profile-only endorsements should be rare and carry less weight in discovery. |

---

## 9. Migration files (numbered continuation)

| File | Contents |
|---|---|
| `0025_collaboration_marketplace.sql` | `knowledge_domain` enum, `profile_knowledge_areas` table, profile column additions |
| `0026_endorsements.sql` | `endorsement_type` + `endorsement_status` enums, `endorsements` table, revocation-only trigger |
| `0027_tono.sql` | `tono_status` + `tono_help_type` + `proposal_status` enums, `tono` + `tono_proposals` tables |
| `0028_koha_ledger.sql` | `koha_direction` + `koha_kind` enums, `koha_ledger` table, pair-balance view |
| `0029_notifications.sql` | `notifications` table (used by all of the above) |

Each migration is idempotent (`if not exists` on enums and tables). Each
applies to the existing Supabase instance without breaking current
functionality.

---

## 10. Test plan (TDD)

From the `nextjs-supabase-stack` patterns, the test list:

**Schema / RLS**
1. `profile_knowledge_areas`: insert with valid `(profile_id, domain, scope_iwi)` succeeds; duplicate fails.
2. `endorsements`: cannot endorse yourself (CHECK constraint).
3. `endorsements`: UPDATE that changes any non-revocation field raises.
4. `endorsements`: UPDATE that sets `status = 'revoked'` and `revoked_reason` succeeds.
5. `tono`: creator can update own tono; non-creator cannot (RLS).
6. `tono_proposals`: cannot have two proposals from the same proposer on one tono (UNIQUE).
7. `koha_ledger`: cannot update a row (deny_modification trigger).
8. `koha_ledger`: pair-exchanges view returns correct counts (a_to_b, b_to_a, not net balance) for a two-creator scenario; only attested/disputed entries are included.

**Business rules**
9. Creating a tono with `visibility = 'iwi_specific'` and `scope_iwi = 'Taranaki'` is invisible to a user whose `iwi_affiliation_attested` (NOT the claimed set) does not include 'Taranaki'.
10. Accepting a tono proposal creates a `koha_ledger` entry automatically, with `source = 'tono_acceptance'` and `status = 'attested'` (auto-attested because the underlying action is verified).
11. Cultural review approval auto-creates endorsements for each `split_participants` row where `profile_id IS NOT NULL`, and each such endorsement auto-creates a `koha_ledger` row with `source = 'cultural_review'`.
12. Revoking an endorsement sends a `notifications` row to the recipient.
13. Manual koha entry by creator A is invisible on profile until creator B attests; auto-derived entries are visible immediately.
14. After 30 days without attestation, a manual koha entry auto-archives (cron) and disappears from profile queries (still recoverable).

**UI integration**
15. `/artist/[id]` does not show open tono (only fulfilled/closed).
16. `/artist/[id]` shows `new_contributor` badge when `contribution_count < 3`.
17. `/koha` shows pair exchanges with two separate directional counts; never a "net balance" or "debt" framing.
18. Profile with `iwi_affiliation_claimed = ['Taranaki']` but `iwi_affiliation_attested = []` cannot see `iwi_specific` tono with `scope_iwi = 'Taranaki'`.

---

## 11. Funding-readiness notes

This system maps onto funder language 1:1:

- **Creative NZ** — "Māori-led platform enabling cultural collaboration across iwi"
- **Te Mātāwai** — directly addresses te reo revitalisation via `verify_reo` and `translate` tono types
- **Te Mana Taiao / CARE** — koha ledger is append-only; data sovereignty preserved
- **Local Contexts Hub** — endorsements carry the TK + BC labels that already integrate with the platform

The contribution lineage is the **outcomes dashboard** for cultural
collaboration: how many cross-iwi collaborations happened, what kinds of
help were exchanged, how the reciprocity balance settled. That's a
funder-grade metric.

---

## 12. Open questions (deferred)

These came up in conversation; not blocking, but flagged:

1. **Should the koha ledger be visible to iwi authorities?** Currently scoped to attested/disputed entries publicly + awaiting entries to the two parties + super_admin + kaitiaki. If Te Mātāwai asks for visibility, we'd need a new role (`funder_observer`?) with read-only access.
2. **Do we want to surface "this person mentored 12 emerging artists" as a special lineage pattern?** Tempting aggregation; conflicts with §4.3 specificity. Likely answer: no.
3. **Reciprocal nudge timing.** If A and B have an open exchange with no reciprocation for >90 days, should the platform nudge A? This crosses into engagement territory. Recommendation: keep the nudge user-triggered (you visit `/koha` and see the open reciprocity), never platform-pushed.
4. **Anonymous cultural review.** Some kaitiaki may want to review without their name public. Current schema requires `kaitiaki_id` on every cycle (already ships). If anonymous kaitiaki review is needed, that's a separate fork — not part of this plan.
5. **Self-attestation for `kind = 'feedback'` or `kind = 'introduction'`.** The current model requires recipient attestation for all manual entries. Some kinds (e.g. "B introduced me to C") might not have a clear recipient. v2 may carve these out.

---

## 13. Decisions explicitly NOT taken (and why)

These came up in design conversation and were declined. Documented here so
future contributors (or funders) don't re-litigate them.

### 13.1 No platform-granted cultural standing (Tohunga, Rangatira, etc.)

**Considered:** a "verified cultural authority" badge, surfaced by the
platform for users the system recognises as holding standing (e.g.
named kaitiaki, members of `kaitiaki_roopu`, or profiles with high
endorsement counts in a domain).

**Declined for three reasons:**

1. **Standing is community-held, not platform-issued.** Acknowledgement
   as Tohunga or Rangatira is conferred by iwi, hapū, or whānau — not
   by software. A platform badge implies the platform has standing to
   recognise standing it doesn't have.
2. **Small-pool pressure.** The current `kaitiaki_roopu` table has one
   row. A "verified cultural authority" feature would route every
   iwi-specific tono to that person. They become a single point of
   failure and burnout.
3. **Funder optics.** "Our algorithm recommends Tohunga-ranked creators"
   reads as a misrepresentation of the platform's role. The actual
   language is: "The platform records whakapapa; iwi decide authority."

**What we do instead:**

- The existing `kaitiakitanga` page already lists named kaitiaki with
  their declared terms. It does not recommend them as "best for X."
- Discovery is by filter (knowledge_domain + scope_iwi + endorsement
  count) — the user picks, not the platform.
- Standing emerges from the lineage itself. A profile with 12
  work-anchored endorsements of `kind = purakau, scope_iwi = Taranaki`
  is visibly credible. The platform doesn't add a badge; the lineage
  speaks.

**If a funder specifically asks about cultural-authority surfacing:**

Answer honestly: "Cultural authority is held by iwi and communities,
not by the platform. The platform records whakapapa through endorsements
and the existing kaitiaki roster. We do not rank cultural standing."

### 13.2 No public endorsements without a work anchor

**Considered:** profile-only endorsements (no work attached) as a way to
"vouch for" someone's general standing.

**Declined because:** unattested standing claims are exactly the abuse
vector §3.5's attestation model is designed to prevent. Work-anchored
endorsements have a verifiable referent; profile-only ones don't. The
schema allows them (`work_type = 'profile'`) but the UI de-emphasises
them and discovery filters weight them lower. If we ever want to remove
the path entirely, the schema change is small.

### 13.3 No aggregate counts on relational state

**Considered:** "47 endorsements received" or "+5 koha ahead" summaries
on profile pages — the standard pattern on professional networking
platforms.

**Declined because:** aggregates hide specificity and invite gaming.
A profile with 30 endorsements on `purakau / Taranaki` is meaningfully
different from one with 30 endorsements scattered across domains.
Showing a single count flattens that. The ban on aggregate counts is
in §4.3 and §11.

---

*End of plan. Schema is ready to write; sequencing is in
`COLLABORATION-MARKETPLACE-PHASES.md`; the cultural integrity holds.*
