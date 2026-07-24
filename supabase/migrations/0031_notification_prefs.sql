-- =============================================================================
-- Notification preferences — v1.1
-- =============================================================================
-- Add `profiles.notification_prefs` jsonb so users can opt in/out of each
-- notification kind per channel (in_app, email). Replaces the v1 behaviour
-- where ALL notifications are in-app, none are email.
--
-- Defaults reflect the v1 design (see COLLABORATION-MARKETPLACE-V1.1-PLAN.md
-- "Items not in v1" / email fanout note):
--
--   - endorsement_received/revoked: in_app + email (relationship events)
--   - tono_proposal_received:       in_app + email (someone wants to help)
--   - tono_proposal_accepted:       in_app only (less-urgent workflow)
--   - tono_proposal_declined:       in_app only (less-urgent workflow)
--   - tono_fulfilled:               in_app + email (resolved — celebrate)
--
-- When email fanout (Resend integration, deferred) lands, the cron job reads
-- these prefs and decides what to send. Until then, only the in_app channel
-- is consumed (by the existing notifications table).
--
-- Idempotent: re-applying this migration is a no-op because the column
-- already has a default.
-- =============================================================================

alter table public.profiles
  add column if not exists notification_prefs jsonb not null default
  '{
    "endorsement_received":  { "in_app": true, "email": true  },
    "endorsement_revoked":   { "in_app": true, "email": true  },
    "tono_proposal_received": { "in_app": true, "email": true  },
    "tono_proposal_accepted": { "in_app": true, "email": false },
    "tono_proposal_declined": { "in_app": true, "email": false },
    "tono_fulfilled":        { "in_app": true, "email": true  }
  }'::jsonb;

comment on column public.profiles.notification_prefs is
  'Per-kind notification toggles. Object keyed by notification kind, each value has {in_app: bool, email: bool}. Email channel is no-op until Resend integration lands.';
