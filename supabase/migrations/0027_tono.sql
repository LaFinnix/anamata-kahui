-- =============================================================================
-- Anamata Kāhui — tono (help-request) board
-- =============================================================================
-- Implements docs/COLLABORATION-MARKETPLACE-PLAN.md §3.3, §3.4:
--   1. tono_status enum (5 values)
--   2. tono_help_type enum (10 values)
--   3. tono_visibility enum (3 values: open / invited / iwi_specific)
--   4. proposal_status enum (4 values)
--   5. tono table — help requests, visibility-tiered
--   6. tono_proposals table — responses with proposed koha
--   7. RLS — read scoped by visibility tier; write scoped to creator/proposer
--
-- The visibility filter logic itself is implemented in the application
-- layer (src/lib/queries/tono.ts) because the iwi_specific filter depends
-- on the caller's iwi_affiliation_attested, which is a per-request check
-- that RLS cannot cleanly express. RLS still ensures creators always see
-- their own tono at any visibility.
--
-- Pairs with: 0025_collaboration_marketplace.sql, 0028_notifications.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tono_status') then
    create type public.tono_status as enum (
      'open',             -- seeking responses
      'in_conversation',  -- a proposal has been accepted; in progress
      'fulfilled',        -- work landed; ended well
      'closed',           -- creator closed without fulfilling (still public)
      'withdrawn'         -- creator withdrew the request
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'tono_help_type') then
    create type public.tono_help_type as enum (
      'verify_narrative', -- need someone to verify a pūrākau reference
      'verify_reo',       -- need te reo verification
      'co_create',        -- looking for a collaborator
      'review_cultural',  -- need cultural review (formal kaitiaki role)
      'translate',        -- need translation
      'compose',          -- need a composer / arranger
      'produce',          -- need a producer
      'mentor',           -- looking for mentorship on a work
      'feedback',         -- want creative feedback
      'place_name',       -- need verification of place names
      'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'tono_visibility') then
    create type public.tono_visibility as enum (
      'open',           -- anyone can see and propose
      'invited',        -- only named invitees (per tono_invitees junction)
      'iwi_specific'    -- only people whose iwi_affiliation_attested matches scope_iwi
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'proposal_status') then
    create type public.proposal_status as enum (
      'pending',       -- awaiting creator response
      'accepted',      -- creator accepted; relationship begins
      'declined',      -- creator declined
      'withdrawn'      -- proposer withdrew before creator responded
    );
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2. tono table
-- ---------------------------------------------------------------------------
create table if not exists public.tono (
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
  koha_is_monetary boolean not null default false,  -- explicit flag, never inferred
  -- Visibility tier
  visibility      public.tono_visibility not null default 'open',
  -- Status
  status          public.tono_status not null default 'open',
  fulfilled_by    uuid references public.profiles(id),
  fulfilled_at    timestamptz,
  closed_at       timestamptz,
  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  expires_at      timestamptz,
  -- Constraints
  -- iwi_specific requires scope_iwi to be set
  check (
    visibility <> 'iwi_specific' or scope_iwi is not null
  )
);

create index if not exists idx_tono_creator on public.tono (creator_id);
create index if not exists idx_tono_work on public.tono (work_id);
create index if not exists idx_tono_status on public.tono (status);
create index if not exists idx_tono_help_type on public.tono (help_type);
create index if not exists idx_tono_knowledge_domain on public.tono (knowledge_domain);
create index if not exists idx_tono_scope_iwi on public.tono (scope_iwi);
create index if not exists idx_tono_visibility on public.tono (visibility);

-- updated_at trigger (uses existing helper)
drop trigger if exists tono_set_updated_at on public.tono;
create trigger tono_set_updated_at
  before update on public.tono
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. tono_invitees junction (for visibility = 'invited')
-- ---------------------------------------------------------------------------
-- Keeps the invited-tone invitation list explicit. The application layer
-- joins this when filtering invited tono for a given user.
create table if not exists public.tono_invitees (
  id          uuid primary key default gen_random_uuid(),
  tono_id     uuid not null references public.tono(id) on delete cascade,
  invitee_id  uuid not null references public.profiles(id) on delete cascade,
  invited_at  timestamptz not null default now(),
  unique (tono_id, invitee_id)
);

create index if not exists idx_tono_invitees_invitee on public.tono_invitees (invitee_id);

-- ---------------------------------------------------------------------------
-- 4. tono_proposals table — responses with proposed koha
-- ---------------------------------------------------------------------------
create table if not exists public.tono_proposals (
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
  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- One proposal per (tono, proposer)
  unique (tono_id, proposer_id)
);

create index if not exists idx_proposals_tono on public.tono_proposals (tono_id);
create index if not exists idx_proposals_proposer on public.tono_proposals (proposer_id);
create index if not exists idx_proposals_status on public.tono_proposals (status);

drop trigger if exists tono_proposals_set_updated_at on public.tono_proposals;
create trigger tono_proposals_set_updated_at
  before update on public.tono_proposals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table public.tono enable row level security;
alter table public.tono_invitees enable row level security;
alter table public.tono_proposals enable row level security;

-- ---------- tono ----------
-- Read: visibility-aware. The strictest rule:
--   - Creators always see their own tono (any visibility, any status)
--   - Other users see tono whose visibility filter passes the application-layer
--     check. RLS does the coarse gating; the application does the fine.
--   - For coarse gating, we allow:
--     - tono where visibility = 'open' AND status IN ('open','in_conversation','fulfilled','closed','withdrawn')
--     - Actually: open tono (status='open') with visibility='open' are visible to all.
--     - Fulfilled/closed tono are visible to all (resolved outcomes are public).
--     - visibility='invited' OR 'iwi_specific' is gated by the application
--       layer (uses auth.uid() to filter). RLS cannot express "call this
--       function and check the result against auth.uid()'s profile row"
--       cleanly, so we let those through to the application.
drop policy if exists tono_read on public.tono;
create policy tono_read
  on public.tono for select
  using (
    -- Creator always sees their own
    creator_id = auth.uid()
    -- Super_admin sees all
    or public.is_super_admin()
    -- Anyone sees open/resolved tono
    or (
      visibility = 'open'
      and status in ('open', 'fulfilled', 'closed', 'withdrawn')
    )
    -- Invited/iwi_specific tono: passed through to the application layer,
    -- which applies the per-user filter. RLS still gates by branch and role.
    or (
      visibility in ('invited', 'iwi_specific')
      and (
        -- Invited: must be in tono_invitees for this tono
        (visibility = 'invited'
         and exists (
           select 1 from public.tono_invitees ti
           where ti.tono_id = tono.id and ti.invitee_id = auth.uid()
         ))
        -- iwi_specific: must have scope_iwi in the user's attested set.
        -- Uses unnest() to expand the text[] column into a set of rows, so
        -- ANY (SELECT ...) is well-typed and matches scope_iwi against
        -- each attested iwi. Equivalent to scope_iwi = any(iwi_affiliation_attested)
        -- but expressed in a form that the planner can reason about cleanly.
        or (visibility = 'iwi_specific'
            and scope_iwi is not null
            and scope_iwi = any (
              select unnest(iwi_affiliation_attested)
              from public.profiles
              where id = auth.uid()
            ))
      )
    )
    -- Fulfilled tono by any visibility are public (resolved outcomes surface)
    or status in ('fulfilled', 'closed', 'withdrawn')
  );

-- Insert: creator_id must be auth.uid(); super_admin can insert on behalf.
drop policy if exists tono_write on public.tono;
create policy tono_write
  on public.tono for insert
  with check (creator_id = auth.uid() or public.is_super_admin());

-- Update: only the creator or super_admin can update their tono.
drop policy if exists tono_update on public.tono;
create policy tono_update
  on public.tono for update
  using (creator_id = auth.uid() or public.is_super_admin())
  with check (creator_id = auth.uid() or public.is_super_admin());

-- Delete: forbidden. Status changes handle closure.
drop policy if exists tono_no_delete on public.tono;
create policy tono_no_delete
  on public.tono for delete
  using (false);

-- ---------- tono_invitees ----------
-- Read: visible to the tono creator + the invitee themselves + super_admin
drop policy if exists tono_invitees_read on public.tono_invitees;
create policy tono_invitees_read
  on public.tono_invitees for select
  using (
    invitee_id = auth.uid()
    or exists (select 1 from public.tono t where t.id = tono_invitees.tono_id and t.creator_id = auth.uid())
    or public.is_super_admin()
  );

-- Write: only the tono creator can invite; super_admin
drop policy if exists tono_invitees_write on public.tono_invitees;
create policy tono_invitees_write
  on public.tono_invitees for insert
  with check (
    exists (select 1 from public.tono t where t.id = tono_invitees.tono_id and t.creator_id = auth.uid())
    or public.is_super_admin()
  );

-- ---------- tono_proposals ----------
-- Read: visible to the proposer + the tono creator + super_admin
drop policy if exists proposals_read on public.tono_proposals;
create policy proposals_read
  on public.tono_proposals for select
  using (
    proposer_id = auth.uid()
    or exists (select 1 from public.tono t where t.id = tono_proposals.tono_id and t.creator_id = auth.uid())
    or public.is_super_admin()
  );

-- Write: only the proposer can create (proposer_id = auth.uid())
drop policy if exists proposals_write on public.tono_proposals;
create policy proposals_write
  on public.tono_proposals for insert
  with check (proposer_id = auth.uid() or public.is_super_admin());

-- Update: proposer can withdraw; tono creator can accept/decline; super_admin
drop policy if exists proposals_update on public.tono_proposals;
create policy proposals_update
  on public.tono_proposals for update
  using (
    proposer_id = auth.uid()
    or exists (select 1 from public.tono t where t.id = tono_proposals.tono_id and t.creator_id = auth.uid())
    or public.is_super_admin()
  );
