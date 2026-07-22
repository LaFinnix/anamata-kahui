-- =============================================================================
-- Anamata Kāhui — Local Contexts Hub integration
-- =============================================================================
-- Implements machine-readable Traditional Knowledge (TK) and Biocultural
-- (BC) labels via the Local Contexts Hub standard.
-- Source: https://localcontexts.org
--
-- Three label families:
--   1. TK Labels — Traditional Knowledge usage protocols (e.g. TK Attribution,
--      TK Non-Commercial, TK Clan, TK Family, TK Outreach, TK Verified)
--   2. BC Labels — Biocultural origin labels (e.g. BC Provenance, BC Consent
--      Verified, BC Open to Collaboration)
--   3. Notices — Researcher / community / kaitiaki notices attached to assets
--
-- Labels are versioned and immutable. Once a label is added to an asset,
-- it's locked. Removing a label requires a new "removed" entry on the link
-- (audit trail preserved). Updates are new versions.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums (Local Contexts canonical names — kept verbatim to match their API)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lc_label_type') then
    create type public.lc_label_type as enum (
      -- TK Labels (20 — verified from Hub TK index 2026-07-22)
      'attribution', 'clan', 'family', 'outreach', 'tk_multiple_community',
      'non_verified', 'verified', 'non_commercial', 'commercial',
      'culturally_sensitive', 'community_voice', 'community_use_only',
      'seasonal', 'women_general', 'men_general', 'women_restricted',
      'men_restricted', 'secret_sacred', 'open_to_collaboration', 'creative',
      -- BC Labels (10)
      'bc_provenance', 'bc_commercialization', 'bc_non_commercial',
      'bc_collaboration', 'bc_consent_verified', 'bc_consent_non_verified',
      'bc_multiple_community', 'bc_clan', 'bc_outreach', 'bc_research',
      -- Notices (12)
      'tk_notice', 'bc_notice', 'open_to_collaborate', 'attribution_incomplete',
      'belonging', 'caring', 'leave_undisturbed', 'gender_aware',
      'withholding', 'safety', 'authorization', 'viewing',
      -- Internal/legacy
      'custom'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'lc_label_family') then
    create type public.lc_label_family as enum ('tk', 'bc', 'notice');
  end if;
  if not exists (select 1 from pg_type where typname = 'lc_link_status') then
    create type public.lc_link_status as enum ('active', 'removed', 'superseded');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 1. lc_labels — every label we know about (catalog)
-- ---------------------------------------------------------------------------
create table if not exists public.lc_labels (
  id uuid primary key default gen_random_uuid(),
  -- Stable slug matching Local Contexts canonical names
  slug public.lc_label_type not null unique,
  family public.lc_label_family not null,
  label text not null,
  description text not null,
  -- Optional URL to the Local Contexts canonical documentation page
  canonical_url text,
  -- Whether the label requires kaitiaki / community attribution
  requires_attribution boolean not null default true,
  -- Whether the label restricts commercial use
  is_non_commercial boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists lc_labels_family_idx on public.lc_labels (family);

-- ---------------------------------------------------------------------------
-- 2. lc_label_links — many-to-many between labels and assets
-- ---------------------------------------------------------------------------
create table if not exists public.lc_label_links (
  id uuid primary key default gen_random_uuid(),
  -- Polymorphic target: references either a release or a research_document
  -- (or stem, in a future migration). For now: release or research_document.
  release_id uuid references public.releases(id) on delete cascade,
  research_document_id uuid references public.research_documents(id) on delete cascade,
  -- Which label is being applied
  label_id uuid not null references public.lc_labels(id) on delete restrict,
  -- Who applied it (kaitiaki / researcher / artist themselves)
  applied_by uuid not null references public.profiles(id),
  applied_at timestamptz not null default now(),
  -- Optional evidence / source URL
  evidence_url text,
  -- Optional scope qualifier (which part of the asset this label covers)
  scope text,
  status public.lc_link_status not null default 'active',
  -- CHECK: must reference at least one asset
  constraint lc_link_target check (
    release_id is not null or research_document_id is not null
  )
);

create index if not exists lc_label_links_release_idx on public.lc_label_links (release_id);
create index if not exists lc_label_links_doc_idx on public.lc_label_links (research_document_id);
create index if not exists lc_label_links_label_idx on public.lc_label_links (label_id);
create index if not exists lc_label_links_status_idx on public.lc_label_links (status);

-- Active-only partial index for fast active-label queries
create unique index if not exists lc_label_links_active_release_idx
  on public.lc_label_links (release_id, label_id)
  where release_id is not null and status = 'active';
create unique index if not exists lc_label_links_active_doc_idx
  on public.lc_label_links (research_document_id, label_id)
  where research_document_id is not null and status = 'active';

-- ---------------------------------------------------------------------------
-- 3. lc_label_audit — append-only history of every label event
-- ---------------------------------------------------------------------------
create table if not exists public.lc_label_audit (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.lc_label_links(id) on delete cascade,
  action public.lc_link_status not null,
  actor_id uuid not null references public.profiles(id),
  reason text,
  recorded_at timestamptz not null default now()
);

create index if not exists lc_label_audit_link_idx on public.lc_label_audit (link_id);

drop trigger if exists lc_label_audit_no_update on public.lc_label_audit;
create trigger lc_label_audit_no_update
  before update on public.lc_label_audit
  for each row execute function public.deny_modification();

drop trigger if exists lc_label_audit_no_delete on public.lc_label_audit;
create trigger lc_label_audit_no_delete
  before delete on public.lc_label_audit
  for each row execute function public.deny_modification();

-- ---------------------------------------------------------------------------
-- Seed: canonical Local Contexts label catalogue
-- ---------------------------------------------------------------------------
insert into public.lc_labels
  (slug, family, label, description, canonical_url, requires_attribution, is_non_commercial)
values
  -- TK labels
  ('tk_attribution', 'tk', 'TK Attribution',
   'Traditional Knowledge should be attributed to the community of origin.',
   'https://localcontexts.org/label/tk-attribution/', true, false),
  ('tk_non_commercial', 'tk', 'TK Non-Commercial',
   'Traditional Knowledge may not be used for commercial purposes.',
   'https://localcontexts.org/label/tk-non-commercial/', true, true),
  ('tk_clan', 'tk', 'TK Clan',
   'Traditional Knowledge is restricted to a specific clan.',
   'https://localcontexts.org/label/tk-clan/', true, false),
  ('tk_family', 'tk', 'TK Family',
   'Traditional Knowledge is restricted to a specific family.',
   'https://localcontexts.org/label/tk-family/', true, false),
  ('tk_outreach', 'tk', 'TK Outreach',
   'Traditional Knowledge may be used for educational outreach only.',
   'https://localcontexts.org/label/tk-outreach/', true, false),
  ('tk_verified', 'tk', 'TK Verified',
   'Traditional Knowledge attribution has been verified by a kaitiaki or community representative.',
   'https://localcontexts.org/label/tk-verified/', false, false),
  ('tk_creative', 'tk', 'TK Creative',
   'Traditional Knowledge may be adapted or built upon for new creative works.',
   'https://localcontexts.org/label/tk-creative/', true, false),
  ('tk_secret_sacred', 'tk', 'TK Secret / Sacred',
   'Traditional Knowledge is secret or sacred. Do not share publicly.',
   'https://localcontexts.org/label/tk-secret-sacred/', true, false),
  ('tk_sensitive_men', 'tk', 'TK Men',
   'Traditional Knowledge is restricted to men.',
   'https://localcontexts.org/label/tk-men/', true, false),
  ('tk_sensitive_women', 'tk', 'TK Women',
   'Traditional Knowledge is restricted to women.',
   'https://localcontexts.org/label/tk-women/', true, false),
  ('tk_sensitive_children', 'tk', 'TK Children',
   'Traditional Knowledge is restricted to children.',
   'https://localcontexts.org/label/tk-children/', true, false),
  -- BC labels
  ('bc_provenance', 'bc', 'BC Provenance',
   'Indicates the biocultural origin of a specimen or biological sample.',
   'https://localcontexts.org/label/bc-provenance/', true, false),
  ('bc_consent_verified', 'bc', 'BC Consent Verified',
   'Biocultural provenance has been verified by community consent.',
   'https://localcontexts.org/label/bc-consent-verified/', true, false),
  ('bc_open_to_collaboration', 'bc', 'BC Open to Collaboration',
   'The community is open to collaboration on this biocultural material.',
   'https://localcontexts.org/label/bc-open-to-collaboration/', true, false),
  ('bc_consent_optional', 'bc', 'BC Consent Optional',
   'Biocultural origin tracking is encouraged but not required.',
   'https://localcontexts.org/label/bc-consent-optional/', false, false),
  ('bc_creative', 'bc', 'BC Creative',
   'Biocultural material may be adapted for creative works.',
   'https://localcontexts.org/label/bc-creative/', true, false),
  -- Notices
  ('notice_open_with_care', 'notice', 'Open with CARE',
   'This material is shared with the CARE Principles for Indigenous Data Governance in mind.',
   'https://localcontexts.org/label/notice-open-with-care/', false, false),
  ('notice_open_with_attribution', 'notice', 'Open with Attribution',
   'Open-source notice requiring attribution to the community of origin.',
   'https://localcontexts.org/label/notice-open-with-attribution/', true, false),
  ('notice_research_only', 'notice', 'Research Only',
   'Notice restricting use to research contexts only.',
   'https://localcontexts.org/label/notice-research-only/', false, false),
  ('notice_community_voice', 'notice', 'Community Voice',
   'Community voice notice — the community retains editorial authority.',
   'https://localcontexts.org/label/notice-community-voice/', true, false),
  ('notice_kaitiaki_consultation', 'notice', 'Kaitiaki Consultation',
   'Kaitiaki have been consulted and have provided input on this material.',
   'https://localcontexts.org/label/notice-kaitiaki-consultation/', true, false)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.lc_labels enable row level security;
alter table public.lc_label_links enable row level security;
alter table public.lc_label_audit enable row level security;

-- lc_labels — read-only catalogue. Public can read (labels are public knowledge).
drop policy if exists lc_labels_public_read on public.lc_labels;
create policy lc_labels_public_read
  on public.lc_labels for select
  using (true);

drop policy if exists lc_labels_super_admin_write on public.lc_labels;
create policy lc_labels_super_admin_write
  on public.lc_labels for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- lc_label_links
-- Read: branch-scoped for releases, public-readable for active labels on releases
drop policy if exists lc_link_release_read on public.lc_label_links;
create policy lc_link_release_read
  on public.lc_label_links for select
  using (
    -- Active labels on releases are publicly readable
    (status = 'active' and release_id is not null
     and exists (
       select 1 from public.releases r
       where r.id = lc_label_links.release_id
     ))
    or
    -- Active labels on published research are publicly readable
    (status = 'active' and research_document_id is not null
     and exists (
       select 1 from public.research_documents d
       where d.id = lc_label_links.research_document_id and d.status = 'published'
     ))
    or
    -- Branch members / admins / kaitiaki can see everything (including removed/superseded)
    exists (
      select 1 from public.releases r
      where r.id = lc_label_links.release_id
        and (public.has_branch_access(r.branch_id) or public.is_super_admin())
    )
    or
    exists (
      select 1 from public.research_documents d
      join public.branches b on b.id = d.branch_id
      where d.id = lc_label_links.research_document_id
        and (public.has_branch_access(b.id) or public.is_super_admin())
    )
  );

drop policy if exists lc_link_apply on public.lc_label_links;
create policy lc_link_apply
  on public.lc_label_links for insert
  with check (
    applied_by = auth.uid()
    and (
      -- Artist on the release can apply
      exists (
        select 1 from public.releases r
        where r.id = lc_label_links.release_id
          and (public.has_branch_access(r.branch_id) or public.is_super_admin())
      )
      or
      -- Author on the research doc can apply
      exists (
        select 1 from public.research_documents d
        join public.research_document_authors a on a.document_id = d.id
        where d.id = lc_label_links.research_document_id
          and a.author_profile_id = auth.uid()
      )
      or
      -- Kaitiaki can always apply
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('kaitiaki', 'super_admin')
      )
    )
  );

drop policy if exists lc_link_remove on public.lc_label_links;
create policy lc_link_remove
  on public.lc_label_links for update
  using (
    applied_by = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('kaitiaki', 'super_admin')
    )
  );

drop policy if exists lc_link_delete on public.lc_label_links;
create policy lc_link_delete
  on public.lc_label_links for delete
  using (public.is_super_admin());

-- lc_label_audit
drop policy if exists lc_audit_read on public.lc_label_audit;
create policy lc_audit_read
  on public.lc_label_audit for select
  using (
    exists (
      select 1 from public.lc_label_links l
      where l.id = lc_label_audit.link_id
    )
  );

drop policy if exists lc_audit_write on public.lc_label_audit;
create policy lc_audit_write
  on public.lc_label_audit for insert
  with check (actor_id = auth.uid());

-- lc_label_audit UPDATE/DELETE blocked by deny_modification trigger
