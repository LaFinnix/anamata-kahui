-- Drop the old super-admin-only policies so the new branch_admin-aware
-- policies (from migration 0015) take effect.
drop policy if exists "user_branches_select_self_or_super" on public.user_branches;
drop policy if exists "user_branches_write_super" on public.user_branches;
