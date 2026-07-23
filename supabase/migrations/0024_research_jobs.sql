-- =============================================================================
-- Anamata Kāhui — research-agent jobs queue
-- =============================================================================
-- Vercel and the VPS worker communicate via Supabase (both can reach
-- it, neither can reach the other directly). The flow:
--
--   1. Vercel /api/research/run creates a job with status='queued'
--   2. VPS worker (scripts/anamata-research-worker.py) polls every 5s
--   3. Worker picks up queued jobs, sets status='running'
--   4. Worker runs the research-agent CLI (writes to reads table)
--   5. Worker sets status='complete' with result_draft_id, or 'failed'
--      with error_message
--   6. Vercel /api/research/status route is polled by the admin UI
--      and reports the status to the operator
--
-- This is the same pattern as the auto-archive cron and the
-- local-contexts-refresh cron — Supabase as the coordination layer
-- between Vercel serverless and VPS long-running processes.
-- =============================================================================

create table if not exists public.research_agent_jobs (
  id              uuid primary key default gen_random_uuid(),
  -- Input
  topic           text not null,
  keyword         text,
  kind            text not null default 'note' check (kind in ('note', 'research', 'data_drop')),
  tags            text[] not null default '{}',
  -- Operator
  requested_by    uuid not null references public.profiles(id) on delete set null,
  -- Lifecycle
  status          text not null default 'queued' check (status in ('queued', 'running', 'complete', 'failed')),
  started_at      timestamptz,
  finished_at     timestamptz,
  -- Output
  result_draft_id uuid references public.reads(id) on delete set null,
  audit_score     int,
  word_count      int,
  error_message   text,
  error_stack     text,
  -- Metadata
  vps_worker_id   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists research_jobs_status_idx on public.research_agent_jobs (status, created_at) where status in ('queued', 'running');
create index if not exists research_jobs_requested_by_idx on public.research_agent_jobs (requested_by, created_at desc);
create index if not exists research_jobs_created_at_idx on public.research_agent_jobs (created_at desc);

-- updated_at trigger
drop trigger if exists set_research_jobs_updated_at on public.research_agent_jobs;
create trigger set_research_jobs_updated_at
  before update on public.research_agent_jobs
  for each row execute function public.set_updated_at();

-- RLS
alter table public.research_agent_jobs enable row level security;

-- Authors can read their own jobs
drop policy if exists research_jobs_select_author on public.research_agent_jobs;
create policy research_jobs_select_author
  on public.research_agent_jobs for select
  using (requested_by = auth.uid());

-- Authors can create jobs
drop policy if exists research_jobs_insert_author on public.research_agent_jobs;
create policy research_jobs_insert_author
  on public.research_agent_jobs for insert
  with check (requested_by = auth.uid());

-- Updates only via service role (worker updates status)
-- No public update policy = no public update allowed

-- Super admin: full access
drop policy if exists research_jobs_super_admin_all on public.research_agent_jobs;
create policy research_jobs_super_admin_all
  on public.research_agent_jobs for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Service role needs full access for the VPS worker
grant all on public.research_agent_jobs to service_role;
