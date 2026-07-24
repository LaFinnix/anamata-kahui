-- =============================================================================
-- 0032 — Artist Roster (signed-artist system, phase 2)
-- =============================================================================
-- Single source of truth for "is this artist signed to this branch's roster?"
--
-- Design (per signed-artist system plan, 2026-08):
--   - An artist can have one row per (profile_id, branch_id). Multi-branch:
--     the same artist can be on records + research rosters if the work
--     genuinely crosses branches.
--   - At most ONE active row per (profile_id, branch_id) at any time.
--     Statuses prospect / paused / departed can co-exist for historical
--     reasons (e.g., an artist was active, paused, then re-activated
--     after a gap — the previous active row stays as a history row).
--   - Public visibility is dual-flag (same pattern as kaikōrero
--     profiles): on_roster_publicly + opted_in_public BOTH must be true.
--   - The roster row carries its own audit trail: created_by,
--     created_at, last_modified_at, status_changed_at, status_changed_by,
--     departed_at, departed_reason.
--
-- This migration only creates the table + enums + RLS + helpers. The
-- contracts, legal_policies, and demos tables come in later migrations
-- (0033, 0034, 0035).

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

do $enum_block$ begin
  if not exists (select 1 from pg_type where typname = 'artist_roster_status') then
    create type public.artist_roster_status
      as enum ('prospect', 'active', 'paused', 'departed');
  end if;
end $enum_block$;

-- ---------------------------------------------------------------------------
-- 2. The table
-- ---------------------------------------------------------------------------

create table if not exists public.artist_roster (
  id                  uuid primary key default gen_random_uuid(),

  -- Who and which branch
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  branch_id           uuid not null references public.branches(id) on delete restrict,

  -- Roster membership state
  status              public.artist_roster_status not null default 'prospect',

  -- Public visibility (dual flag, same pattern as kaikōrero profiles)
  on_roster_publicly  boolean not null default false,
  opted_in_public     boolean not null default false,

  -- Optional: short bio/role on this roster (e.g. "Lead vocalist, Anamata Records")
  role_summary        text,

  -- Audit trail
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  last_modified_by    uuid references public.profiles(id) on delete set null,
  last_modified_at    timestamptz not null default now(),

  -- Status-change tracking
  status_changed_by   uuid references public.profiles(id) on delete set null,
  status_changed_at   timestamptz not null default now(),

  -- Departure specifics (only set when status='departed')
  departed_at         timestamptz,
  departed_reason     text,

  -- Per-row notes (admin-only, internal)
  internal_notes      text

  -- A partial unique index (created below) enforces
  -- "at most one ACTIVE row per (profile, branch)".
);
create unique index if not exists artist_roster_active_unique
  on public.artist_roster (profile_id, branch_id)
  where (status = 'active');

-- Helpful indexes for the common queries
create index if not exists idx_artist_roster_profile on public.artist_roster (profile_id);
create index if not exists idx_artist_roster_branch on public.artist_roster (branch_id);
create index if not exists idx_artist_roster_status on public.artist_roster (status);
create index if not exists idx_artist_roster_public
  on public.artist_roster (profile_id, branch_id)
  where (on_roster_publicly = true and opted_in_public = true);

-- Auto-bump last_modified_at on UPDATE
create or replace function public.artist_roster_touch()
returns trigger
language plpgsql
as $$
begin
  new.last_modified_at := now();
  return new;
end;
$$;

drop trigger if exists trg_artist_roster_touch on public.artist_roster;
create trigger trg_artist_roster_touch
  before update on public.artist_roster
  for each row execute function public.artist_roster_touch();

-- ---------------------------------------------------------------------------
-- 3. Helper functions (defined BEFORE RLS so the policies can reference them)
-- ---------------------------------------------------------------------------

-- is_admin: the user is a super_admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

-- is_branch_admin: the user is a branch_admin of the given branch
create or replace function public.is_branch_admin(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_branches ub
    join public.profiles p on p.id = ub.user_id
    where p.id = auth.uid()
      and ub.branch_id = p_branch_id
      and p.role in ('branch_admin', 'super_admin')
      and ub.role in ('admin', 'editor')
  );
$$;

-- is_on_roster: the given profile is on the given branch's roster (active)
create or replace function public.is_on_roster(p_profile_id uuid, p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.artist_roster
    where profile_id = p_profile_id
      and branch_id = p_branch_id
      and status = 'active'
  );
$$;

-- Grant execute to authenticated
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_branch_admin(uuid) to authenticated;
grant execute on function public.is_on_roster(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

alter table public.artist_roster enable row level security;

-- Public read: only rows where BOTH public flags are true AND status='active'
drop policy if exists "artist_roster_public_read" on public.artist_roster;
create policy "artist_roster_public_read"
  on public.artist_roster
  for select
  using (
    on_roster_publicly = true
    and opted_in_public = true
    and status = 'active'
  );

-- Artist read: their own rows (any status)
drop policy if exists "artist_roster_self_read" on public.artist_roster;
create policy "artist_roster_self_read"
  on public.artist_roster
  for select
  using (profile_id = auth.uid());

-- Admin read: all rows (super_admin + branch_admin)
drop policy if exists "artist_roster_admin_read" on public.artist_roster;
create policy "artist_roster_admin_read"
  on public.artist_roster
  for select
  using (
    public.is_admin()
    or public.is_branch_admin(branch_id)
  );

-- Admin write: same as admin read
drop policy if exists "artist_roster_admin_write" on public.artist_roster;
create policy "artist_roster_admin_write"
  on public.artist_roster
  for all
  using (
    public.is_admin()
    or public.is_branch_admin(branch_id)
  )
  with check (
    public.is_admin()
    or public.is_branch_admin(branch_id)
  );
