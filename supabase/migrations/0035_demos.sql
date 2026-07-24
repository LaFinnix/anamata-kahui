-- =============================================================================
-- 0035 — Demos (signed-artist system, phase 7)
-- =============================================================================
-- Pre-release work-in-progress files uploaded by artists. The cultural
-- review pipeline decides whether a demo can progress to a full release.
--
-- Design (per signed-artist system plan):
--   - Demos are private to the artist + admins until promoted
--   - A demo carries a status that walks the cultural-review pipeline
--   - A demo, once approved, can be promoted — at that point a release
--     row is created (in a later phase) and demos.release_id is set
--   - rejected is terminal (artist can upload a new demo)
--
-- This migration only creates the table + enums + RLS. The actions layer
-- (upload, submit-for-review, approve, reject, promote) is in
-- src/lib/demos/actions.ts. The release creation (when a demo is
-- promoted) is a future phase.

-- ---------------------------------------------------------------------------
-- 1. Enum
-- ---------------------------------------------------------------------------

do $demo_status$ begin
  if not exists (select 1 from pg_type where typname = 'demo_status') then
    create type public.demo_status
      as enum ('draft', 'pending_review', 'approved', 'rejected', 'promoted');
  end if;
end $demo_status$;

-- ---------------------------------------------------------------------------
-- 2. The table
-- ---------------------------------------------------------------------------

create table if not exists public.demos (
  id                    uuid primary key default gen_random_uuid(),

  -- Link to the artist's roster row (which holds profile + branch)
  artist_roster_id      uuid not null references public.artist_roster (id) on delete cascade,

  -- Demo metadata
  title                 text not null,
  description           text,

  -- File info (storage layer is managed outside the DB; this stores
  -- the path + metadata so the demo is discoverable)
  file_path             text not null,
  file_mime             text not null,
  file_size_bytes       bigint not null check (file_size_bytes >= 0),
  file_duration_seconds integer check (file_duration_seconds is null or file_duration_seconds >= 0),

  -- Pipeline status
  status                public.demo_status not null default 'draft',

  -- Cultural review (kaitiaki)
  reviewed_by           uuid references public.profiles (id) on delete set null,
  reviewed_at           timestamptz,
  review_notes          text,

  -- Link to the release this demo was promoted to (set by a later
  -- phase when we add the release creation flow)
  release_id            uuid,

  -- Audit
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  last_modified_by      uuid references public.profiles (id) on delete set null,
  last_modified_at      timestamptz not null default now()
);

create index if not exists idx_demos_artist_roster
  on public.demos (artist_roster_id);
create index if not exists idx_demos_status
  on public.demos (status);
create index if not exists idx_demos_created
  on public.demos (created_at desc);

-- Auto-bump last_modified_at on UPDATE
create or replace function public.demos_touch()
returns trigger
language plpgsql
as $$
begin
  new.last_modified_at := now();
  return new;
end;
$$;

drop trigger if exists trg_demos_touch on public.demos;
create trigger trg_demos_touch
  before update on public.demos
  for each row execute function public.demos_touch();

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

alter table public.demos enable row level security;

-- Artist: read/write own demos
drop policy if exists "demos_self_read" on public.demos;
create policy "demos_self_read"
  on public.demos
  for select
  using (
    exists (
      select 1
      from public.artist_roster r
      where r.id = demos.artist_roster_id
        and r.profile_id = auth.uid()
    )
  );

drop policy if exists "demos_self_write" on public.demos;
create policy "demos_self_write"
  on public.demos
  for all
  using (
    exists (
      select 1
      from public.artist_roster r
      where r.id = demos.artist_roster_id
        and r.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.artist_roster r
      where r.id = demos.artist_roster_id
        and r.profile_id = auth.uid()
    )
  );

drop policy if exists "demos_admin_read" on public.demos;
create policy "demos_admin_read"
  on public.demos
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.artist_roster r
      where r.id = demos.artist_roster_id
        and public.is_branch_admin(r.branch_id)
    )
  );

drop policy if exists "demos_admin_write" on public.demos;
create policy "demos_admin_write"
  on public.demos
  for all
  using (
    public.is_admin()
    or exists (
      select 1
      from public.artist_roster r
      where r.id = demos.artist_roster_id
        and public.is_branch_admin(r.branch_id)
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.artist_roster r
      where r.id = demos.artist_roster_id
        and public.is_branch_admin(r.branch_id)
    )
  );
