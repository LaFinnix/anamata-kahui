-- =============================================================================
-- Anamata Kāhui — cultural governance + contact log migration
-- =============================================================================
-- Adds:
--   - `kaitiaki` role to profiles.role enum
--   - iwi_gates table (per-iwi/hapū authorisation, scope, expiry, revocation)
--   - consent_log (append-only audit trail)
--   - cultural_sensitivity enum + column on releases
--   - iwi_affiliation, te_reo_proficiency, preferred_language on profiles
--   - language_code + iwi_consent_id on releases
--   - kaitiaki_roopu (named kaitiaki, role, term)
--   - contact_enquiries (public form persistence)
--   - data_governance_log (Te Mana Raraunga CARE-aligned changelog)
--
-- Idempotent where possible — uses IF NOT EXISTS / DO blocks for repeated
-- runs in dev. Re-runnable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend profiles.role CHECK constraint — add `kaitiaki`
-- ---------------------------------------------------------------------------
-- profiles.role is `text` with a CHECK constraint (not a Postgres ENUM) in
-- 0001_initial_schema.sql, so we drop and recreate the constraint rather
-- than ALTER TYPE.
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'branch_admin', 'kaitiaki', 'artist', 'researcher', 'client'));

-- New columns on profiles
alter table public.profiles
  add column if not exists iwi_affiliation     text[]   default '{}',
  add column if not exists te_reo_proficiency  text
    check (te_reo_proficiency is null or te_reo_proficiency in
           ('none', 'basic', 'intermediate', 'advanced', 'first_language')),
  add column if not exists preferred_language  text     default 'en',
  add column if not exists region              text,
  add column if not exists opted_in_public_directory boolean default false,
  add column if not exists data_export_requested_at   timestamptz,
  add column if not exists data_deletion_requested_at timestamptz;

create index if not exists idx_profiles_iwi on public.profiles using gin (iwi_affiliation);

-- ---------------------------------------------------------------------------
-- 2. iwi_gates — per-iwi authorisation on content
-- ---------------------------------------------------------------------------
create table if not exists public.iwi_gates (
  id              uuid primary key default gen_random_uuid(),
  iwi_name        text not null,
  hapu_name       text,
  contact_name    text,
  contact_email   text,
  scope           text not null default 'public'
                    check (scope in ('public', 'iwi_only', 'hapu_only', 'restricted', 'tapu')),
  -- Polymorphic FK: a gate can apply to a release, a research_doc, a stem.
  applies_to_kind text not null check (applies_to_kind in ('release', 'research_doc', 'stem', 'artist', 'general')),
  applies_to_id   uuid,
  granted_at      timestamptz not null default now(),
  expires_at      timestamptz,
  revoked_at      timestamptz,
  revoked_reason  text,
  granted_by      uuid references public.profiles (id) on delete set null,
  notes           text
);

create index if not exists idx_iwi_gates_applies on public.iwi_gates (applies_to_kind, applies_to_id);
create index if not exists idx_iwi_gates_iwi on public.iwi_gates (iwi_name);

-- ---------------------------------------------------------------------------
-- 3. consent_log — append-only audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.consent_log (
  id          uuid primary key default gen_random_uuid(),
  iwi_gate_id uuid references public.iwi_gates (id) on delete set null,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null check (action in
              ('granted', 'amended', 'revoked', 'expired', 'requested_withdrawal', 'reviewed')),
  notes       text,
  at          timestamptz not null default now()
);

create index if not exists idx_consent_log_gate on public.consent_log (iwi_gate_id);
create index if not exists idx_consent_log_at on public.consent_log (at desc);

-- ---------------------------------------------------------------------------
-- 4. cultural_sensitivity enum + columns on releases + stems
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    create type public.cultural_sensitivity as enum
      ('open', 'attributed', 'kaitiaki_gated', 'tapu', 'restricted_iwi');
  exception
    when duplicate_object then null;
  end;
end$$;

alter table public.releases
  add column if not exists language_code    text default 'mi',
  add column if not exists iwi_consent_id   uuid references public.iwi_gates (id) on delete set null,
  add column if not exists cultural_sensitivity public.cultural_sensitivity default 'attributed',
  add column if not exists upc              text,
  add column if not exists isrc             text,
  add column if not exists parental_advisory text,
  add column if not exists territory_rights jsonb default '{}'::jsonb,
  add column if not exists distributors     jsonb default '[]'::jsonb;

-- Migrate the combined upc_isrc into separate columns if needed (best-effort)
update public.releases
  set
    upc  = case when upc_isrc like 'UPC:%'  then substring(upc_isrc from 5) else upc  end,
    isrc = case when upc_isrc like 'ISRC:%' then substring(upc_isrc from 6) else isrc end
  where upc is null and isrc is null and upc_isrc is not null;

alter table public.stems
  add column if not exists instrument        text,
  add column if not exists version           int default 1,
  add column if not exists license           text,
  add column if not exists cultural_sensitivity public.cultural_sensitivity default 'attributed';

-- ---------------------------------------------------------------------------
-- 5. kaitiaki_roopu — named kaitiaki with terms
-- ---------------------------------------------------------------------------
create table if not exists public.kaitiaki_roopu (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  scope           text not null check (scope in ('platform', 'branch', 'iwi', 'project')),
  branch_id       uuid references public.branches (id) on delete cascade,
  iwi_name        text,
  term_started_at timestamptz not null default now(),
  term_ends_at    timestamptz,
  voting_weight   numeric(3,2) default 1.0 check (voting_weight > 0 and voting_weight <= 1),
  is_active       boolean not null default true,
  notes           text
);

create index if not exists idx_kaitiaki_roopu_profile on public.kaitiaki_roopu (profile_id);
create index if not exists idx_kaitiaki_roopu_branch on public.kaitiaki_roopu (branch_id);

-- ---------------------------------------------------------------------------
-- 6. contact_enquiries — public form persistence
-- ---------------------------------------------------------------------------
create table if not exists public.contact_enquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  message     text not null,
  source      text default 'website_contact_form',
  replied_at  timestamptz,
  replied_by  uuid references public.profiles (id) on delete set null,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_contact_enquiries_created on public.contact_enquiries (created_at desc);

-- ---------------------------------------------------------------------------
-- 7. data_governance_log — public CARE-aligned changelog
-- ---------------------------------------------------------------------------
create table if not exists public.data_governance_log (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in
              ('policy', 'consent', 'incident', 'review', 'te_mana_raraunga')),
  title       text not null,
  body        text not null,
  effective_at timestamptz not null default now(),
  authored_by uuid references public.profiles (id) on delete set null,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_data_governance_log_effective on public.data_governance_log (effective_at desc);
create index if not exists idx_data_governance_log_published on public.data_governance_log (published, effective_at desc);

-- =============================================================================
-- RLS for new tables
-- =============================================================================

alter table public.iwi_gates           enable row level security;
alter table public.consent_log          enable row level security;
alter table public.kaitiaki_roopu      enable row level security;
alter table public.contact_enquiries   enable row level security;
alter table public.data_governance_log enable row level security;

-- iwi_gates: public-readable summary; writes only via super_admin or kaitiaki.
create policy "iwi_gates_select_public_summary"
  on public.iwi_gates for select
  using (true);

create policy "iwi_gates_write_kaitiaki"
  on public.iwi_gates for all
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'kaitiaki'
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'kaitiaki'
    )
  );

-- consent_log: read = same as iwi_gates, write = append only by kaitiaki+
create policy "consent_log_select_kaitiaki"
  on public.consent_log for select
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('kaitiaki', 'branch_admin')
    )
  );

create policy "consent_log_insert_kaitiaki"
  on public.consent_log for insert
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('kaitiaki', 'branch_admin')
    )
  );

-- No updates / deletes on consent_log (append-only).
create policy "consent_log_no_update"
  on public.consent_log for update using (false) with check (false);
create policy "consent_log_no_delete"
  on public.consent_log for delete using (false);

-- kaitiaki_roopu: public directory; super_admin writes
create policy "kaitiaki_roopu_select_public"
  on public.kaitiaki_roopu for select using (true);
create policy "kaitiaki_roopu_write_super"
  on public.kaitiaki_roopu for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- contact_enquiries: anyone can insert (anon form); only staff reads.
create policy "contact_enquiries_insert_anon"
  on public.contact_enquiries for insert
  with check (true);

create policy "contact_enquiries_select_staff"
  on public.contact_enquiries for select
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('branch_admin', 'kaitiaki')
    )
  );

-- data_governance_log: public can read published entries; super writes.
create policy "data_governance_log_select_published"
  on public.data_governance_log for select
  using (published = true or public.is_super_admin());

create policy "data_governance_log_write_super"
  on public.data_governance_log for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- =============================================================================
-- Storage buckets
-- =============================================================================
insert into storage.buckets (id, name, public)
values
  ('covers',   'covers',   true),
  ('press',    'press',    true),
  ('stems',    'stems',    false),
  ('research', 'research', false),
  ('media',    'media',    true)
on conflict (id) do nothing;

-- Storage policies — RLS on storage.objects governs per-object access.
-- These match the table-level access patterns in 0001_initial_schema.

-- covers: public read, branch member write
create policy "covers_public_read"
  on storage.objects for select
  using (bucket_id = 'covers');

create policy "covers_artist_write"
  on storage.objects for insert
  with check (
    bucket_id = 'covers'
    and auth.role() = 'authenticated'
  );

-- press: public read
create policy "press_public_read"
  on storage.objects for select
  using (bucket_id = 'press');

-- stems: branch member read, lead/admin write
create policy "stems_branch_read"
  on storage.objects for select
  using (
    bucket_id = 'stems'
    and auth.role() = 'authenticated'
  );

create policy "stems_branch_write"
  on storage.objects for insert
  with check (
    bucket_id = 'stems'
    and auth.role() = 'authenticated'
  );

-- research: researcher read/write, public read for published items
create policy "research_authenticated_read"
  on storage.objects for select
  using (
    bucket_id = 'research'
    and auth.role() = 'authenticated'
  );

-- media: public read (gallery assets)
create policy "media_public_read"
  on storage.objects for select
  using (bucket_id = 'media');
