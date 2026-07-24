-- =============================================================================
-- 0036 — Funding roster link (signed-artist system, phase 8)
-- =============================================================================
-- Adds an optional artist_roster_id FK to funding_applications so a
-- funding application can be scoped to a specific artist (via their
-- roster row) within a branch.
--
-- Why optional:
--   - Branch-level applications (e.g. "Anamata Records got $10K for
--     a new studio") don't belong to a specific artist
--   - Artist-level applications (e.g. "Hine's recording of Tada koe
--     got $5K from Creative NZ") are scoped to a roster row
--
-- RLS: no policy changes needed — the existing funding_public_read
-- policy covers public reads; admin reads are via is_admin().
--
-- This migration only adds the column + an index. The UI updates are
-- in a follow-up.

-- ---------------------------------------------------------------------------
-- 1. The column
-- ---------------------------------------------------------------------------

alter table public.funding_applications
  add column if not exists artist_roster_id uuid
  references public.artist_roster (id) on delete set null;

-- Helpful comment for future readers
comment on column public.funding_applications.artist_roster_id is
  'Optional FK to artist_roster. NULL = branch-level application. Set = artist-level (tied to a specific roster member).';

-- ---------------------------------------------------------------------------
-- 2. Index for the common query path: "funding for an artist"
-- ---------------------------------------------------------------------------

create index if not exists idx_funding_artist_roster
  on public.funding_applications (artist_roster_id)
  where (artist_roster_id is not null);

-- ---------------------------------------------------------------------------
-- 3. Backfill: the existing is_public=true rows. None have a roster
-- link (the table was created before the roster system), so this is
-- a no-op. But we add a soft "backfill target" row to validate the
-- migration works.
-- ---------------------------------------------------------------------------

-- (No data migration needed — the FK is optional. All existing rows
-- stay at artist_roster_id = NULL = branch-level.)
