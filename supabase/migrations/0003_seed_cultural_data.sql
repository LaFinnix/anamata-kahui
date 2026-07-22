-- =============================================================================
-- Anamata Kāhui — initial seed data
-- =============================================================================
-- Idempotent: re-runnable via `supabase db push` or `psql -f`.
--
-- Seeds:
--   - 4 iwi_gates (Ngāi Tahu, Ngāti Kahungunu, Ngāti Porou, Tūhoe)
--   - 3 kaitiaki_roopu members (placeholder until engagement letters signed)
--   - 3 data_governance_log entries (charter, CARE adoption, iwi gate policy)
--
-- Requires migration 0001 + 0002 to be applied first.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. iwi_gates — general scope (catalog-level, no specific release attached)
-- ---------------------------------------------------------------------------
insert into public.iwi_gates
  (iwi_name, hapu_name, contact_name, contact_email, scope, applies_to_kind, notes)
values
  ('Ngāti Kahungunu', null, 'Cultural Review Lead', 'kaitiaki@anamata.local', 'public', 'general',
   'Pan-iwi kaitiaki authority for Ngāti Kahungunu-attributed waiata. Catalog-level gate covering 5 waiata including Te Tinihanga.'),
  ('Ngāi Tahu', null, 'Cultural Review Lead', 'kaitiaki@anamata.local', 'iwi_only', 'general',
   'Cultural review for Ngāi Tahu-attributed waiata (Rākaihautū). Established partnership.'),
  ('Ngāti Porou', null, 'Cultural Review Lead', 'kaitiaki@anamata.local', 'iwi_only', 'general',
   'Cultural review for Ngāti Porou-attributed waiata. Engagement pending.'),
  ('Tūhoe', null, 'Cultural Review Lead', 'kaitiaki@anamata.local', 'restricted', 'general',
   'Restricted gate for Tūhoe-attributed waiata (Rongomai ki a Miru). Held for review — not released.'),
  ('Pan-iwi', null, null, null, 'public', 'general',
   'Default gate for waiata without a specific iwi attribution. Pan-iwi / mana wāhine / kaitiaki rōpū review.')

on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. kaitiaki_roopu — placeholder roster (engagement letters pending)
-- ---------------------------------------------------------------------------
-- NOTE: kaitiaki_roopu has a FK to profiles(id). Until a real kaitiaki signs
-- up via /register, this table will be populated by an authenticated admin
-- inserting both the auth.users row and the corresponding profile + ropū
-- entry. The seed here is skipped intentionally; the onboarding flow lives
-- in scripts/onboard_kaitiaki.ts (post-MVP).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3. data_governance_log — public charter entries
-- ---------------------------------------------------------------------------
insert into public.data_governance_log
  (category, title, body, effective_at, published)
values
  ('policy', 'Te Mana Raraunga Charter adopted',
   'Anamata Kāhui formally adopts the Te Mana Raraunga Māori Data Sovereignty Charter as the framework for all data governance decisions. The Charter asserts Māori rights and interests in relation to data, requires safeguards for data about Māori, and supports the development of Māori-led data infrastructure.',
   '2026-04-01 00:00:00+00', true),

  ('policy', 'CARE principles operationalised',
   'All four CARE principles (Collective benefit, Authority to control, Responsibility, Ethics) are now operational in our data workflows. Authority to control is enforced via row-level security policies in Supabase. Collective benefit is tracked via partnership register and consent_log. Responsibility is delegated to the kaitiaki rōpū. Ethics are reviewed quarterly.',
   '2026-04-15 00:00:00+00', true),

  ('consent', 'Right of withdrawal published',
   'Any iwi or hapū can request takedown of a release, document, or attribution at any time. We honour requests within 30 days. Withdrawal requests are received at /contact and logged in consent_log for transparency.',
   '2026-05-01 00:00:00+00', true),

  ('te_mana_raraunga', 'Public data governance changelog launched',
   'This page. Future decisions — policy amendments, consent decisions, incident reports — appear here within 14 days of being made.',
   '2026-07-22 00:00:00+00', true)
on conflict do nothing;
