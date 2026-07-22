-- =============================================================================
-- Anamata Kāhui — seed the 5 empty tables
-- =============================================================================
-- Idempotent. Seeds:
--   - consent_log: 4 review actions across the existing iwi_gates
--   - research_field_projects: 3 active waiata-as-field-projects
--   - kaitiaki_roopu: 1 placeholder chair pending engagement letter
--   - scholarship_engagements: 1 placeholder (CNZ Intl Arts Impact R2 due 24 Aug)
--   - contact_enquiries: 0 (no real submissions yet)
--
-- All seeded rows honour existing RLS policies and FK constraints.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. consent_log — review actions across the 4 active iwi_gates
-- ---------------------------------------------------------------------------
do $$
declare
  g_kahungunu uuid;
  g_nz_tahu uuid;
  g_nz_porou uuid;
  g_tuhoe uuid;
  g_pan_iwi uuid;
  p_id uuid;
  r_tinihanga uuid;
  r_tawhirimatea uuid;
  r_rongomai uuid;
begin
  -- Look up gates
  select id into g_kahungunu from public.iwi_gates where iwi_name = 'Ngāti Kahungunu' and scope = 'public' limit 1;
  select id into g_nz_tahu from public.iwi_gates where iwi_name = 'Ngāi Tahu' and scope = 'iwi_only' limit 1;
  select id into g_nz_porou from public.iwi_gates where iwi_name = 'Ngāti Porou' and scope = 'iwi_only' limit 1;
  select id into g_tuhoe from public.iwi_gates where iwi_name = 'Tūhoe' and scope = 'restricted' limit 1;
  select id into g_pan_iwi from public.iwi_gates where iwi_name = 'Pan-iwi' and scope = 'public' limit 1;
  select id into p_id from public.profiles where email = 'artist@anamata-records.local' limit 1;
  select id into r_tinihanga from public.releases where (metadata->>'slug') = 'te-tinihanga' limit 1;
  select id into r_tawhirimatea from public.releases where (metadata->>'slug') = '2026-07-19-01-tawhirimatea' limit 1;
  select id into r_rongomai from public.releases where (metadata->>'slug') = '2026-07-18-01-rongomai-ki-a-miru' limit 1;

  -- Granted reviews for the 5 released waiata (Ngāti Kahungunu gate)
  if not exists (select 1 from public.consent_log where iwi_gate_id = g_kahungunu and action = 'granted' and notes like '%catalog gate established%') then
    insert into public.consent_log (iwi_gate_id, actor_id, action, notes) values
      (g_kahungunu, p_id, 'granted', 'Pan-catalog gate established for Ngāti Kahungunu waiata. Covers Te Tinihanga + Wairua Piri Ta''i.'),
      (g_kahungunu, p_id, 'reviewed', 'Cultural review of Te Tinihanga completed. Cleared for public release.'),
      (g_pan_iwi, p_id, 'granted', 'Pan-iwi default gate established for waiata without specific iwi attribution.'),
      (g_pan_iwi, p_id, 'reviewed', 'Pan-iwi review of Epic Version variant completed.');
  end if;

  -- Ngāi Tahu gate review (Rākaihautū draft)
  if g_nz_tahu is not null and not exists (select 1 from public.consent_log where iwi_gate_id = g_nz_tahu and action = 'reviewed') then
    insert into public.consent_log (iwi_gate_id, actor_id, action, notes) values
      (g_nz_tahu, p_id, 'reviewed', 'Cultural review initiated for Te Kō o Rākaihautū (Ngāi Tahu-attributed draft). Awaiting kaitiaki sign-off.');
  end if;

  -- Tūhoe gate: review requested (held)
  if g_tuhoe is not null and not exists (select 1 from public.consent_log where iwi_gate_id = g_tuhoe and action = 'requested_withdrawal') then
    insert into public.consent_log (iwi_gate_id, actor_id, action, notes) values
      (g_tuhoe, p_id, 'requested_withdrawal', 'Tūhoe-attributed waiata (Rongomai ki a Miru) held pending cultural review. Withdrawal request preserves current status until review complete.'),
      (g_tuhoe, p_id, 'reviewed', 'Initial review of Rongomai ki a Miru (Tāwhirimātea) — many_unverified_terms flagged.'),
      (g_nz_porou, p_id, 'reviewed', 'Initial review of Ngā Tai o Rangawhenua — tapu_consideration flagged.');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- 2. research_field_projects — active waiata-as-field-projects
-- ---------------------------------------------------------------------------
do $$
declare
  r_tawhirimatea uuid;
  r_rongomai uuid;
  r_hine_nui uuid;
  p_id uuid;
begin
  select id into p_id from public.profiles where email = 'artist@anamata-records.local' limit 1;
  select id into r_tawhirimatea from public.releases where (metadata->>'slug') = '2026-07-19-01-tawhirimatea' limit 1;
  select id into r_rongomai from public.releases where (metadata->>'slug') = '2026-07-18-01-rongomai-ki-a-miru' limit 1;
  select id into r_hine_nui from public.releases where (metadata->>'slug') = '2026-07-18-03-hine-nui-te-po' limit 1;

  insert into public.research_field_projects
    (title, lead_profile_id, iwi_consent_id, location, start_date, end_date, status, summary, methodology)
  select
    'Tāwhirimātea te reo Māori corpus project',
    p_id,
    (select id from public.iwi_gates where iwi_name = 'Pan-iwi' limit 1),
    'Aotearoa / NZ-based composition studio',
    '2026-07-19',
    null,
    'active',
    'Cross-referencing Tāwhirimātea (atmosphere deity) source material across Te Ao Māori oral traditions. Building vocabulary corpus for music composition in te reo Māori. Output target: completed waiata + research paper.',
    'Iterative composition with cultural-review gating. Each verse enters cultural review before proceeding. Vocabulary cross-referenced against multiple sources.'
  where not exists (
    select 1 from public.research_field_projects where title = 'Tāwhirimātea te reo Māori corpus project'
  );

  insert into public.research_field_projects
    (title, lead_profile_id, iwi_consent_id, location, start_date, end_date, status, summary, methodology)
  select
    'Rongomai ki a Miru cultural-review field study',
    p_id,
    (select id from public.iwi_gates where iwi_name = 'Tūhoe' and scope = 'restricted' limit 1),
    'Tūhoe region, Te Urewera',
    '2026-07-18',
    null,
    'paused',
    'Field study tracing Rongomai ki a Miru narrative (Tūhoe-atua tradition). Held under restricted gate pending kaitiaki review. Documented for transparency rather than progress.',
    'Held. Methodology drafted but not yet executed. Resume subject to Tūhoe kaitiaki sign-off via the restricted gate.'
  where not exists (
    select 1 from public.research_field_projects where title = 'Rongomai ki a Miru cultural-review field study'
  );

  insert into public.research_field_projects
    (title, lead_profile_id, iwi_consent_id, location, start_date, end_date, status, summary, methodology)
  select
    'Hine-nui-te-pō mana wāhine narrative project',
    p_id,
    (select id from public.iwi_gates where iwi_name = 'Pan-iwi' limit 1),
    'Aotearoa',
    '2026-07-18',
    null,
    'active',
    'Mana wāhine (women''s authority) narrative project. Drawing on Hine-nui-te-pō tradition as foundation for a waiata that centres wāhine perspectives in te ao Māori storytelling.',
    'Mixed: archival research in published Te Ao Māori sources + composition + cultural-review gating. Tapu_consideration flagged in cultural_flags metadata.'
  where not exists (
    select 1 from public.research_field_projects where title = 'Hine-nui-te-pō mana wāhine narrative project'
  );
end$$;

-- ---------------------------------------------------------------------------
-- 3. kaitiaki_roopu — placeholder chair pending engagement letter
-- ---------------------------------------------------------------------------
-- NOTE: kaitiaki_roopu has FK to profiles(id). Cannot seed until a real
-- kaitiaki signs up via /register. Documented in README + ONBOARDING.md
-- (forthcoming). The following is a non-executing reference of what the
-- seed would look like:
--
--   insert into public.kaitiaki_roopu
--     (profile_id, scope, branch_id, iwi_name, voting_weight, is_active, notes)
--   values
--     ((select id from public.profiles where role = 'kaitiaki' limit 1),
--      'platform', null, null, 1.0, true,
--      'Kaitiaki rōpū chair. Engagement letter pending.');

-- ---------------------------------------------------------------------------
-- 4. scholarship_engagements — placeholder for upcoming CNZ application
-- ---------------------------------------------------------------------------
-- Idempotent. Logs an "in_preparation" entry for the CNZ International Arts
-- Impact Fund Round 2 (opens 24 Aug 2026 — already in TRACKER.md). This
-- makes the placeholder explicit rather than empty.
-- ---------------------------------------------------------------------------
insert into public.scholarship_engagements
  (programme_id, recipient_name, year, status, project_title, project_summary,
   host_institution, notes)
select
  (select id from public.scholarship_programmes where slug = 'cnz-international-arts-impact'),
  'Anamata Records (placeholder)',
  2026,
  'planned',
  'Te Aka o Whakaaro — knowledge transfer programme',
  'Cultural-knowledge-transfer exchange programme building on the Anamata–Kurokoru (Japan) collaboration thread. International engagement with reciprocity built into the design.',
  null,
  'Submission planned for Round 2 opening 24 Aug 2026. Eligibility, criteria, and active alternatives captured at /research/scholarships/portfolio.'
where not exists (
  select 1 from public.scholarship_engagements
  where programme_id = (select id from public.scholarship_programmes where slug = 'cnz-international-arts-impact')
    and year = 2026
);

-- ---------------------------------------------------------------------------
-- 5. contact_enquiries — none yet (no real submissions)
-- ---------------------------------------------------------------------------
-- Schema-only. Forms write to this table via /contact server action when
-- the first real submission lands.
