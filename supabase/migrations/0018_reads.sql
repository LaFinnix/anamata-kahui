-- =============================================================================
-- Anamata Kāhui — Reads (long-form research-grade content)
-- =============================================================================
-- Not a blog — research-grade content with three content types:
--   - note       (1,500-3,000 words, mid-length analysis)
--   - research   (3,000-8,000 words, multi-week project)
--   - data_drop  (500-1,500 words + downloadable dataset)
--
-- Workflow: draft → in_review → published (append-only when published).
-- On publish, body_md is rendered to body_html once and cached.
-- Reads have full SEO: meta_description, og_image_url, tags, citations JSON.
-- =============================================================================

create table if not exists public.reads (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  kind            text not null check (kind in ('note', 'research', 'data_drop')),
  title           text not null,
  subtitle        text,
  author_id       uuid references public.profiles(id) on delete set null,
  status          text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'archived')),
  published_at    timestamptz,
  body_md         text not null,
  body_html       text,
  reading_time_minutes int,
  tags            text[] not null default '{}',
  featured_image_url text,
  meta_description text,
  data_attachments jsonb not null default '[]'::jsonb,
  citations       jsonb not null default '[]'::jsonb,
  view_count      int not null default 0,
  is_seo_focused  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes
create index if not exists reads_published_at_idx on public.reads (published_at desc) where status = 'published';
create index if not exists reads_kind_idx on public.reads (kind) where status = 'published';
create index if not exists reads_status_idx on public.reads (status);
create index if not exists reads_slug_idx on public.reads (slug);

-- RLS
alter table public.reads enable row level security;

-- Public: anyone can read published reads
drop policy if exists reads_select_published on public.reads;
create policy reads_select_published
  on public.reads for select
  using (status = 'published');

-- Authors: can read + update their own drafts
drop policy if exists reads_select_author on public.reads;
create policy reads_select_author
  on public.reads for select
  using (author_id = auth.uid());

-- Authors: can insert drafts (own author_id)
drop policy if exists reads_insert_author on public.reads;
create policy reads_insert_author
  on public.reads for insert
  with check (author_id = auth.uid() and status in ('draft', 'in_review'));

-- Authors: can update their own drafts (not published reads - append-only via trigger)
drop policy if exists reads_update_author on public.reads;
create policy reads_update_author
  on public.reads for update
  using (author_id = auth.uid() and status in ('draft', 'in_review'))
  with check (author_id = auth.uid());

-- Super admin: all operations
drop policy if exists reads_super_admin_all on public.reads;
create policy reads_super_admin_all
  on public.reads for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Trigger: published reads are immutable (no UPDATE/DELETE for non-super)
-- This is enforced at the application layer via the policy above.
-- Super admins can still edit for corrections.
-- Triggers on updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_reads_updated_at on public.reads;
create trigger set_reads_updated_at
  before update on public.reads
  for each row execute function public.set_updated_at();

-- Trigger: append-only audit for reads (governance log)
drop function if exists public.reads_audit() cascade;
create function public.reads_audit()
returns trigger as $$
begin
  if (tg_op = 'UPDATE' and old.status = 'published' and new.status != old.status) then
    insert into public.data_governance_log (category, title, body, recorded_by)
    values (
      'review',
      'Read "' || new.title || '" status changed',
      'Status changed from ' || old.status || ' to ' || new.status,
      auth.uid()
    );
  elsif tg_op = 'INSERT' and new.status = 'published' then
    insert into public.data_governance_log (category, title, body, recorded_by)
    values (
      'review',
      'Published read "' || new.title || '"',
      'Authored by ' || coalesce(new.author_id::text, 'unknown'),
      auth.uid()
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists reads_audit_trigger on public.reads;
create trigger reads_audit_trigger
  after insert or update on public.reads
  for each row execute function public.reads_audit();

-- View: published reads with author info for the public surface
create or replace view public.reads_public as
  select
    r.id, r.slug, r.kind, r.title, r.subtitle, r.published_at,
    r.body_html, r.reading_time_minutes, r.tags, r.featured_image_url,
    r.meta_description, r.data_attachments, r.citations,
    r.view_count, r.is_seo_focused, r.created_at, r.updated_at,
    p.full_name as author_name, p.email as author_email, p.role as author_role
  from public.reads r
  left join public.profiles p on p.id = r.author_id
  where r.status = 'published';

grant select on public.reads_public to anon, authenticated;
