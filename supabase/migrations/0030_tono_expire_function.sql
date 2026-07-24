-- =============================================================================
-- Tono expires_at auto-archive — v1.1
-- =============================================================================
-- Migration 0027 ships tono with an optional `expires_at timestamptz`. The
-- intent was that open tono past their expires_at stop accepting proposals.
-- In v1, expired tono still appeared in open listings because nothing
-- archived them. This migration adds the SQL function the cron endpoint
-- calls; the cron route lives at /api/cron/auto-expire-tonos.
--
-- Behaviour:
--   - Open tono past `expires_at` → status='closed', closed_at=now()
--   - Pending proposals on those tono → status='declined', with reason
--     "Tono expired." (matches the same pattern as withdraw/close actions)
--
-- Idempotent: safe to call repeatedly. Updates 0 rows when nothing is
-- expired. Uses SECURITY DEFINER + set_config('role', 'authenticated')
-- so it runs with the function-owner privileges and the tono RLS allows it.
-- =============================================================================

create or replace function public.auto_expire_tonos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_tono_ids uuid[];
  declined_count integer;
begin
  -- 1. Find open tono whose expires_at is in the past.
  select array_agg(id) into expired_tono_ids
    from public.tono
    where status = 'open'
      and expires_at is not null
      and expires_at < now();

  if expired_tono_ids is null then
    return 0;
  end if;

  -- 2. Decline any pending proposals on those tono with a clear reason.
  update public.tono_proposals
    set status = 'declined',
        decided_at = now(),
        decline_reason = 'Tono expired.'
    where tono_id = any(expired_tono_ids)
      and status = 'pending';
  get diagnostics declined_count = row_count;

  -- 3. Flip the tono to closed.
  update public.tono
    set status = 'closed',
        closed_at = now()
    where id = any(expired_tono_ids);

  return array_length(expired_tono_ids, 1);
end;
$$;

comment on function public.auto_expire_tonos() is
  'Cron-callable function: closes open tono past expires_at and declines pending proposals with reason. Returns count of tono expired.';
