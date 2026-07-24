-- =============================================================================
-- Anamata Kāhui — collaboration marketplace foundations
-- =============================================================================
-- Implements docs/COLLABORATION-MARKETPLACE-PLAN.md §3.1, §3.6, §4.9:
--   1. knowledge_domain enum (15 values; cultural-knowledge self-declaration)
--   2. profile_knowledge_areas table (a creator's declared knowledge + scope)
--   3. profiles column extensions for Kaikōrero discovery
--   4. iwi_affiliation split into claimed + attested (Layer 2 of §4.9 defence)
--   5. profiles.role CHECK extended to include 'kaitiaki'
--   6. is_kaitiaki() helper function for RLS
--
-- Pairs with: 0026_endorsements.sql, 0027_tono.sql, 0028_notifications.sql
-- All migrations are additive and idempotent (if not exists / create or replace).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. knowledge_domain enum
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'knowledge_domain') then
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
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2. profiles.role CHECK extended to include 'kaitiaki'
-- ---------------------------------------------------------------------------
-- Existing constraint from 0001_initial_schema.sql only allows
-- ('super_admin', 'branch_admin', 'artist', 'researcher', 'client').
-- The cultural-review action in src/lib/actions/cultural-review.ts already
-- references role='kaitiaki', but DB would reject any such insert/update.
-- This migration makes the schema match the code.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
    check (role in ('super_admin', 'branch_admin', 'artist', 'researcher', 'client', 'kaitiaki'));

-- ---------------------------------------------------------------------------
-- 3. is_kaitiaki() helper — used by RLS policies across the collaboration
--    marketplace (e.g. koha_ledger visibility per §3.5)
-- ---------------------------------------------------------------------------
create or replace function public.is_kaitiaki()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'kaitiaki'
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. Profile column extensions — Kaikōrero discovery
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists kaikorero_bio text,
  add column if not exists kaikorero_visible boolean not null default false,
  add column if not exists available_for_tono boolean not null default true,
  add column if not exists contribution_count integer not null default 0,
  -- Iwi affiliation split per PLAN §4.9 Layer 2.
  -- The original iwi_affiliation column is preserved as a free-text input
  -- (kept for backward compatibility with existing seed data and the public
  -- directory). The two new columns track the claim/attestation split.
  -- iwi_specific tono visibility checks iwi_affiliation_attested.
  add column if not exists iwi_affiliation_claimed text[] default '{}',
  add column if not exists iwi_affiliation_attested text[] default '{}';

-- GIN indexes for fast array overlap queries (used by tono visibility filter)
create index if not exists idx_profiles_iwi_attested
  on public.profiles using gin (iwi_affiliation_attested);

-- contribution_count index — used by the "new contributor" badge query
create index if not exists idx_profiles_contribution_count
  on public.profiles (contribution_count);

-- ---------------------------------------------------------------------------
-- 5. profile_knowledge_areas — self-declared cultural-knowledge domains
-- ---------------------------------------------------------------------------
-- Anyone can declare anything. Attestation deepens when endorsements land.
-- A profile with 12 endorsements against purakau/Ngāti Porou is visibly
-- more credible than one with 0 — without the platform judging either.
create table if not exists public.profile_knowledge_areas (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  domain        public.knowledge_domain not null,
  -- Optional scoping: is this knowledge iwi-specific? If so, which iwi?
  scope_iwi     text,
  scope_region  text,
  attested_at   timestamptz not null default now(),
  -- A creator can declare a (domain, scope_iwi, scope_region) tuple once.
  -- Updating/duplicating is intentional friction.
  unique (profile_id, domain, scope_iwi, scope_region)
);

create index if not exists idx_pka_profile on public.profile_knowledge_areas (profile_id);
create index if not exists idx_pka_domain on public.profile_knowledge_areas (domain);
create index if not exists idx_pka_scope_iwi on public.profile_knowledge_areas (scope_iwi);

alter table public.profile_knowledge_areas enable row level security;

-- Read: public — this IS the discovery layer.
drop policy if exists pka_read_public on public.profile_knowledge_areas;
create policy pka_read_public
  on public.profile_knowledge_areas for select
  using (true);

-- Write: own profile only; super_admin.
drop policy if exists pka_write_self on public.profile_knowledge_areas;
create policy pka_write_self
  on public.profile_knowledge_areas for insert
  with check (profile_id = auth.uid() or public.is_super_admin());

drop policy if exists pka_update_self on public.profile_knowledge_areas;
create policy pka_update_self
  on public.profile_knowledge_areas for update
  using (profile_id = auth.uid() or public.is_super_admin());

drop policy if exists pka_delete_self on public.profile_knowledge_areas;
create policy pka_delete_self
  on public.profile_knowledge_areas for delete
  using (profile_id = auth.uid() or public.is_super_admin());
