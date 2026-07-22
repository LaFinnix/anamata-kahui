-- =============================================================================
-- Anamata Kāhui — initial schema migration
-- =============================================================================
-- Generated: scaffold. Run via `supabase db push` or in the Supabase SQL editor.
-- Order matters: tables → indexes → RLS enable → policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
-- Mirrors auth.users 1:1 and adds role + display info. Created automatically on
-- signup via the `handle_new_user` trigger at the bottom of this file.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text unique,
  role        text not null default 'artist'
                check (role in ('super_admin', 'branch_admin', 'artist', 'researcher', 'client')),
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles (role);

-- ---------------------------------------------------------------------------
-- 2. branches
-- ---------------------------------------------------------------------------
-- The four operational branches. Seeded below with stable slugs.
-- ---------------------------------------------------------------------------
create table if not exists public.branches (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null check (slug in ('records', 'research', 'arts', 'dev')),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. user_branches (junction)
-- ---------------------------------------------------------------------------
-- Many-to-many: a user can belong to multiple branches with different roles.
-- ---------------------------------------------------------------------------
create table if not exists public.user_branches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  branch_id   uuid not null references public.branches (id) on delete cascade,
  role        text not null default 'member'
                check (role in ('lead', 'admin', 'member', 'guest')),
  created_at  timestamptz not null default now(),
  unique (user_id, branch_id)
);

create index if not exists idx_user_branches_user on public.user_branches (user_id);
create index if not exists idx_user_branches_branch on public.user_branches (branch_id);

-- ---------------------------------------------------------------------------
-- 4. releases (Records branch)
-- ---------------------------------------------------------------------------
create table if not exists public.releases (
  id              uuid primary key default gen_random_uuid(),
  artist_id       uuid not null references public.profiles (id) on delete restrict,
  branch_id       uuid not null references public.branches (id) on delete restrict,
  title           text not null,
  description     text,
  release_date    date,
  upc_isrc        text,
  cover_art_url   text,
  status          text not null default 'draft'
                    check (status in ('draft', 'scheduled', 'released', 'archived')),
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_releases_artist on public.releases (artist_id);
create index if not exists idx_releases_branch on public.releases (branch_id);
create index if not exists idx_releases_status on public.releases (status);

-- ---------------------------------------------------------------------------
-- 5. stems (audio stem vault for the Records branch)
-- ---------------------------------------------------------------------------
create table if not exists public.stems (
  id            uuid primary key default gen_random_uuid(),
  release_id    uuid not null references public.releases (id) on delete cascade,
  storage_path  text not null,                 -- path in `stems` bucket
  file_name     text not null,
  mime_type     text,
  size_bytes    bigint,
  uploaded_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_stems_release on public.stems (release_id);

-- ---------------------------------------------------------------------------
-- 6. updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_releases_updated_at on public.releases;
create trigger trg_releases_updated_at
  before update on public.releases
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. handle_new_user — auto-create a profile row on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 8. seed branches
-- ---------------------------------------------------------------------------
insert into public.branches (slug, name, description) values
  ('records',  'Anamata Records',     'Music branch — artist portal, release pipeline, stem vault, royalty & stream analytics.'),
  ('research', 'Research & Language', 'Knowledge vault, document archives, and field projects for language preservation.'),
  ('arts',     'Creative Arts',       'Visual arts, digital media showcase, and cultural design portfolios.'),
  ('dev',      'Technology & Dev',    'Software projects, client tools, and internal automation.')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description;

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.profiles     enable row level security;
alter table public.branches     enable row level security;
alter table public.user_branches enable row level security;
alter table public.releases     enable row level security;
alter table public.stems        enable row level security;

-- Helper: is the current user a super_admin? Used in several policies.
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

-- Helper: does the current user have access to a given branch?
create or replace function public.has_branch_access(p_branch uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_super_admin() or exists (
    select 1 from public.user_branches ub
    where ub.user_id = auth.uid() and ub.branch_id = p_branch
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles policies
-- ---------------------------------------------------------------------------
-- Anyone authenticated can read profile rows (for displaying artist names etc.)
create policy "profiles_select_authenticated"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- Users can update their own row. Super admins can update any row.
create policy "profiles_update_self_or_super"
  on public.profiles for update
  using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());

-- Only super admins can insert or delete profiles (signup is via auth.users
-- trigger; manual inserts are admin-only).
create policy "profiles_insert_super"
  on public.profiles for insert
  with check (public.is_super_admin());

create policy "profiles_delete_super"
  on public.profiles for delete
  using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- branches policies
-- ---------------------------------------------------------------------------
-- Branches are public directory data — anyone can read them.
create policy "branches_select_public"
  on public.branches for select
  using (true);

create policy "branches_write_super"
  on public.branches for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- user_branches policies
-- ---------------------------------------------------------------------------
-- A user can read their own memberships; super admins can read all.
create policy "user_branches_select_self_or_super"
  on public.user_branches for select
  using (user_id = auth.uid() or public.is_super_admin());

-- Only super admins can manage memberships (assignment is an admin action).
create policy "user_branches_write_super"
  on public.user_branches for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- releases policies
-- ---------------------------------------------------------------------------
-- Public can read released releases only.
create policy "releases_select_public"
  on public.releases for select
  using (status = 'released');

-- Signed-in users with branch access can read all releases in their branch.
create policy "releases_select_branch_members"
  on public.releases for select
  using (
    auth.role() = 'authenticated'
    and public.has_branch_access(branch_id)
  );

-- Super admins can do anything.
create policy "releases_all_super"
  on public.releases for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- The artist on the release (or branch_admin of that branch) can insert/update.
-- Note: artists don't write here directly — the dashboard route uses the
-- service role on their behalf. This policy exists for branch_admin paths.
create policy "releases_write_branch_admin"
  on public.releases for insert
  with check (
    exists (
      select 1 from public.user_branches ub
      where ub.user_id = auth.uid()
        and ub.branch_id = releases.branch_id
        and ub.role in ('lead', 'admin')
    )
  );

create policy "releases_update_branch_admin"
  on public.releases for update
  using (
    exists (
      select 1 from public.user_branches ub
      where ub.user_id = auth.uid()
        and ub.branch_id = releases.branch_id
        and ub.role in ('lead', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.user_branches ub
      where ub.user_id = auth.uid()
        and ub.branch_id = releases.branch_id
        and ub.role in ('lead', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- stems policies
-- ---------------------------------------------------------------------------
-- Branch members can read stems for their branch's releases.
create policy "stems_select_branch_members"
  on public.stems for select
  using (
    exists (
      select 1 from public.releases r
      join public.user_branches ub on ub.branch_id = r.branch_id
      where r.id = stems.release_id
        and ub.user_id = auth.uid()
    )
  );

-- Only branch leads/admins can insert/update/delete stems.
create policy "stems_write_branch_admin"
  on public.stems for all
  using (
    exists (
      select 1 from public.releases r
      join public.user_branches ub on ub.branch_id = r.branch_id
      where r.id = stems.release_id
        and ub.user_id = auth.uid()
        and ub.role in ('lead', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.releases r
      join public.user_branches ub on ub.branch_id = r.branch_id
      where r.id = stems.release_id
        and ub.user_id = auth.uid()
        and ub.role in ('lead', 'admin')
    )
  );

create policy "stems_all_super"
  on public.stems for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- =============================================================================
-- Storage buckets (create via dashboard or migration; SQL example below)
-- =============================================================================
-- insert into storage.buckets (id, name, public) values
--   ('covers',    'covers',    true),
--   ('press',     'press',     true),
--   ('stems',     'stems',     false),
--   ('research',  'research',  false)
-- on conflict (id) do nothing;
-- =============================================================================
