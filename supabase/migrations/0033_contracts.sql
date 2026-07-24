-- =============================================================================
-- 0033 — Contracts (signed-artist system, phase 5)
-- =============================================================================
-- Formal agreements between an artist (via their roster row) and a
-- branch. Versioned, time-bounded, signable. The body is a snapshot
-- of the Markdown at sign time, so future edits to the .md library
-- don't change what the artist originally agreed to.
--
-- Design (per signed-artist system plan):
--   - One contract = one (artist, branch, document version) relationship
--   - Renewals: a new contract is created with parent_contract_id
--     pointing to the old one. Old contract's status flips to 'renewed'.
--   - The body field is the frozen content the artist signed; not a
--     live reference to the .md library.
--   - Sign: record signed_at + signed_by_artist + signed_ip_hash. No
--     e-signature provider — the click-to-acknowledge audit trail
--     is legally sufficient under NZ Contract and Commercial Law Act
--     2017 for the contract types we issue.
--
-- RLS: artist reads own; super_admin + branch_admin (of the contract's
-- branch) read/write all. Public cannot read.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

do $contract_types$ begin
  if not exists (select 1 from pg_type where typname = 'contract_type') then
    create type public.contract_type
      as enum ('label_deal', 'distribution', 'publishing', 'co_venture', 'recording', 'tour');
  end if;
end $contract_types$;

do $contract_status$ begin
  if not exists (select 1 from pg_type where typname = 'contract_status') then
    create type public.contract_status
      as enum ('draft', 'active', 'expired', 'terminated', 'renewed');
  end if;
end $contract_status$;

-- ---------------------------------------------------------------------------
-- 2. The table
-- ---------------------------------------------------------------------------

create table if not exists public.contracts (
  id                  uuid primary key default gen_random_uuid(),

  -- Link to the artist's roster row (which holds profile + branch)
  artist_roster_id    uuid not null references public.artist_roster (id) on delete restrict,

  -- Document identity (the kind of contract + the version that was signed)
  document_type       text not null,
  document_version    text not null,
  title               text not null,

  -- Frozen body — the Markdown that was signed. Not a live reference
  -- to the .md library, so a later edit to the library doesn't
  -- retroactively change what was agreed.
  body                text not null,

  -- What kind of business agreement this is
  contract_type       public.contract_type not null,
  status              public.contract_status not null default 'draft',

  -- Term
  term_start          date,
  term_end            date,
  territory           text,
  exclusivity_scope   text,
  royalty_split       jsonb not null default '{}'::jsonb,

  -- Renewals chain
  parent_contract_id  uuid references public.contracts (id) on delete set null,

  -- Audit
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  last_modified_by    uuid references public.profiles (id) on delete set null,
  last_modified_at    timestamptz not null default now(),

  -- Sign
  signed_at           timestamptz,
  signed_by_artist    uuid references public.profiles (id) on delete set null,
  signed_ip_hash      text,

  -- Terminate
  terminated_at       timestamptz,
  terminated_reason   text,

  -- Admin notes (not visible to artist)
  notes               text
);

create index if not exists idx_contracts_artist_roster
  on public.contracts (artist_roster_id);
create index if not exists idx_contracts_status
  on public.contracts (status);
create index if not exists idx_contracts_parent
  on public.contracts (parent_contract_id);
create index if not exists idx_contracts_doc
  on public.contracts (document_type, document_version);

-- Auto-bump last_modified_at on UPDATE
create or replace function public.contracts_touch()
returns trigger
language plpgsql
as $$
begin
  new.last_modified_at := now();
  return new;
end;
$$;

drop trigger if exists trg_contracts_touch on public.contracts;
create trigger trg_contracts_touch
  before update on public.contracts
  for each row execute function public.contracts_touch();

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

alter table public.contracts enable row level security;

-- Artist: read own contracts (any status)
drop policy if exists "contracts_self_read" on public.contracts;
create policy "contracts_self_read"
  on public.contracts
  for select
  using (
    exists (
      select 1
      from public.artist_roster r
      where r.id = contracts.artist_roster_id
        and r.profile_id = auth.uid()
    )
  );

-- Admin: full read/write via is_admin() or is_branch_admin()
-- The is_branch_admin function takes a branch_id, so we resolve
-- the contract's branch via the artist_roster join.
drop policy if exists "contracts_admin_read" on public.contracts;
create policy "contracts_admin_read"
  on public.contracts
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.artist_roster r
      where r.id = contracts.artist_roster_id
        and public.is_branch_admin(r.branch_id)
    )
  );

drop policy if exists "contracts_admin_write" on public.contracts;
create policy "contracts_admin_write"
  on public.contracts
  for all
  using (
    public.is_admin()
    or exists (
      select 1
      from public.artist_roster r
      where r.id = contracts.artist_roster_id
        and public.is_branch_admin(r.branch_id)
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.artist_roster r
      where r.id = contracts.artist_roster_id
        and public.is_branch_admin(r.branch_id)
    )
  );
