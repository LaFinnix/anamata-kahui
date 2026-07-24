-- =============================================================================
-- 0034 — Legal policies (signed-artist system, phase 6)
-- =============================================================================
-- Two-table design:
--   legal_policies                  — the policy document (one per
--                                     type+version). Body is the frozen
--                                     Markdown of the document.
--   legal_policy_acknowledgements   — per-artist per-version ack.
--                                     Append-only: re-ack is a new row.
--                                     Withdraw is recorded (audit trail),
--                                     not deleted.
--
-- Per-CARE principle: every artist can withdraw their acknowledgement
-- of any policy at any time. The withdrawal preserves the original ack
-- in the audit trail.
--
-- RLS: artist reads/writes own acks; admin reads all (super + branch_admin
-- of the artist's branch). Public cannot read.

-- ---------------------------------------------------------------------------
-- 1. Enum
-- ---------------------------------------------------------------------------

do $policy_types$ begin
  if not exists (select 1 from pg_type where typname = 'legal_policy_type') then
    create type public.legal_policy_type
      as enum ('code_of_conduct', 'privacy_consent', 'data_rights', 'cultural_safety', 'other');
  end if;
end $policy_types$;

-- ---------------------------------------------------------------------------
-- 2. legal_policies table
-- ---------------------------------------------------------------------------

create table if not exists public.legal_policies (
  id              uuid primary key default gen_random_uuid(),

  policy_type     public.legal_policy_type not null,
  version         text not null,
  title           text not null,
  body            text not null,

  effective_at    date not null,
  is_current      boolean not null default false,

  -- If true, every artist on the platform needs to acknowledge this
  -- policy. Admins can also publish one-off policies that only a
  -- specific roster group needs to sign.
  required_for_all boolean not null default true,

  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),

  -- At most one current version per (policy_type). The constraint is
  -- a partial unique index (similar to the artist_roster pattern).
  constraint legal_policies_version_unique
    unique (policy_type, version)
);

create index if not exists idx_legal_policies_type
  on public.legal_policies (policy_type);
create index if not exists idx_legal_policies_current
  on public.legal_policies (policy_type)
  where (is_current = true);

-- Helper to flip is_current atomically when a new version is published
create or replace function public.legal_policies_set_current(p_policy_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type public.legal_policy_type;
begin
  select policy_type into v_type from public.legal_policies where id = p_policy_id;
  if v_type is null then
    raise exception 'Policy not found: %', p_policy_id;
  end if;
  update public.legal_policies
    set is_current = (id = p_policy_id)
    where policy_type = v_type;
end;
$$;

grant execute on function public.legal_policies_set_current(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. legal_policy_acknowledgements table
-- ---------------------------------------------------------------------------

create table if not exists public.legal_policy_acknowledgements (
  id                  uuid primary key default gen_random_uuid(),

  policy_id           uuid not null references public.legal_policies (id) on delete restrict,
  artist_roster_id    uuid not null references public.artist_roster (id) on delete cascade,

  acknowledged_at     timestamptz not null default now(),
  ip_hash             text,

  -- Right of withdrawal (CARE). The artist can withdraw; the row stays
  -- in the audit trail but the active status is removed.
  withdrawn_at        timestamptz,
  withdrawn_reason    text,

  -- Artist-provided context at the time of ack. e.g. "I noted concern
  -- about clause 3 but agree to the rest."
  notes               text,

  -- An artist may re-acknowledge a policy (e.g. after withdrawing).
  -- Each ack is a new row, so we can preserve the full history. We
  -- allow multiple active (non-withdrawn) acks but only one is
  -- typically the "current" — enforced by the application layer.
  constraint legal_policy_ack_unique_policy_roster
    unique (policy_id, artist_roster_id, acknowledged_at)
);

create index if not exists idx_legal_policy_ack_roster
  on public.legal_policy_acknowledgements (artist_roster_id);
create index if not exists idx_legal_policy_ack_policy
  on public.legal_policy_acknowledgements (policy_id);
create index if not exists idx_legal_policy_ack_active
  on public.legal_policy_acknowledgements (artist_roster_id, policy_id)
  where (withdrawn_at is null);

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

alter table public.legal_policies enable row level security;
alter table public.legal_policy_acknowledgements enable row level security;

-- Policies: everyone can read current + admin can read all
drop policy if exists "legal_policies_public_read" on public.legal_policies;
create policy "legal_policies_public_read"
  on public.legal_policies
  for select
  using (is_current = true or public.is_admin());

drop policy if exists "legal_policies_admin_write" on public.legal_policies;
create policy "legal_policies_admin_write"
  on public.legal_policies
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Acknowledgements: artist reads/writes own; admin reads all
drop policy if exists "legal_policy_ack_self_read" on public.legal_policy_acknowledgements;
create policy "legal_policy_ack_self_read"
  on public.legal_policy_acknowledgements
  for select
  using (
    exists (
      select 1
      from public.artist_roster r
      where r.id = legal_policy_acknowledgements.artist_roster_id
        and r.profile_id = auth.uid()
    )
  );

drop policy if exists "legal_policy_ack_admin_read" on public.legal_policy_acknowledgements;
create policy "legal_policy_ack_admin_read"
  on public.legal_policy_acknowledgements
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.artist_roster r
      where r.id = legal_policy_acknowledgements.artist_roster_id
        and public.is_branch_admin(r.branch_id)
    )
  );

drop policy if exists "legal_policy_ack_self_write" on public.legal_policy_acknowledgements;
create policy "legal_policy_ack_self_write"
  on public.legal_policy_acknowledgements
  for all
  using (
    exists (
      select 1
      from public.artist_roster r
      where r.id = legal_policy_acknowledgements.artist_roster_id
        and r.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.artist_roster r
      where r.id = legal_policy_acknowledgements.artist_roster_id
        and r.profile_id = auth.uid()
    )
  );
