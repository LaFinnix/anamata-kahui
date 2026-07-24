-- =============================================================================
-- Anamata Kāhui — endorsements primitive
-- =============================================================================
-- Implements docs/COLLABORATION-MARKETPLACE-PLAN.md §3.2:
--   1. endorsement_type enum (7 values; shape of the endorsement)
--   2. endorsement_status enum (3 values: active / revoked / superseded)
--   3. endorsements table — work-anchored, revocable, append-only at the
--      row level but with a specific revocation exception (status /
--      revoked_reason / revoked_at may change).
--   4. endorsements_allow_revocation_only() trigger — enforces that only
--      revocation fields are mutable; everything else is append-only.
--   5. RLS — read public (lineage is the value), insert by self, update
--      only via revocation flow.
--
-- Pairs with: 0025_collaboration_marketplace.sql, 0028_notifications.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'endorsement_type') then
    create type public.endorsement_type as enum (
      'source_of_knowledge',   -- I taught you this; the pūrākau is mine
      'cultural_endorsement',  -- I vouch for the cultural standing of this work
      'co_creator',            -- I contributed to creating this
      'verification',          -- I verified a factual claim (e.g. place name)
      'translation',           -- I translated / verified reo content
      'blessing',              -- formal blessing, rarely given
      'mentorship'             -- I mentored the creator on this work
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'endorsement_status') then
    create type public.endorsement_status as enum (
      'active',
      'revoked',               -- visible on profile with reason
      'superseded'             -- replaced by a newer endorsement on the same work
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'endorsement_work_type') then
    create type public.endorsement_work_type as enum (
      'release',
      'lyric',
      'stem',
      'profile'                -- general endorsement, not work-anchored
    );
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2. endorsements table
-- ---------------------------------------------------------------------------
create table if not exists public.endorsements (
  id               uuid primary key default gen_random_uuid(),
  -- Who is being endorsed
  recipient_id     uuid not null references public.profiles(id) on delete cascade,
  -- Who is giving the endorsement (always auth.uid() in normal flow)
  endorser_id      uuid not null references public.profiles(id) on delete restrict,
  -- What is being endorsed
  work_id          uuid references public.releases(id) on delete set null,
  work_type        public.endorsement_work_type not null default 'release',
  work_ref         text,                -- free-text path/identifier for non-release work
  -- The shape of the endorsement
  endorsement_type public.endorsement_type not null,
  -- Scoped knowledge domain (FK-like reference to the enum, no table join needed)
  knowledge_domain public.knowledge_domain,
  -- Scoped iwi / region if the endorsement is iwi-specific
  scope_iwi        text,
  scope_region     text,
  -- Free-text notes — what specifically is being endorsed, in the endorser's words
  notes            text not null check (length(notes) > 0 and length(notes) <= 2000),
  -- Revocation — never delete, always record
  status           public.endorsement_status not null default 'active',
  revoked_reason   text,
  revoked_at       timestamptz,
  -- Supersession — if a new endorsement supersedes this one
  superseded_by    uuid references public.endorsements(id),
  -- Timestamps
  created_at       timestamptz not null default now(),
  -- Constraint: cannot endorse yourself
  check (endorser_id <> recipient_id),
  -- Either work_id is set OR work_type = 'profile' (the only work_type that
  -- does not require a work_id anchor)
  check (
    work_id is not null
    or work_type = 'profile'
    or work_ref is not null
  )
);

create index if not exists idx_endorsements_recipient on public.endorsements (recipient_id);
create index if not exists idx_endorsements_endorser on public.endorsements (endorser_id);
create index if not exists idx_endorsements_work on public.endorsements (work_id);
create index if not exists idx_endorsements_domain on public.endorsements (knowledge_domain);
create index if not exists idx_endorsements_status on public.endorsements (status);

-- ---------------------------------------------------------------------------
-- 3. Revocation-only trigger — allows status / revoked_reason / revoked_at
--    to change; blocks all other mutations.
-- ---------------------------------------------------------------------------
-- Defined as a separate function (not reusing deny_modification) because
-- the standard deny_modification function blocks ALL updates. Endorsements
-- have one explicit mutability: revocation. To revoke, an UPDATE must be
-- allowed — just a narrow one.
create or replace function public.endorsements_allow_revocation_only()
returns trigger
language plpgsql
as $$
declare
  changed_non_revoke_fields boolean;
begin
  -- Allow revocation: only status, revoked_reason, revoked_at may change.
  -- superseded_by may also be set when a new endorsement supersedes this one.
  changed_non_revoke_fields :=
    new.recipient_id     is distinct from old.recipient_id or
    new.endorser_id      is distinct from old.endorser_id or
    new.work_id          is distinct from old.work_id or
    new.work_type        is distinct from old.work_type or
    new.work_ref         is distinct from old.work_ref or
    new.endorsement_type is distinct from old.endorsement_type or
    new.knowledge_domain is distinct from old.knowledge_domain or
    new.scope_iwi        is distinct from old.scope_iwi or
    new.scope_region     is distinct from old.scope_region or
    new.notes            is distinct from old.notes;

  if changed_non_revoke_fields then
    raise exception 'endorsements are append-only — only status, revoked_reason, revoked_at, superseded_by may change'
      using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end$$;

drop trigger if exists endorsements_no_mutation on public.endorsements;
create trigger endorsements_no_mutation
  before update on public.endorsements
  for each row execute function public.endorsements_allow_revocation_only();

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table public.endorsements enable row level security;

-- Read: public — the lineage is the value of the system.
drop policy if exists endorsements_read_public on public.endorsements;
create policy endorsements_read_public
  on public.endorsements for select
  using (true);

-- Insert: only the endorser themselves; super_admin.
drop policy if exists endorsements_write_self on public.endorsements;
create policy endorsements_write_self
  on public.endorsements for insert
  with check (
    endorser_id = auth.uid()
    or public.is_super_admin()
  );

-- Update: only via the revocation flow — endorser themselves or super_admin.
drop policy if exists endorsements_update_self on public.endorsements;
create policy endorsements_update_self
  on public.endorsements for update
  using (
    endorser_id = auth.uid()
    or public.is_super_admin()
  );
-- The trigger above additionally restricts WHICH columns may change.

-- Delete: forbidden entirely. Revocations are status changes, not deletions.
drop policy if exists endorsements_no_delete on public.endorsements;
create policy endorsements_no_delete
  on public.endorsements for delete
  using (false);
