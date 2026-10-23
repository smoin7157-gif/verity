-- Row-level security.
-- Rules:
--   * students can only read/write their own rows;
--   * admins can read everything (and write where the policies allow it);
--   * company owners can manage their own company and its challenges;
--   * open challenges are readable by any signed-in user so students can enroll.

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.challenges enable row level security;
alter table public.enrollments enable row level security;
alter table public.checkins enable row level security;
alter table public.commits enable row level security;
alter table public.milestones enable row level security;
alter table public.scores enable row level security;

-- Helper functions. SECURITY DEFINER so they can check rows without
-- re-triggering row-level security (and without infinite recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.owns_enrollment(target_enrollment uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments
    where id = target_enrollment
      and student_id = auth.uid()
  );
$$;

create or replace function public.owns_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies
    where id = target_company
      and owner_id = auth.uid()
  );
$$;

-- profiles ---------------------------------------------------------------
create policy "profiles: read own or admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- companies --------------------------------------------------------------
create policy "companies: owners and admins"
  on public.companies for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- challenges -------------------------------------------------------------
create policy "challenges: read open, owned or admin"
  on public.challenges for select to authenticated
  using (status = 'open' or public.owns_company(company_id) or public.is_admin());

create policy "challenges: company owners write"
  on public.challenges for all to authenticated
  using (public.owns_company(company_id) or public.is_admin())
  with check (public.owns_company(company_id) or public.is_admin());

-- enrollments ------------------------------------------------------------
create policy "enrollments: student own or admin"
  on public.enrollments for all to authenticated
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid() or public.is_admin());

-- rows that belong to an enrollment --------------------------------------
create policy "checkins: enrollment owner or admin"
  on public.checkins for all to authenticated
  using (public.owns_enrollment(enrollment_id) or public.is_admin())
  with check (public.owns_enrollment(enrollment_id) or public.is_admin());

create policy "commits: enrollment owner or admin"
  on public.commits for all to authenticated
  using (public.owns_enrollment(enrollment_id) or public.is_admin())
  with check (public.owns_enrollment(enrollment_id) or public.is_admin());

create policy "milestones: enrollment owner or admin"
  on public.milestones for all to authenticated
  using (public.owns_enrollment(enrollment_id) or public.is_admin())
  with check (public.owns_enrollment(enrollment_id) or public.is_admin());

create policy "scores: enrollment owner or admin"
  on public.scores for all to authenticated
  using (public.owns_enrollment(enrollment_id) or public.is_admin())
  with check (public.owns_enrollment(enrollment_id) or public.is_admin());

-- Table privileges -------------------------------------------------------
-- Students write their own rows through the policies above, but must not be
-- able to promote themselves: update on profiles is column-limited, so `role`
-- can only be changed with the service role (SQL editor / dashboard).
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (github_username, full_name, college, skills) on public.profiles to authenticated;

grant select, insert, update, delete on
  public.companies,
  public.challenges,
  public.enrollments,
  public.checkins,
  public.commits,
  public.milestones,
  public.scores
to authenticated;

revoke all on
  public.profiles,
  public.companies,
  public.challenges,
  public.enrollments,
  public.checkins,
  public.commits,
  public.milestones,
  public.scores
from anon;
