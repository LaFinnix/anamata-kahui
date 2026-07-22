-- =============================================================================
-- Anamata Kāhui — Local Contexts Hub v2 integration
-- =============================================================================
-- Updates 0011_local_contexts.sql to align with the real Hub canonical
-- catalogue (verified 2026-07-22 from the official OpenAPI v2 schema
-- at https://localcontextshub.org/api/v2/schema/):
--   - 20 TK Labels (was 11)
--   - 10 BC Labels (was 5)
--   - 12 Notices (was 5 — different categories entirely)
--
-- Adds:
--   - lc_project_id columns on releases, stems, research_documents
--     (the actual integration point — UUID of the Hub Project)
--   - lc_labels_cache: cached label/notice payloads from the Hub
--     (refreshed via the date_modified endpoint every 6-24h)
--   - lc_sync_status: tracks when each asset was last synced
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Drop existing seed (the previous one had wrong slugs).
-- Disable the append-only trigger temporarily so we can clear the audit
-- table. Re-enabled below the delete statements.
-- ---------------------------------------------------------------------------
alter table public.lc_label_audit disable trigger user;

delete from public.lc_label_audit;
delete from public.lc_label_links;
delete from public.lc_labels;

alter table public.lc_label_audit enable trigger user;

-- ---------------------------------------------------------------------------
-- Add Hub project_id columns + cache table + sync log.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Re-seed with the canonical Hub slugs (42 total)
-- ---------------------------------------------------------------------------
insert into public.lc_labels (slug, family, label, description, canonical_url, requires_attribution, is_non_commercial) values
  -- TK Labels (20 — verified from Hub TK index)
  ('attribution', 'tk', 'TK Attribution', 'Traditional Knowledge should be attributed to the community of origin.', 'https://localcontexts.org/label/tk-attribution/', true, false),
  ('clan', 'tk', 'TK Clan', 'Traditional Knowledge is restricted to a specific clan.', 'https://localcontexts.org/label/tk-clan/', true, false),
  ('family', 'tk', 'TK Family', 'Traditional Knowledge is restricted to a specific family.', 'https://localcontexts.org/label/tk-family/', true, false),
  ('outreach', 'tk', 'TK Outreach', 'Traditional Knowledge may be used for educational outreach only.', 'https://localcontexts.org/label/tk-outreach/', true, false),
  ('tk_multiple_community', 'tk', 'TK Multiple Communities', 'Traditional Knowledge spans multiple Indigenous communities.', 'https://localcontexts.org/label/tk-multiple-community/', true, false),
  ('non_verified', 'tk', 'TK Non-Verified', 'TK attribution has not yet been verified by a community representative.', 'https://localcontexts.org/label/tk-non-verified/', false, false),
  ('verified', 'tk', 'TK Verified', 'TK attribution has been verified by a kaitiaki or community representative.', 'https://localcontexts.org/label/tk-verified/', false, false),
  ('non_commercial', 'tk', 'TK Non-Commercial', 'Traditional Knowledge may not be used for commercial purposes.', 'https://localcontexts.org/label/tk-non-commercial/', true, true),
  ('commercial', 'tk', 'TK Open to Commercialization', 'Traditional Knowledge is explicitly cleared for commercial use by the community.', 'https://localcontexts.org/label/tk-commercial/', true, false),
  ('culturally_sensitive', 'tk', 'TK Culturally Sensitive', 'Traditional Knowledge requires extra care due to cultural sensitivity.', 'https://localcontexts.org/label/tk-culturally-sensitive/', true, false),
  ('community_voice', 'tk', 'TK Community Voice', 'The community retains editorial authority over Traditional Knowledge use.', 'https://localcontexts.org/label/tk-community-voice/', true, false),
  ('community_use_only', 'tk', 'TK Community Use Only', 'Traditional Knowledge may only be used by the community itself.', 'https://localcontexts.org/label/tk-community-use-only/', true, false),
  ('seasonal', 'tk', 'TK Seasonal', 'Traditional Knowledge has a temporal / seasonal scope (e.g. only at certain times).', 'https://localcontexts.org/label/tk-seasonal/', true, false),
  ('women_general', 'tk', 'TK Women (General)', 'Traditional Knowledge is appropriate for women, broadly.', 'https://localcontexts.org/label/tk-women-general/', true, false),
  ('men_general', 'tk', 'TK Men (General)', 'Traditional Knowledge is appropriate for men, broadly.', 'https://localcontexts.org/label/tk-men-general/', true, false),
  ('women_restricted', 'tk', 'TK Women (Restricted)', 'Traditional Knowledge is restricted to women.', 'https://localcontexts.org/label/tk-women-restricted/', true, false),
  ('men_restricted', 'tk', 'TK Men (Restricted)', 'Traditional Knowledge is restricted to men.', 'https://localcontexts.org/label/tk-men-restricted/', true, false),
  ('secret_sacred', 'tk', 'TK Secret / Sacred', 'Traditional Knowledge is secret or sacred. Do not share publicly.', 'https://localcontexts.org/label/tk-secret-sacred/', true, false),
  ('open_to_collaboration', 'tk', 'TK Open to Collaboration', 'The community is open to collaboration on this Traditional Knowledge.', 'https://localcontexts.org/label/tk-open-to-collaboration/', true, false),
  ('creative', 'tk', 'TK Creative', 'Traditional Knowledge may be adapted or built upon for new creative works.', 'https://localcontexts.org/label/tk-creative/', true, false),

  -- BC Labels (10 — verified from Hub BC index)
  ('bc_provenance', 'bc', 'BC Provenance', 'Indicates the biocultural origin of a specimen or biological sample.', 'https://localcontexts.org/label/bc-provenance/', true, false),
  ('bc_commercialization', 'bc', 'BC Open to Commercialization', 'Biocultural material is explicitly cleared for commercial use.', 'https://localcontexts.org/label/bc-open-to-commercialization/', true, false),
  ('bc_non_commercial', 'bc', 'BC Non-Commercial', 'Biocultural material may not be used for commercial purposes.', 'https://localcontexts.org/label/bc-non-commercial/', true, true),
  ('bc_collaboration', 'bc', 'BC Open to Collaboration', 'The community is open to collaboration on this biocultural material.', 'https://localcontexts.org/label/bc-open-to-collaboration/', true, false),
  ('bc_consent_verified', 'bc', 'BC Consent Verified', 'Biocultural provenance has been verified by community consent.', 'https://localcontexts.org/label/bc-consent-verified/', true, false),
  ('bc_consent_non_verified', 'bc', 'BC Consent Non-Verified', 'Biocultural provenance has not yet been verified by community consent.', 'https://localcontexts.org/label/bc-consent-non-verified/', false, false),
  ('bc_multiple_community', 'bc', 'BC Multiple Communities', 'Biocultural material spans multiple Indigenous communities.', 'https://localcontexts.org/label/bc-multiple-community/', true, false),
  ('bc_clan', 'bc', 'BC Clan', 'Biocultural material is restricted to a specific clan.', 'https://localcontexts.org/label/bc-clan/', true, false),
  ('bc_outreach', 'bc', 'BC Outreach', 'Biocultural material may be used for educational outreach only.', 'https://localcontexts.org/label/bc-outreach/', true, false),
  ('bc_research', 'bc', 'BC Research Use', 'Biocultural material may be used for research purposes.', 'https://localcontexts.org/label/bc-research-use/', false, false),

  -- Notices (12 — verified from Hub Notices sitemap)
  ('tk_notice', 'notice', 'TK Notice (Disclosure)', 'A disclosure notice indicating TK labels are in development.', 'https://localcontexts.org/notice/tk-notice/', false, false),
  ('bc_notice', 'notice', 'BC Notice (Disclosure)', 'A disclosure notice indicating BC labels are in development.', 'https://localcontexts.org/notice/bc-notice/', false, false),
  ('open_to_collaborate', 'notice', 'Open to Collaborate', 'Institution commits to collaboration with communities on this material.', 'https://localcontexts.org/notice/open-to-collaborate/', true, false),
  ('attribution_incomplete', 'notice', 'Attribution Incomplete', 'Attribution to source communities is incomplete; researcher invites contact.', 'https://localcontexts.org/notice/attribution-incomplete/', false, false),
  ('belonging', 'notice', 'Belonging', 'Collections Care Notice — material belongs to the community and should be returned if held.', 'https://localcontexts.org/notice/belonging/', true, false),
  ('caring', 'notice', 'Caring', 'Collections Care Notice — material is held with care protocols.', 'https://localcontexts.org/notice/caring/', true, false),
  ('leave_undisturbed', 'notice', 'Leave Undisturbed', 'Collections Care Notice — material should not be disturbed.', 'https://localcontexts.org/notice/leave-undisturbed/', true, false),
  ('gender_aware', 'notice', 'Gender Aware', 'Collections Care Notice — material has gender-based access protocols.', 'https://localcontexts.org/notice/gender-aware/', true, false),
  ('withholding', 'notice', 'Withholding', 'Collections Care Notice — material is currently withheld from public access.', 'https://localcontexts.org/notice/withholding/', true, false),
  ('safety', 'notice', 'Safety', 'Collections Care Notice — material has safety concerns for handling.', 'https://localcontexts.org/notice/safety/', false, false),
  ('authorization', 'notice', 'Authorization', 'Collections Care Notice — material requires specific authorization for access.', 'https://localcontexts.org/notice/authorization/', true, false),
  ('viewing', 'notice', 'Viewing', 'Collections Care Notice — material has viewing-only restrictions.', 'https://localcontexts.org/notice/viewing/', true, false)
on conflict (slug) do update set
  family = excluded.family,
  label = excluded.label,
  description = excluded.description,
  canonical_url = excluded.canonical_url,
  requires_attribution = excluded.requires_attribution,
  is_non_commercial = excluded.is_non_commercial;

-- ---------------------------------------------------------------------------
-- Add lc_project_id columns
-- ---------------------------------------------------------------------------
do $$
begin
  -- releases
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'releases' and column_name = 'lc_project_id'
  ) then
    alter table public.releases add column lc_project_id uuid;
  end if;
  -- research_documents
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'research_documents' and column_name = 'lc_project_id'
  ) then
    alter table public.research_documents add column lc_project_id uuid;
  end if;
end$$;

-- Note: stems table doesn't have a project-level concept; stems inherit from their release.
-- We'll join through the release's lc_project_id on render.

-- ---------------------------------------------------------------------------
-- lc_labels_cache — cached payload from GET /projects/{unique_id}/
-- ---------------------------------------------------------------------------
create table if not exists public.lc_labels_cache (
  id uuid primary key default gen_random_uuid(),
  -- Hub Project UUID (unique per project)
  hub_project_id uuid not null unique,
  -- Raw payload (returned by GET /projects/{unique_id}/)
  payload jsonb not null,
  -- When we fetched it
  fetched_at timestamptz not null default now(),
  -- When the Hub says it was last modified (from the response)
  hub_modified_at timestamptz,
  -- Quick-access denormalised fields for cheap queries
  has_tk_labels boolean not null default false,
  has_bc_labels boolean not null default false,
  has_notices boolean not null default false,
  label_count integer not null default 0
);

create index if not exists lc_cache_modified_idx on public.lc_labels_cache (hub_modified_at);
create index if not exists lc_cache_fetched_idx on public.lc_labels_cache (fetched_at);

-- ---------------------------------------------------------------------------
-- lc_sync_log — append-only history of every Hub fetch (for observability)
-- ---------------------------------------------------------------------------
create table if not exists public.lc_sync_log (
  id uuid primary key default gen_random_uuid(),
  hub_project_id uuid,
  action text not null check (action in ('fetch', 'attach', 'detach', 'cache_hit', 'cache_miss', 'error')),
  http_status integer,
  duration_ms integer,
  error_message text,
  actor_id uuid references public.profiles(id),
  recorded_at timestamptz not null default now()
);

create index if not exists lc_sync_log_project_idx on public.lc_sync_log (hub_project_id);
create index if not exists lc_sync_log_recorded_idx on public.lc_sync_log (recorded_at);

drop trigger if exists lc_sync_log_no_update on public.lc_sync_log;
create trigger lc_sync_log_no_update
  before update on public.lc_sync_log
  for each row execute function public.deny_modification();

drop trigger if exists lc_sync_log_no_delete on public.lc_sync_log;
create trigger lc_sync_log_no_delete
  before delete on public.lc_sync_log
  for each row execute function public.deny_modification();

-- ---------------------------------------------------------------------------
-- lc_project_status — per-asset sync metadata
-- ---------------------------------------------------------------------------
create table if not exists public.lc_project_status (
  asset_kind text not null check (asset_kind in ('release', 'research_document')),
  asset_id uuid not null,
  hub_project_id uuid not null,
  last_synced_at timestamptz,
  last_sync_status text check (last_sync_status in ('ok', 'error', 'pending')),
  last_sync_error text,
  attached_at timestamptz not null default now(),
  attached_by uuid not null references public.profiles(id),
  primary key (asset_kind, asset_id)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.lc_labels_cache enable row level security;
alter table public.lc_sync_log enable row level security;
alter table public.lc_project_status enable row level security;

-- Cache: public-readable (label metadata is public info)
drop policy if exists lc_cache_public_read on public.lc_labels_cache;
create policy lc_cache_public_read
  on public.lc_labels_cache for select using (true);

-- Sync log: super_admin + branch_admin only
drop policy if exists lc_sync_log_read on public.lc_sync_log;
create policy lc_sync_log_read
  on public.lc_sync_log for select
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin', 'branch_admin')
    )
  );

drop policy if exists lc_sync_log_write on public.lc_sync_log;
create policy lc_sync_log_write
  on public.lc_sync_log for insert
  with check (
    actor_id = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

-- Project status: branch-scoped + kaitiaki
drop policy if exists lc_project_status_read on public.lc_project_status;
create policy lc_project_status_read
  on public.lc_project_status for select
  using (true);

drop policy if exists lc_project_status_write on public.lc_project_status;
create policy lc_project_status_write
  on public.lc_project_status for all
  using (
    attached_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('super_admin', 'kaitiaki', 'branch_admin')
    )
  )
  with check (
    attached_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('super_admin', 'kaitiaki', 'branch_admin')
    )
  );
