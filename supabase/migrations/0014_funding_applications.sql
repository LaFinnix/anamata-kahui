create table if not exists public.funding_applications (
  id                  uuid primary key default gen_random_uuid(),
  funder_name         text not null,
  round               text,
  status              text not null default 'planned'
                        check (status in ('planned', 'pending', 'awarded', 'declined')),
  amount_requested_nzd integer,
  amount_awarded_nzd  integer,
  submitted_date      date,
  decision_date       date,
  branch_slug         text check (branch_slug in ('records', 'research', 'arts', 'dev')),
  title               text,
  public_summary      text,
  is_public           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_funding_status on public.funding_applications (status);
create index if not exists idx_funding_branch on public.funding_applications (branch_slug);

alter table public.funding_applications enable row level security;

create policy "funding_public_read"
  on public.funding_applications for select
  using (is_public = true);

create policy "funding_super_admin_write"
  on public.funding_applications for all
  using (public.is_super_admin())
  with check (public.is_super_admin());