-- =============================================================================
-- Fix tono RLS infinite recursion
-- =============================================================================
-- Migration 0027_tono.sql created a circular reference between the tono
-- and tono_invitees policies:
--
--   tono.tono_read            -> reads tono_invitees (invitee check)
--   tono_invitees.tono_invitees_read -> reads tono (creator check)
--
-- Postgres detects the cycle and refuses any query against either table.
-- The fix is to replace the cross-table subqueries with SECURITY DEFINER
-- helper functions that bypass RLS internally, breaking the cycle.
--
-- Both functions are STABLE so the planner can cache within a transaction.
-- =============================================================================

-- Helper: is the current user the creator of the given tono?
-- SECURITY DEFINER + explicit search_path to be safe.
create or replace function public.is_tono_creator(p_tono_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tono
    where id = p_tono_id
      and creator_id = auth.uid()
  );
$$;

-- Helper: is the current user an invitee on the given tono?
-- SECURITY DEFINER bypasses RLS so this doesn't re-enter tono_read.
create or replace function public.is_tono_invitee(p_tono_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tono_invitees
    where tono_id = p_tono_id
      and invitee_id = auth.uid()
  );
$$;

-- Helper: does the current user have scope_iwi in their attested set?
-- Bypasses RLS so it doesn't trigger profiles policy (which might recurse
-- in a complex setup).
create or replace function public.user_attested_has_iwi(p_iwi text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and p_iwi = any (iwi_affiliation_attested)
  );
$$;

-- Drop and recreate tono_read using the helpers
drop policy if exists tono_read on public.tono;

create policy tono_read on public.tono for select
  using (
    -- Creator always sees their own
    creator_id = auth.uid()
    -- Super_admin sees all
    or public.is_super_admin()
    -- Anyone sees open/resolved tono (open visibility or any fulfilled/closed/withdrawn status)
    or (visibility = 'open' and status in ('open', 'fulfilled', 'closed', 'withdrawn'))
    -- Invited: must be in tono_invitees (via SECURITY DEFINER function)
    or (visibility = 'invited' and public.is_tono_invitee(id))
    -- iwi_specific: must have scope_iwi in the user's attested set
    or (visibility = 'iwi_specific' and scope_iwi is not null and public.user_attested_has_iwi(scope_iwi))
    -- Fulfilled/closed/withdrawn tono by any visibility are public (resolved outcomes)
    or status in ('fulfilled', 'closed', 'withdrawn')
  );

-- Drop and recreate tono_invitees_read using the helper
drop policy if exists tono_invitees_read on public.tono_invitees;

create policy tono_invitees_read on public.tono_invitees for select
  using (
    invitee_id = auth.uid()
    or public.is_tono_creator(tono_id)
    or public.is_super_admin()
  );
