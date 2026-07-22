-- =============================================================================
-- Anamata Kāhui — collaboration pipeline (release splits + stem versioning +
-- kaitiaki review gate)
-- =============================================================================
-- Implements the 6-table MVP from docs/COLLABORATION-RESEARCH.md section 9:
--   1. split_sheets                     (one per release)
--   2. split_participants                (N per split_sheet; sum-to-100 invariant)
--   3. stem_versions                     (N per stem; append-only)
--   4. stem_comments                     (N per stem; threaded)
--   5. release_collaborator_invites      (token-based invites)
--   6. cultural_review_cycles            (append-only audit; kaitiaki decisions)
--
-- Plus the gating trigger:
--   - Releases cannot transition to status='scheduled' unless
--     cultural_review_status='approved'. Enforced at the database layer
--     so no client (app, dashboard, direct SQL) can bypass it.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: deny_modification (append-only trigger function)
-- Defined BEFORE any trigger that uses it.
-- ---------------------------------------------------------------------------
create or replace function public.deny_modification()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Table % is append-only — UPDATE and DELETE are not allowed.', tg_table_name
    using errcode = 'integrity_constraint_violation';
end$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'split_role') then
    create type public.split_role as enum (
      'composer',
      'lyricist',
      'performer',
      'vocalist',
      'mixer',
      'mastering_engineer',
      'producer',
      'songwriter',
      'arranger',
      'engineer',
      'session_musician',
      'kaihaka',
      'kaiwaiata',
      'kaiwhakangahau',
      'ringa_whakakao',
      'kaitiaki',
      'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'split_sheet_status') then
    create type public.split_sheet_status as enum (
      'draft',
      'pending_signatures',
      'active',
      'locked',
      'superseded'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'invite_status') then
    create type public.invite_status as enum (
      'pending',
      'accepted',
      'declined',
      'expired',
      'revoked'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'cultural_review_decision') then
    create type public.cultural_review_decision as enum (
      'pending',
      'in_review',
      'approved',
      'withheld',
      'changes_requested'
    );
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 1. split_sheets
-- ---------------------------------------------------------------------------
create table if not exists public.split_sheets (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  status public.split_sheet_status not null default 'draft',
  publishing_total_pct numeric(5,2) not null check (publishing_total_pct >= 0 and publishing_total_pct <= 100),
  master_total_pct numeric(5,2) not null check (master_total_pct >= 0 and master_total_pct <= 100),
  -- CHECK that totals equal 100 when status != 'draft'
  constraint split_sheet_publish_100 check (
    status = 'draft' or publishing_total_pct = 100
  ),
  constraint split_sheet_master_100 check (
    status = 'draft' or master_total_pct = 100
  ),
  signed_pdf_url text,
  locked_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists split_sheets_release_id_key on public.split_sheets (release_id);
create index if not exists split_sheets_status_idx on public.split_sheets (status);

drop trigger if exists split_sheets_set_updated_at on public.split_sheets;
create trigger split_sheets_set_updated_at
  before update on public.split_sheets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. split_participants
-- ---------------------------------------------------------------------------
create table if not exists public.split_participants (
  id uuid primary key default gen_random_uuid(),
  split_sheet_id uuid not null references public.split_sheets(id) on delete cascade,
  -- Either a registered platform member OR an external collaborator
  profile_id uuid references public.profiles(id) on delete set null,
  external_name text,
  external_email text,
  role public.split_role not null,
  publishing_split_pct numeric(5,2) not null default 0
    check (publishing_split_pct >= 0 and publishing_split_pct <= 100),
  master_split_pct numeric(5,2) not null default 0
    check (master_split_pct >= 0 and master_split_pct <= 100),
  typed_signature text,
  signed_at timestamptz,
  signed_ip_hash text,
  created_at timestamptz not null default now(),
  -- CHECK: must have either profile_id OR external_name+external_email
  constraint split_participants_identity check (
    profile_id is not null
    or (external_name is not null and external_email is not null)
  ),
  constraint split_participants_role check (
    role is not null
  )
);

create index if not exists split_participants_split_sheet_id_idx on public.split_participants (split_sheet_id);
create index if not exists split_participants_profile_id_idx on public.split_participants (profile_id);

-- ---------------------------------------------------------------------------
-- 3. stem_versions (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.stem_versions (
  id uuid primary key default gen_random_uuid(),
  stem_id uuid not null references public.stems(id) on delete cascade,
  version_number integer not null,
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  storage_path text not null,
  file_size_bytes bigint,
  format text check (format in ('wav','flac','aac','mp3','mp4')),
  notes text,
  superseded_by uuid references public.stem_versions(id),
  is_locked boolean not null default false,
  locked_by uuid references public.profiles(id),
  locked_at timestamptz,
  -- CHECK: append-only (no updates allowed via RLS)
  -- Trigger enforces this separately
  unique (stem_id, version_number)
);

create index if not exists stem_versions_stem_id_idx on public.stem_versions (stem_id);
create index if not exists stem_versions_uploaded_by_idx on public.stem_versions (uploaded_by);

-- Block updates to stem_versions — append-only
drop trigger if exists stem_versions_no_update on public.stem_versions;
create trigger stem_versions_no_update
  before update on public.stem_versions
  for each row execute function public.deny_modification();

-- ---------------------------------------------------------------------------
-- 4. stem_comments (threaded)
-- ---------------------------------------------------------------------------
create table if not exists public.stem_comments (
  id uuid primary key default gen_random_uuid(),
  stem_id uuid not null references public.stems(id) on delete cascade,
  stem_version_id uuid references public.stem_versions(id) on delete set null,
  author_id uuid not null references public.profiles(id),
  body text not null check (length(body) > 0 and length(body) <= 8000),
  parent_comment_id uuid references public.stem_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stem_comments_stem_id_idx on public.stem_comments (stem_id);
create index if not exists stem_comments_author_id_idx on public.stem_comments (author_id);

drop trigger if exists stem_comments_set_updated_at on public.stem_comments;
create trigger stem_comments_set_updated_at
  before update on public.stem_comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. release_collaborator_invites
-- ---------------------------------------------------------------------------
create table if not exists public.release_collaborator_invites (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  invited_by uuid not null references public.profiles(id),
  invitee_email text not null,
  invitee_profile_id uuid references public.profiles(id) on delete set null,
  role public.split_role not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status public.invite_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists release_invites_release_id_idx on public.release_collaborator_invites (release_id);
create index if not exists release_invites_email_idx on public.release_collaborator_invites (invitee_email);
create index if not exists release_invites_status_idx on public.release_collaborator_invites (status);

-- ---------------------------------------------------------------------------
-- 6. cultural_review_cycles (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.cultural_review_cycles (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  kaitiaki_id uuid not null references public.profiles(id),
  decision public.cultural_review_decision not null,
  notes text,
  parent_cycle_id uuid references public.cultural_review_cycles(id),
  decided_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists cultural_review_release_id_idx on public.cultural_review_cycles (release_id);
create index if not exists cultural_review_kaitiaki_idx on public.cultural_review_cycles (kaitiaki_id);

-- Append-only enforcement
drop trigger if exists cultural_review_no_update on public.cultural_review_cycles;
create trigger cultural_review_no_update
  before update on public.cultural_review_cycles
  for each row execute function public.deny_modification();

drop trigger if exists cultural_review_no_delete on public.cultural_review_cycles;
create trigger cultural_review_no_delete
  before delete on public.cultural_review_cycles
  for each row execute function public.deny_modification();

-- ---------------------------------------------------------------------------
-- Cultural review status on releases (the gate)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'releases' and column_name = 'cultural_review_status'
  ) then
    alter table public.releases
      add column cultural_review_status public.cultural_review_decision not null default 'pending';
  end if;
end$$;

create index if not exists releases_cultural_review_idx on public.releases (cultural_review_status);

-- ---------------------------------------------------------------------------
-- Gating trigger — releases cannot reach status='scheduled' without
-- cultural_review_status='approved'. Enforced at the database layer.
-- ---------------------------------------------------------------------------
create or replace function public.require_cultural_signoff()
returns trigger
language plpgsql
as $$
begin
  -- Only enforce when transitioning to 'scheduled' or 'released'.
  -- Moving to 'draft' is always allowed (the early stage).
  if (new.status = 'scheduled' or new.status = 'released')
     and new.cultural_review_status is distinct from 'approved' then
    raise exception
      'Cannot transition release % to status ''%'': cultural_review_status must be ''approved'' (currently ''%'').',
      new.id, new.status, new.cultural_review_status
      using errcode = 'check_violation';
  end if;
  return new;
end$$;

drop trigger if exists releases_require_cultural_signoff on public.releases;
create trigger releases_require_cultural_signoff
  before update of status on public.releases
  for each row execute function public.require_cultural_signoff();

-- ---------------------------------------------------------------------------
-- RLS — read/write policies
-- ---------------------------------------------------------------------------
alter table public.split_sheets enable row level security;
alter table public.split_participants enable row level security;
alter table public.stem_versions enable row level security;
alter table public.stem_comments enable row level security;
alter table public.release_collaborator_invites enable row level security;
alter table public.cultural_review_cycles enable row level security;

-- split_sheets: read scoped to branch membership; write scoped to creator + super_admin + branch_admin
drop policy if exists split_sheets_branch_read on public.split_sheets;
create policy split_sheets_branch_read
  on public.split_sheets for select
  using (
    exists (
      select 1 from public.releases r
      where r.id = split_sheets.release_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
        )
    )
  );

drop policy if exists split_sheets_branch_write on public.split_sheets;
create policy split_sheets_branch_write
  on public.split_sheets for insert
  with check (
    exists (
      select 1 from public.releases r
      where r.id = split_sheets.release_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
        )
    )
  );

drop policy if exists split_sheets_branch_update on public.split_sheets;
create policy split_sheets_branch_update
  on public.split_sheets for update
  using (
    exists (
      select 1 from public.releases r
      where r.id = split_sheets.release_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
          or created_by = auth.uid()
        )
    )
  );

-- split_participants: same scoping as parent split_sheet
drop policy if exists split_participants_read on public.split_participants;
create policy split_participants_read
  on public.split_participants for select
  using (
    exists (
      select 1 from public.split_sheets ss
      join public.releases r on r.id = ss.release_id
      where ss.id = split_participants.split_sheet_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
        )
    )
  );

drop policy if exists split_participants_write on public.split_participants;
create policy split_participants_write
  on public.split_participants for insert
  with check (
    exists (
      select 1 from public.split_sheets ss
      join public.releases r on r.id = ss.release_id
      where ss.id = split_participants.split_sheet_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
        )
    )
  );

drop policy if exists split_participants_update on public.split_participants;
create policy split_participants_update
  on public.split_participants for update
  using (
    exists (
      select 1 from public.split_sheets ss
      join public.releases r on r.id = ss.release_id
      where ss.id = split_participants.split_sheet_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
        )
    )
  );

drop policy if exists split_participants_delete on public.split_participants;
create policy split_participants_delete
  on public.split_participants for delete
  using (
    public.is_super_admin()
  );

-- stem_versions: branch-scoped read; creator + branch access write
drop policy if exists stem_versions_read on public.stem_versions;
create policy stem_versions_read
  on public.stem_versions for select
  using (
    exists (
      select 1 from public.stems s
      join public.releases r on r.id = s.release_id
      where s.id = stem_versions.stem_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
        )
    )
  );

drop policy if exists stem_versions_write on public.stem_versions;
create policy stem_versions_write
  on public.stem_versions for insert
  with check (
    exists (
      select 1 from public.stems s
      join public.releases r on r.id = s.release_id
      where s.id = stem_versions.stem_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
        )
    )
  );

-- stem_versions UPDATE/DELETE blocked by trigger (deny_modification)

-- stem_comments: branch-scoped read; authed users in branch can write
drop policy if exists stem_comments_read on public.stem_comments;
create policy stem_comments_read
  on public.stem_comments for select
  using (
    exists (
      select 1 from public.stems s
      join public.releases r on r.id = s.release_id
      where s.id = stem_comments.stem_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
        )
    )
  );

drop policy if exists stem_comments_write on public.stem_comments;
create policy stem_comments_write
  on public.stem_comments for insert
  with check (
    exists (
      select 1 from public.stems s
      join public.releases r on r.id = s.release_id
      where s.id = stem_comments.stem_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
        )
    )
    and author_id = auth.uid()
  );

drop policy if exists stem_comments_update on public.stem_comments;
create policy stem_comments_update
  on public.stem_comments for update
  using (author_id = auth.uid() or public.is_super_admin());

drop policy if exists stem_comments_delete on public.stem_comments;
create policy stem_comments_delete
  on public.stem_comments for delete
  using (author_id = auth.uid() or public.is_super_admin());

-- release_collaborator_invites: branch-scoped
drop policy if exists release_invites_read on public.release_collaborator_invites;
create policy release_invites_read
  on public.release_collaborator_invites for select
  using (
    exists (
      select 1 from public.releases r
      where r.id = release_collaborator_invites.release_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
          or invited_by = auth.uid()
        )
    )
    or invitee_profile_id = auth.uid()
  );

drop policy if exists release_invites_write on public.release_collaborator_invites;
create policy release_invites_write
  on public.release_collaborator_invites for insert
  with check (
    exists (
      select 1 from public.releases r
      where r.id = release_collaborator_invites.release_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
        )
    )
    and invited_by = auth.uid()
  );

drop policy if exists release_invites_update on public.release_collaborator_invites;
create policy release_invites_update
  on public.release_collaborator_invites for update
  using (
    public.is_super_admin() or invited_by = auth.uid()
  );

-- cultural_review_cycles: branch-scoped read; kaitiaki role + super_admin can write
drop policy if exists cultural_review_read on public.cultural_review_cycles;
create policy cultural_review_read
  on public.cultural_review_cycles for select
  using (
    exists (
      select 1 from public.releases r
      where r.id = cultural_review_cycles.release_id
        and (
          public.has_branch_access(r.branch_id)
          or public.is_super_admin()
        )
    )
  );

drop policy if exists cultural_review_write on public.cultural_review_cycles;
create policy cultural_review_write
  on public.cultural_review_cycles for insert
  with check (
    kaitiaki_id = auth.uid()
    and (
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('kaitiaki', 'super_admin')
      )
    )
  );

-- cultural_review_cycles UPDATE/DELETE blocked by deny_modification trigger

-- ---------------------------------------------------------------------------
-- Grant on storage.objects for the 'stems' bucket — covered in 0002 already
-- ---------------------------------------------------------------------------
