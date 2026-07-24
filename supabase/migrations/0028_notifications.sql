-- =============================================================================
-- Anamata Kāhui — notifications table
-- =============================================================================
-- Implements the dashboard notification layer used by the collaboration
-- marketplace (and any future system that needs to surface events to a
-- specific user).
--
-- Schema:
--   - recipient_id: who the notification is for
--   - kind: short string enum-like discriminator (not a PG enum so we can
--     add kinds without a migration; the kind values are listed in the
--     runbook addendum)
--   - payload: jsonb for kind-specific data (e.g. {tono_id, proposal_id})
--   - read_at: null until the recipient marks it read in the dashboard
--
-- Email fan-out is intentionally NOT here — when Resend is configured
-- (v2), a separate process will read notifications and send mail.
-- This table is the source of truth for in-platform notifications.
--
-- Pairs with: 0025/0026/0027 — they all INSERT into this table via
-- server actions.
-- =============================================================================

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  -- Short discriminator. Valid kinds (current):
  --   endorsement_received, endorsement_revoked,
  --   tono_proposal_received, tono_proposal_accepted, tono_proposal_declined,
  --   tono_fulfilled
  -- Adding a new kind does not require a schema change — only a runbook update.
  kind         text not null check (length(kind) > 0 and length(kind) <= 64),
  -- Kind-specific structured data
  payload      jsonb not null default '{}'::jsonb,
  -- Read state
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- Recipient lookup (most-common access pattern: "what are my unread?")
create index if not exists idx_notifications_recipient_unread
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

create index if not exists idx_notifications_recipient_created
  on public.notifications (recipient_id, created_at desc);

-- Kind filter (for analytics / per-kind feeds)
create index if not exists idx_notifications_kind
  on public.notifications (kind);

alter table public.notifications enable row level security;

-- Read: only the recipient themselves + super_admin
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own
  on public.notifications for select
  using (recipient_id = auth.uid() or public.is_super_admin());

-- Write: only super_admin can insert directly via SQL. The application
-- layer uses server actions which run as the calling user; those server
-- actions will use the service-role client (admin client) to insert on
-- behalf of the system. So we restrict direct INSERT to super_admin and
-- allow authenticated users to insert only when they are NOT the recipient
-- (you cannot notify yourself).
drop policy if exists notifications_insert_system on public.notifications;
create policy notifications_insert_system
  on public.notifications for insert
  with check (
    public.is_super_admin()
    -- Authenticated user can insert a notification for someone else.
    -- This is intentionally permissive; the server action that does the
    -- insert is the choke point that decides when this is allowed.
    or (auth.uid() is not null and recipient_id <> auth.uid())
  );

-- Update: only the recipient (to mark read) + super_admin
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications for update
  using (recipient_id = auth.uid() or public.is_super_admin())
  with check (recipient_id = auth.uid() or public.is_super_admin());

-- Delete: only the recipient (to dismiss) + super_admin
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own
  on public.notifications for delete
  using (recipient_id = auth.uid() or public.is_super_admin());
