-- =============================================================================
-- Anamata Kāhui — branch_admin can manage user_branches
-- =============================================================================
-- Previously, user_branches was super_admin-only on writes. Now we allow
-- branch_admin (platform role) + per-branch lead/admin to manage
-- memberships for branches they have access to.
--
-- Reads are unchanged: a user can read their own memberships; super_admins
-- read all. Branch admins can also read memberships of branches they
-- belong to (helps them see who's on the team).
-- =============================================================================

-- Reads: user can read their own + admin can read all + branch members
-- can see other members of branches they share
drop policy if exists user_branches_select_self_or_admin on public.user_branches;
create policy user_branches_select_self_or_admin
  on public.user_branches for select
  using (
    user_id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1 from public.user_branches ub2
      where ub2.user_id = auth.uid()
        and ub2.branch_id = user_branches.branch_id
    )
  );

-- Writes: super_admin OR branch_admin (platform) OR per-branch lead/admin
drop policy if exists user_branches_write_authorized on public.user_branches;
create policy user_branches_write_authorized
  on public.user_branches for all
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('branch_admin', 'super_admin')
    )
    or exists (
      select 1 from public.user_branches ub
      where ub.user_id = auth.uid()
        and ub.branch_id = user_branches.branch_id
        and ub.role in ('lead', 'admin')
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('branch_admin', 'super_admin')
    )
    or exists (
      select 1 from public.user_branches ub
      where ub.user_id = auth.uid()
        and ub.branch_id = user_branches.branch_id
        and ub.role in ('lead', 'admin')
    )
  );
