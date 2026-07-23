-- =============================================================================
-- Anamata Kāhui — News (short-form updates, announcements, milestones)
-- =============================================================================
-- Time-sensitive content — the discovery engine. Not a blog; not a read.
-- Five kinds:
--   release     — waiata added, partner release, etc.
--   feature     — new feature shipped (cultural review dashboard, etc.)
--   milestone   — corpus size, audit numbers, partner onboarding
--   partner     — new integration, new funding round, new collaboration
--   update      — translations, fixes, infrastructure notes
--
-- Workflow: draft → in_review → published (append-only when published).
-- On publish, body_md is rendered to body_html once and cached.
-- Each news entry has its own short body (200-800 words), not the
-- long-form depth of /reads.
-- =============================================================================

create table if not exists public.news (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  kind            text not null check (kind in ('release', 'feature', 'milestone', 'partner', 'update')),
  title           text not null,
  summary         text,                              -- 1-2 sentence card summary
  body_md         text not null,
  body_html       text,                              -- rendered on publish
  author_id       uuid references public.profiles(id) on delete set null,
  status          text not null default 'draft' check (status in ('draft', 'in_review', 'published', 'archived')),
  published_at    timestamptz,
  expires_at      timestamptz,                      -- optional auto-archive
  featured_image_url text,
  meta_description text,
  external_url    text,                             -- "read more" link
  tags            text[] not null default '{}',
  view_count      int not null default 0,
  is_seo_focused  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes
create index if not exists news_published_at_idx on public.news (published_at desc) where status = 'published';
create index if not exists news_kind_idx on public.news (kind) where status = 'published';
create index if not exists news_status_idx on public.news (status);
create index if not exists news_slug_idx on public.news (slug);

-- RLS
alter table public.news enable row level security;

-- Public: anyone can read published news
drop policy if exists news_select_published on public.news;
create policy news_select_published
  on public.news for select
  using (status = 'published');

-- Authors: can read + update their own drafts
drop policy if exists news_select_author on public.news;
create policy news_select_author
  on public.news for select
  using (author_id = auth.uid());

-- Authors: can insert drafts
drop policy if exists news_insert_author on public.news;
create policy news_insert_author
  on public.news for insert
  with check (author_id = auth.uid() and status in ('draft', 'in_review'));

-- Authors: can update their own drafts (not published - append-only via trigger)
drop policy if exists news_update_author on public.news;
create policy news_update_author
  on public.news for update
  using (author_id = auth.uid() and status in ('draft', 'in_review'))
  with check (author_id = auth.uid());

-- Super admin: all operations
drop policy if exists news_super_admin_all on public.news;
create policy news_super_admin_all
  on public.news for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Trigger: updated_at
drop trigger if exists set_news_updated_at on public.news;
create trigger set_news_updated_at
  before update on public.news
  for each row execute function public.set_updated_at();

-- Trigger: append-only audit (writes to data_governance_log on insert/update of published news)
create or replace function public.news_audit()
returns trigger as $$
begin
  if (tg_op = 'UPDATE' and old.status = 'published' and new.status != old.status) then
    insert into public.data_governance_log (category, title, body, authored_by)
    values (
      'review',
      'News "' || new.title || '" status changed',
      'Status changed from ' || old.status || ' to ' || new.status,
      auth.uid()
    );
  elsif tg_op = 'INSERT' and new.status = 'published' then
    insert into public.data_governance_log (category, title, body, authored_by)
    values (
      'review',
      'Published news "' || new.title || '"',
      'Authored by ' || coalesce(new.author_id::text, 'unknown'),
      auth.uid()
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists news_audit_trigger on public.news;
create trigger news_audit_trigger
  after insert or update on public.news
  for each row execute function public.news_audit();

-- View: published news with author info for the public surface
create or replace view public.news_public as
  select
    n.id, n.slug, n.kind, n.title, n.summary, n.published_at,
    n.body_html, n.featured_image_url, n.meta_description,
    n.external_url, n.tags, n.view_count, n.is_seo_focused,
    n.created_at, n.updated_at, n.expires_at,
    p.full_name as author_name, p.email as author_email, p.role as author_role
  from public.news n
  left join public.profiles p on p.id = n.author_id
  where n.status = 'published'
    and (n.expires_at is null or n.expires_at > now());

grant select on public.news_public to anon, authenticated;
