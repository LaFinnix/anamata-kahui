-- =============================================================================
-- Anamata Kāhui — research papers infrastructure
-- =============================================================================
-- Adds:
--   - research_documents (the paper itself)
--   - research_document_authors (many-to-many to profiles)
--   - research_document_keywords (free-text tags)
--   - research_document_citations (cross-link to waiata)
--   - research_field_projects (live fieldwork tracker)
--
-- All tables have RLS enabled. Public read of published papers; staff write.
-- iwi_consent_id is FK to iwi_gates — every paper that touches iwi cultural
-- material must have a corresponding gate.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. research_documents
-- ---------------------------------------------------------------------------
create table if not exists public.research_documents (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid not null references public.branches (id) on delete restrict,
  title           text not null,
  abstract        text,
  publication_date date,
  doi             text,
  pdf_url         text,
  language_code   text default 'en',
  iwi_consent_id  uuid references public.iwi_gates (id) on delete set null,
  access_tier     text not null default 'open'
                    check (access_tier in ('open', 'iwi_only', 'restricted', 'tapu')),
  methodology     text,
  venue           text,           -- journal / conference / report series
  status          text not null default 'draft'
                    check (status in ('draft', 'submitted', 'in_review', 'published', 'retracted')),
  keywords        text[] default '{}',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_research_docs_branch on public.research_documents (branch_id);
create index if not exists idx_research_docs_status on public.research_documents (status);
create index if not exists idx_research_docs_doi on public.research_documents (doi);
create index if not exists idx_research_docs_keywords on public.research_documents using gin (keywords);

drop trigger if exists trg_research_docs_updated_at on public.research_documents;
create trigger trg_research_docs_updated_at
  before update on public.research_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. research_document_authors
-- ---------------------------------------------------------------------------
create table if not exists public.research_document_authors (
  id                  uuid primary key default gen_random_uuid(),
  document_id         uuid not null references public.research_documents (id) on delete cascade,
  author_profile_id   uuid references public.profiles (id) on delete set null,
  author_name         text,             -- denormalised in case no profile
  affiliation         text,
  position            int not null default 0,  -- author order
  is_corresponding    boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists idx_research_doc_authors_doc on public.research_document_authors (document_id);
create index if not exists idx_research_doc_authors_profile on public.research_document_authors (author_profile_id);

-- ---------------------------------------------------------------------------
-- 3. research_document_citations — cross-link papers to waiata or other papers
-- ---------------------------------------------------------------------------
create table if not exists public.research_document_citations (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references public.research_documents (id) on delete cascade,
  -- Polymorphic: cite either another research_doc, or a release, or an external URL.
  cited_doc_id    uuid references public.research_documents (id) on delete cascade,
  cited_release_id uuid references public.releases (id) on delete cascade,
  external_url    text,
  citation_text   text,             -- e.g. "Smith, 2024"
  created_at      timestamptz not null default now(),
  -- Exactly one of (cited_doc_id, cited_release_id, external_url) must be set.
  constraint research_citation_one_target check (
    (cited_doc_id is not null)::int +
    (cited_release_id is not null)::int +
    (external_url is not null)::int = 1
  )
);

create index if not exists idx_research_citations_doc on public.research_document_citations (document_id);
create index if not exists idx_research_citations_cited_doc on public.research_document_citations (cited_doc_id);
create index if not exists idx_research_citations_cited_release on public.research_document_citations (cited_release_id);

-- ---------------------------------------------------------------------------
-- 4. research_field_projects — live fieldwork tracker
-- ---------------------------------------------------------------------------
create table if not exists public.research_field_projects (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  lead_profile_id uuid references public.profiles (id) on delete set null,
  iwi_consent_id  uuid references public.iwi_gates (id) on delete set null,
  location        text,
  start_date      date,
  end_date        date,
  status          text not null default 'planning'
                    check (status in ('planning', 'active', 'paused', 'completed', 'archived')),
  summary         text,
  methodology     text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_field_projects_status on public.research_field_projects (status);
create index if not exists idx_field_projects_lead on public.research_field_projects (lead_profile_id);

drop trigger if exists trg_field_projects_updated_at on public.research_field_projects;
create trigger trg_field_projects_updated_at
  before update on public.research_field_projects
  for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.research_documents         enable row level security;
alter table public.research_document_authors  enable row level security;
alter table public.research_document_citations enable row level security;
alter table public.research_field_projects     enable row level security;

-- research_documents: published papers public-readable; metadata is gated.
create policy "research_docs_public_read_published"
  on public.research_documents for select
  using (status = 'published' and access_tier = 'open');

create policy "research_docs_read_branch_members"
  on public.research_documents for select
  using (
    auth.role() = 'authenticated'
    and (
      public.has_branch_access(branch_id)
      or public.is_super_admin()
    )
  );

create policy "research_docs_write_kaitiaki_or_super"
  on public.research_documents for all
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

-- authors: public-readable alongside the parent document
create policy "research_doc_authors_public_read"
  on public.research_document_authors for select
  using (true);

create policy "research_doc_authors_write_kaitiaki"
  on public.research_document_authors for all
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

-- citations: public-readable
create policy "research_doc_citations_public_read"
  on public.research_document_citations for select
  using (true);

create policy "research_doc_citations_write_kaitiaki"
  on public.research_document_citations for all
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

-- field projects: public read of active/completed; write is kaitiaki+
create policy "research_field_projects_public_read_active"
  on public.research_field_projects for select
  using (status in ('active', 'completed'));

create policy "research_field_projects_read_branch_members"
  on public.research_field_projects for select
  using (
    auth.role() = 'authenticated'
    and (
      public.is_super_admin()
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('kaitiaki', 'branch_admin')
      )
    )
  );

create policy "research_field_projects_write_kaitiaki"
  on public.research_field_projects for all
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
