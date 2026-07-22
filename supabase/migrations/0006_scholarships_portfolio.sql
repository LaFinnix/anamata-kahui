-- =============================================================================
-- Anamata Kāhui — scholarships portfolio
-- =============================================================================
-- Documents scholarship programmes Anamata researchers have engaged with
-- (past, present, future). Captures programme metadata, our engagements,
-- and named recipients. Every programme row links to a research output
-- when applicable.
--
-- Idempotent: re-runnable via supabase db push.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. scholarship_programmes — the funder/programme itself
-- ---------------------------------------------------------------------------
create table if not exists public.scholarship_programmes (
  id              uuid primary key default gen_random_uuid(),
  -- Stable identifier e.g. 'pmsa', 'asia-nz-foundation', 'royal-society-tawhia'
  slug            text unique not null,
  name            text not null,
  host_country    text,                          -- 'Asia', 'Latin America', 'Global', 'NZ'
  destination    text,                          -- specific country if singular ('Japan')
  status          text not null default 'active'
                    check (status in ('active', 'paused', 'discontinued', 'archived')),
  amount_text     text,                          -- human-readable ("$470/week Asia living")
  amount_typical_nzd int,                       -- typical annual amount for sort/filter
  duration_text   text,                          -- human-readable ("6 weeks to 2 years")
  duration_weeks_min int,
  duration_weeks_max int,
  eligibility_summary text,
  selection_criteria text,
  vision_matauranga boolean default false,      -- explicit VM alignment?
  maori_pasifika_priority boolean default false, -- explicit M/P priority?
  url             text,
  notes           text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_scholarship_programmes_status on public.scholarship_programmes (status);
create index if not exists idx_scholarship_programmes_country on public.scholarship_programmes (host_country);

drop trigger if exists trg_scholarship_programmes_updated_at on public.scholarship_programmes;
create trigger trg_scholarship_programmes_updated_at
  before update on public.scholarship_programmes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. scholarship_engagements — Anamata's specific engagement with a programme
-- ---------------------------------------------------------------------------
create table if not exists public.scholarship_engagements (
  id                uuid primary key default gen_random_uuid(),
  programme_id      uuid not null references public.scholarship_programmes (id) on delete cascade,
  recipient_name    text not null,
  recipient_profile_id uuid references public.profiles (id) on delete set null,
  iwi_affiliation   text[],
  year              int not null,
  status            text not null default 'planned'
                      check (status in ('planned', 'submitted', 'awarded', 'in_progress', 'completed', 'declined')),
  start_date        date,
  end_date          date,
  host_institution  text,
  project_title     text,
  project_summary   text,
  linked_research_doc_id uuid references public.research_documents (id) on delete set null,
  linked_release_id uuid references public.releases (id) on delete set null,
  amount_awarded_nzd int,
  notes             text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_scholarship_engagements_programme on public.scholarship_engagements (programme_id);
create index if not exists idx_scholarship_engagements_recipient on public.scholarship_engagements (recipient_profile_id);
create index if not exists idx_scholarship_engagements_year on public.scholarship_engagements (year);

drop trigger if exists trg_scholarship_engagements_updated_at on public.scholarship_engagements;
create trigger trg_scholarship_engagements_updated_at
  before update on public.scholarship_engagements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. scholarship_precedent_recipients — archived alumni (e.g. PMSA recipients
--    cited from ENZ's official alumni archive) used for funder positioning
-- ---------------------------------------------------------------------------
create table if not exists public.scholarship_precedent_recipients (
  id                  uuid primary key default gen_random_uuid(),
  programme_id        uuid not null references public.scholarship_programmes (id) on delete cascade,
  recipient_name      text not null,
  year                int,
  destination_country text,
  host_institution    text,
  project_title       text,
  description         text,
  is_indigenous_led   boolean default false,
  source_url          text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_scholarship_precedents_programme on public.scholarship_precedent_recipients (programme_id);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.scholarship_programmes          enable row level security;
alter table public.scholarship_engagements         enable row level security;
alter table public.scholarship_precedent_recipients enable row level security;

-- Public read of programmes + precedents — these are research portfolio surface
-- that funders should be able to inspect without authentication.
create policy "scholarship_programmes_public_read"
  on public.scholarship_programmes for select using (true);

create policy "scholarship_precedents_public_read"
  on public.scholarship_precedent_recipients for select using (true);

-- Engagements (actual Anamata applications/awards) are public-readable too —
-- they're evidence, not secrets.
create policy "scholarship_engagements_public_read"
  on public.scholarship_engagements for select using (true);

-- Writes restricted to kaitiaki / branch_admin / super_admin
create policy "scholarship_programmes_write_kaitiaki"
  on public.scholarship_programmes for all
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('kaitiaki', 'branch_admin')
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('kaitiaki', 'branch_admin')
    )
  );

create policy "scholarship_engagements_write_kaitiaki"
  on public.scholarship_engagements for all
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('kaitiaki', 'branch_admin')
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('kaitiaki', 'branch_admin')
    )
  );

create policy "scholarship_precedents_write_kaitiaki"
  on public.scholarship_precedent_recipients for all
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('kaitiaki', 'branch_admin')
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('kaitiaki', 'branch_admin')
    )
  );
