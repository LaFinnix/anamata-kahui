-- =============================================================================
-- 0037 — Storage quotas (signed-artist system, demo storage infrastructure)
-- =============================================================================
-- Tracks per-user storage usage so admins and the UI can show quota status.
-- The limits themselves are enforced in the uploadDemoFileAction server
-- action (in src/lib/demos/upload-action.ts). This table is the source of
-- truth for "how much has this user used" — both for UI display and
-- future enforcement via RLS.
--
-- Design:
--   - One row per user, updated on every successful upload
--   - Captures bytes_total + counts per bucket (demos, stems, etc.)
--   - last_upload_at for "your last upload was X ago" UI
--   - No destructive updates — the action layer does UPSERT
--
-- Note: this migration does NOT add file_size_bytes aggregation logic
-- to the action layer yet (that lives in code, not SQL, for simplicity).
-- A future iteration can add a trigger that updates these totals on
-- demos/stems insert+delete.

-- ---------------------------------------------------------------------------
-- The table
-- ---------------------------------------------------------------------------

create table if not exists public.user_storage_quotas (
  user_id                  uuid primary key references public.profiles (id) on delete cascade,

  -- Per-bucket byte counters
  demos_bytes              bigint not null default 0 check (demos_bytes >= 0),
  stems_bytes              bigint not null default 0 check (stems_bytes >= 0),
  releases_bytes           bigint not null default 0 check (releases_bytes >= 0),
  other_bytes              bigint not null default 0 check (other_bytes >= 0),

  -- Per-bucket upload counters
  demos_count              integer not null default 0 check (demos_count >= 0),
  stems_count              integer not null default 0 check (stems_count >= 0),
  releases_count           integer not null default 0 check (releases_count >= 0),
  other_count              integer not null default 0 check (other_count >= 0),

  -- Audit
  last_upload_at           timestamptz,
  last_upload_bucket       text check (last_upload_bucket in ('demos', 'stems', 'releases', 'other')),

  -- Quota overrides (super_admin can set per-user limits)
  -- NULL = use the platform default
  override_total_bytes     bigint check (override_total_bytes is null or override_total_bytes > 0),
  override_total_count     integer check (override_total_count is null or override_total_count > 0),

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_user_storage_quotas_updated
  on public.user_storage_quotas (updated_at desc);

-- Auto-bump updated_at on UPDATE
create or replace function public.user_storage_quotas_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_storage_quotas_touch on public.user_storage_quotas;
create trigger trg_user_storage_quotas_touch
  before update on public.user_storage_quotas
  for each row execute function public.user_storage_quotas_touch();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.user_storage_quotas enable row level security;

-- Users can read their own quota
drop policy if exists "user_storage_quotas_self_read" on public.user_storage_quotas;
create policy "user_storage_quotas_self_read"
  on public.user_storage_quotas
  for select
  using (user_id = auth.uid());

-- Admins can read all quotas
drop policy if exists "user_storage_quotas_admin_read" on public.user_storage_quotas;
create policy "user_storage_quotas_admin_read"
  on public.user_storage_quotas
  for select
  using (public.is_admin());

-- Writes are done by the action layer (using service role) — no
-- end-user write policy. RLS still applies to prevent direct
-- client-side updates.

-- ---------------------------------------------------------------------------
-- Helpful view: user_storage_summary
-- ---------------------------------------------------------------------------

-- A read-only view that joins quotas with platform defaults so the
-- UI can show "X of Y used" without duplicating default logic.
create or replace view public.user_storage_summary as
select
  q.user_id,
  q.demos_bytes + q.stems_bytes + q.releases_bytes + q.other_bytes as total_bytes,
  q.demos_count + q.stems_count + q.releases_count + q.other_count as total_count,
  q.last_upload_at,
  q.last_upload_bucket,
  coalesce(q.override_total_bytes, (5::bigint * 1024 * 1024 * 1024)) as effective_total_bytes, -- 5 GB default
  coalesce(q.override_total_count, 100) as effective_total_count -- 100 default
from public.user_storage_quotas q;

-- View inherits RLS from the underlying table; same access pattern.

-- ---------------------------------------------------------------------------
-- upsert_user_storage_quota — increment the per-bucket counter on upload
-- ---------------------------------------------------------------------------
-- Called by the server action after a successful upload. Increments the
-- per-bucket byte + count columns (doesn't replace other buckets).
-- Sets last_upload_at + last_upload_bucket for "your last upload was X ago"
-- UI display.

create or replace function public.upsert_user_storage_quota(
  p_user_id uuid,
  p_bucket text,
  p_bytes bigint default 0,
  p_count integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_bucket not in ('demos', 'stems', 'releases', 'other') then
    raise exception 'Invalid bucket: %', p_bucket;
  end if;

  insert into public.user_storage_quotas (user_id, last_upload_at, last_upload_bucket)
  values (p_user_id, now(), p_bucket)
  on conflict (user_id) do update set
    last_upload_at = excluded.last_upload_at,
    last_upload_bucket = excluded.last_upload_bucket;

  if p_bucket = 'demos' then
    update public.user_storage_quotas
    set demos_bytes = demos_bytes + p_bytes, demos_count = demos_count + p_count
    where user_id = p_user_id;
  elsif p_bucket = 'stems' then
    update public.user_storage_quotas
    set stems_bytes = stems_bytes + p_bytes, stems_count = stems_count + p_count
    where user_id = p_user_id;
  elsif p_bucket = 'releases' then
    update public.user_storage_quotas
    set releases_bytes = releases_bytes + p_bytes, releases_count = releases_count + p_count
    where user_id = p_user_id;
  else
    update public.user_storage_quotas
    set other_bytes = other_bytes + p_bytes, other_count = other_count + p_count
    where user_id = p_user_id;
  end if;
end;
$$;

grant execute on function public.upsert_user_storage_quota(uuid, text, bigint, integer) to authenticated;
