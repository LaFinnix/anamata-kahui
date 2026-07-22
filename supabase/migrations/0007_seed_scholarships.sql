-- =============================================================================
-- Seed: scholarship programmes catalogue
-- =============================================================================
-- Idempotent. Seeds:
--   - 1 discontinued programme: PMSA (PMSA + PMSLA)
--   - 6 active alternative programmes
--   - 6 historical PMSA precedents (from ENZ alumni archive)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Programmes
-- ---------------------------------------------------------------------------
insert into public.scholarship_programmes
  (slug, name, host_country, destination, status, amount_text, amount_typical_nzd,
   duration_text, duration_weeks_min, duration_weeks_max,
   eligibility_summary, selection_criteria, vision_matauranga, maori_pasifika_priority,
   url, notes)
values
  (
    'pmsa', 'Prime Minister''s Scholarship for Asia', 'Asia', null, 'discontinued',
    '$470/wk Asia living + $3,500 return flight + tuition + insurance; up to $33,840 over 2 years',
    16920,
    '6 weeks to 2 years (72 weeks max funded)',
    6, 72,
    'NZ citizen or permanent resident, ordinarily resident 12 of last 24 months. Programme must be exchange/internship/research/postgraduate/short in eligible Asian country. 3+ participants for group round.',
    '50 points: programme fit (20) · community (15) · institutional (5) · national (5) · diversity (5). Māori + Pasifika explicit in diversity criterion.',
    false, true,
    'https://scholarships.enz.govt.nz/',
    'DISCONTINUED effective 1 July 2025 by ENZ. ENZ supported existing recipients through 30 June 2026. No 2026 round. Preserved here as historical reference and as a model of evaluation criteria applicable to successor programmes. Strongest precedent for Anamata: Rangaranga rōpū (12 Māori graduates, 8-week Japan exchange).'
  ),
  (
    'asia-nz-foundation', 'Asia New Zealand Foundation — Active engagement',
    'NZ', null, 'active',
    'Varies by programme (leadership grants, language scholarships)',
    null,
    'Varies',
    null, null,
    'NZ citizen or resident. Open to individuals and organisations. Multiple programmes including Asia grants, leadership, language.',
    'Programme fit, NZ-Asia relationship impact, applicant capability.',
    true, true,
    'https://www.asianz.org.nz',
    'Strongest LIVE alternative for Japan fieldwork + Asia cross-cultural research. Active. Vision Mātauranga-aligned.'
  ),
  (
    'royal-society-tawhia', 'Royal Society Te Apārangi — Tāwhia te Mana Research Fellowships',
    'NZ', null, 'active',
    '$700K-$1M+ per fellowship (3 tiers: Mana Tūāpapa / Tūānuku / Tūārangi)',
    850000,
    'Multi-year (3-5 years per tier)',
    null, null,
    'NZ-based researchers. Three tiers by career stage. Vision Mātauranga explicitly weighted. International research mobility permitted.',
    'Research excellence, VM alignment, host institution support.',
    true, false,
    'https://www.royalsociety.org.nz/what-we-do/funds-and-opportunities/tawhia-te-mana',
    'Vision Mātauranga-aligned. Best fit for NZ-based researchers going abroad including Japan fieldwork.'
  ),
  (
    'cnz-international-arts-impact', 'Creative NZ — International Arts Impact Fund',
    'NZ', null, 'active',
    'Varies by project',
    null,
    'Project-based',
    null, null,
    'NZ legal entity (Anamata Kāhui qualifies). International cultural exchange.',
    'International impact, community benefit, sector development.',
    true, true,
    'https://www.creativenz.govt.nz/funding-and-support/artist-grants/international-arts-impact-fund',
    'Round 2 opens 24 Aug 2026. Already in TRACKER.md.'
  ),
  (
    'cnz-international-engagement', 'Creative NZ — International Engagement Fund',
    'NZ', null, 'active',
    'TBA — new for 2026',
    null,
    'Project-based',
    null, null,
    'NZ legal entity. International engagement.',
    'TBA before open.',
    false, false,
    'https://www.creativenz.govt.nz/',
    'New for 2026. Criteria TBA. Already in TRACKER.md.'
  ),
  (
    'mfat-ipt', 'MFAT — Indigenous Peoples'' Capacity Building',
    'NZ', 'Asia/Pacific',
    'active',
    'Varies by project',
    null,
    'Project-based',
    null, null,
    'NZ-based researchers; iwi/hapū organisations; partners in developing Asia-Pacific nations.',
    'Indigenous-led, capacity building, partnership quality.',
    true, true,
    'https://www.mfat.govt.nz/en/aid-and-development',
    'Active. Includes capacity building grants that fund Indigenous-led Asia-Pacific research partnerships.'
  ),
  (
    'tematawai', 'Te Mātāwai — Te Reo Matatini + Pae Motuhake',
    'NZ', null, 'active',
    'Varies — ā-kāhui routed',
    null,
    'Project-based',
    null, null,
    'iwi-mandated te reo Māori work. Routed via Te Mātāwai Pae Motuhake (8 regional + sector).',
    'iwi partnership, te reo outcomes, community dissemination.',
    true, true,
    'https://www.tematawai.maori.nz',
    'Direct fit for Anamata''s language-revitalisation work.'
  )
on conflict (slug) do update
  set name = excluded.name,
      status = excluded.status,
      notes = excluded.notes,
      updated_at = now();

-- ---------------------------------------------------------------------------
-- PMSA precedents — historical recipients from ENZ alumni archive
-- ---------------------------------------------------------------------------
insert into public.scholarship_precedent_recipients
  (programme_id, recipient_name, year, destination_country, host_institution,
   project_title, description, is_indigenous_led, source_url)
select
  (select id from public.scholarship_programmes where slug = 'pmsa'),
  v.recipient_name, v.year::int, v.destination_country, v.host_institution,
  v.project_title, v.description, v.is_indigenous_led::bool, v.source_url
from (values
  (
    'Klee Begbie + Rangaranga rōpū (12 Māori graduates)'::text,
    null::int,
    'Japan'::text,
    null::text,
    'Indigenous-to-indigenous cultural exchange'::text,
    'Eight-week, indigenous-to-indigenous cultural exchange with the indigenous people of Japan. Strongest precedent for Anamata''s Māori–Japan work.'::text,
    true::bool,
    'https://scholarships.enz.govt.nz/category/alumni-stories/'::text
  ),
  (
    'First marae-led PMSA group'::text,
    null::int,
    null::text,
    'marae (multiple)'::text,
    null::text,
    'First marae-led (non-university) PMSA group programme. Confirms marae-led Indigenous programming was fundable.'::text,
    true::bool,
    'https://scholarships.enz.govt.nz/category/alumni-stories/'::text
  ),
  (
    'Xavier Muao Breed'::text,
    null::int,
    'Taiwan'::text,
    'Taipei National University of the Arts'::text,
    'Dance research (Master of Dance Studies)'::text,
    'Master of Dance Studies, University of Auckland. Arts-based postgraduate research precedent.'::text,
    false::bool,
    'https://scholarships.enz.govt.nz/category/alumni-stories/'::text
  ),
  (
    'Nakita Wiperi'::text,
    null::int,
    'Colombia, Mexico'::text,
    null::text,
    'Spanish + Indigenous integration with Maya tribe'::text,
    'Spanish Language in Colombia and indigenous integration with the Mayan tribe in Mexico.'::text,
    false::bool,
    'https://scholarships.enz.govt.nz/category/alumni-stories/'::text
  ),
  (
    'Hone Morris + Massey University cohort (12 students)'::text,
    null::int,
    'Colombia'::text,
    null::text,
    'Cross-cultural Indigenous pedagogy'::text,
    'Four-week Colombia exchange involving 12 students and six Indigenous groups.'::text,
    false::bool,
    'https://scholarships.enz.govt.nz/category/alumni-stories/'::text
  ),
  (
    'Harrison Gibb-Faumuina'::text,
    null::int,
    'Japan'::text,
    null::text,
    'Japan exchange, language, internship'::text,
    'Pasifika Japan precedent. Tokyo exchange + language + internship activity.'::text,
    false::bool,
    'https://scholarships.enz.govt.nz/category/alumni-stories/'::text
  )
) as v(recipient_name, year, destination_country, host_institution, project_title, description, is_indigenous_led, source_url)
where not exists (
  select 1 from public.scholarship_precedent_recipients r
  where r.programme_id = (select id from public.scholarship_programmes where slug = 'pmsa')
    and r.recipient_name = v.recipient_name
);
