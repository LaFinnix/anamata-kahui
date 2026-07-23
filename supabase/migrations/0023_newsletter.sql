-- =============================================================================
-- Anamata Kāhui — Newsletter subscriptions
-- =============================================================================
-- Double-opt-in (GDPR + NZ Privacy Act 2020 compliant).
--
-- Flow:
--   1. User submits email at /newsletter
--   2. We INSERT a row with confirmed=false, send a confirm email
--   3. User clicks the link in the email (token in URL)
--   4. We UPDATE confirmed=true, send welcome email
--   5. New posts (reads + news) get sent to confirmed=true subscribers
--
-- Unsubscribing: every email includes a token in the URL. Clicking the
-- link sets confirmed=false and unsubscribed_at to now().
-- =============================================================================

create table if not exists public.newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (position('@' in email) > 1),
  confirm_token text unique,
  confirm_token_expires_at timestamptz,
  confirmed     boolean not null default false,
  confirmed_at  timestamptz,
  unsubscribed_at timestamptz,
  ip_address    inet,
  user_agent    text,
  locale        text,
  source        text,  -- which page they signed up from
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes
create index if not exists newsletter_confirmed_idx on public.newsletter_subscribers (email) where confirmed = true;
create index if not exists newsletter_token_idx on public.newsletter_subscribers (confirm_token);
create index if not exists newsletter_created_at_idx on public.newsletter_subscribers (created_at desc);

-- updated_at trigger
drop trigger if exists set_newsletter_updated_at on public.newsletter_subscribers;
create trigger set_newsletter_updated_at
  before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();

-- RLS
alter table public.newsletter_subscribers enable row level security;

-- No public read — only via the service role (admin/server actions)
-- Public sign-up is via a server action that uses anon-key insert
-- (allowed by RLS below).
drop policy if exists newsletter_insert_anon on public.newsletter_subscribers;
create policy newsletter_insert_anon
  on public.newsletter_subscribers for insert
  with check (true);  -- anyone can sign up

-- Updates only via service role (for confirm/unsubscribe actions)
-- No public update policy = no public update allowed
drop policy if exists newsletter_update_super on public.newsletter_subscribers;
create policy newsletter_update_super
  on public.newsletter_subscribers for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Reads: only service role (for sending emails, admin view)
drop policy if exists newsletter_select_super on public.newsletter_subscribers;
create policy newsletter_select_super
  on public.newsletter_subscribers for select
  using (public.is_super_admin());

-- =============================================================================
-- Sent emails log (for compliance + audit)
-- =============================================================================
create table if not exists public.newsletter_sent (
  id            uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.newsletter_subscribers(id) on delete cascade,
  email_type    text not null check (email_type in ('confirm', 'welcome', 'new_read', 'new_news', 'custom')),
  resend_id     text,  -- Resend's message ID for tracking
  subject       text not null,
  body_preview  text,
  status        text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'bounced')),
  error         text,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists newsletter_sent_subscriber_idx on public.newsletter_sent (subscriber_id);
create index if not exists newsletter_sent_type_idx on public.newsletter_sent (email_type);
create index if not exists newsletter_sent_created_idx on public.newsletter_sent (created_at desc);

alter table public.newsletter_sent enable row level security;

-- No public access to this table
drop policy if exists newsletter_sent_super_all on public.newsletter_sent;
create policy newsletter_sent_super_all
  on public.newsletter_sent for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Service role can read+write (server actions)
grant all on public.newsletter_sent to service_role;
grant all on public.newsletter_subscribers to service_role;
