-- =============================================================================
-- Anamata Kāhui — Local Contexts Hub v2: enum extension only
-- =============================================================================
-- Split from 0012_local_contexts_v2.sql because Postgres requires new
-- enum values to be committed before they can be used in the same
-- transaction that created them.
--
-- This migration ONLY adds enum values. The full v2 implementation
-- (table updates + re-seed + cache table) is in 0013.
-- =============================================================================

do $$
declare
  new_values text[] := array[
    -- TK Labels (canonical Hub slugs)
    'attribution', 'clan', 'family', 'outreach', 'tk_multiple_community',
    'non_verified', 'verified', 'non_commercial', 'commercial',
    'culturally_sensitive', 'community_voice', 'community_use_only',
    'seasonal', 'women_general', 'men_general', 'women_restricted',
    'men_restricted', 'secret_sacred', 'open_to_collaboration', 'creative',
    -- BC Labels
    'bc_provenance', 'bc_commercialization', 'bc_non_commercial',
    'bc_collaboration', 'bc_consent_verified', 'bc_consent_non_verified',
    'bc_multiple_community', 'bc_clan', 'bc_outreach', 'bc_research',
    -- Notices
    'tk_notice', 'bc_notice', 'open_to_collaborate', 'attribution_incomplete',
    'belonging', 'caring', 'leave_undisturbed', 'gender_aware',
    'withholding', 'safety', 'authorization', 'viewing'
  ];
  v text;
begin
  foreach v in array new_values loop
    if not exists (
      select 1 from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'lc_label_type' and e.enumlabel = v
    ) then
      execute format('alter type public.lc_label_type add value %L', v);
    end if;
  end loop;
end$$;
