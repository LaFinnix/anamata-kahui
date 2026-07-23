-- =============================================================================
-- Anamata Kāhui — tighten branch_admin scope on user_branches
-- =============================================================================
-- Migration 0015 allowed any user with role='branch_admin' to write
-- user_branches rows for ANY branch, regardless of which branches they
-- have lead/admin access to. This was over-permissive: a branch_admin
-- could add members to branches they don't belong to.
--
-- This migration tightens the policy: branch_admin (platform role) must
-- ALSO have a user_branches row for the target branch with role
-- 'lead' or 'admin'. Matches the design intent — branch_admin is a
-- branch-scoped power, not a global one.
--
-- super_admin remains unscoped (correctly).
-- =============================================================================

drop policy if exists user_branches_write_authorized on public.user_branches;
create policy user_branches_write_authorized
  on public.user_branches for all
  using (
    public.is_super_admin()
    or exists (
      -- branch_admin (platform) requires lead/admin in the target branch
      select 1 from public.profiles p
      join public.user_branches ub on ub.user_id = p.id
      where p.id = auth.uid()
        and p.role in ('branch_admin', 'super_admin')
        and ub.branch_id = user_branches.branch_id
        and ub.role in ('lead', 'admin')
    )
    or exists (
      -- per-branch lead/admin can manage their own branch
      select 1 from public.user_branches ub
      where ub.user_id = auth.uid()
        and ub.branch_id = user_branches.branch_id
        and ub.role in ('lead', 'admin')
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles p
      join public.user_branches ub on ub.user_id = p.id
      where p.id = auth.uid()
        and p.role in ('branch_admin', 'super_admin')
        and ub.branch_id = user_branches.branch_id
        and ub.role in ('lead', 'admin')
    )
    or exists (
      select 1 from public.user_branches ub
      where ub.user_id = auth.uid()
        and ub.branch_id = user_branches.branch_id
        and ub.role in ('lead', 'admin')
    )
  );
