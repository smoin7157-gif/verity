-- Challenge + enrollment access rules for Day 2.
--
-- Replaces the company-owner policies from 0002:
--   * any signed-in user can read company names and open challenges;
--   * students can also read challenges they are enrolled in;
--   * only admins can create, update or delete companies and challenges;
--   * students can insert and read only their own enrollments.

drop policy if exists "companies: owners and admins" on public.companies;
drop policy if exists "challenges: read open, owned or admin" on public.challenges;
drop policy if exists "challenges: company owners write" on public.challenges;
drop policy if exists "enrollments: student own or admin" on public.enrollments;

-- Company names are public to signed-in users (shown on challenge cards).
create policy "companies: read for authenticated"
  on public.companies for select to authenticated
  using (true);

-- Only admins write companies.
create policy "companies: admin write"
  on public.companies for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Lets students keep access to challenges they already joined after closing.
create or replace function public.is_enrolled(target_challenge uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments
    where challenge_id = target_challenge
      and student_id = auth.uid()
  );
$$;

-- Open challenges are readable by every signed-in user.
create policy "challenges: read open or enrolled"
  on public.challenges for select to authenticated
  using (status = 'open' or public.is_enrolled(id) or public.is_admin());

-- Only admins write challenges.
create policy "challenges: admin write"
  on public.challenges for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Enrollments: students read their own, admins read all.
create policy "enrollments: read own or admin"
  on public.enrollments for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

-- Students can enroll themselves, only in an open challenge that has not ended.
create policy "enrollments: insert own"
  on public.enrollments for insert to authenticated
  with check (
    student_id = auth.uid()
    and status = 'active'
    and exists (
      select 1
      from public.challenges
      where id = challenge_id
        and status = 'open'
        and (end_date is null or end_date >= current_date)
    )
  );
