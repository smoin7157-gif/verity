-- GitHub repo linking and commit sync.
--
-- * commits stores the extra GitHub fields and is written only by server code
--   using the service role (students/admins can read, nobody can write via the
--   API).
-- * enrollments gains sync bookkeeping; students may only set repo_url, and
--   only before the first successful sync.

alter table public.commits
  add column if not exists author_login text,
  add column if not exists author_date timestamptz,
  add column if not exists committer_date timestamptz,
  add column if not exists url text;

-- 0001 already creates this unique constraint inline (same name Postgres would
-- choose), so only add it if it is missing for some reason.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.commits'::regclass
      and conname = 'commits_enrollment_id_sha_key'
  ) then
    alter table public.commits
      add constraint commits_enrollment_id_sha_key unique (enrollment_id, sha);
  end if;
end $$;

create index if not exists commits_enrollment_committed_idx
  on public.commits (enrollment_id, committed_at desc);

alter table public.enrollments
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_sync_attempt_at timestamptz,
  add column if not exists sync_error text;

-- Commits ---------------------------------------------------------------
-- Read-only for the owner and admins; all writes happen with the service role
-- from lib/github-sync.ts.
drop policy if exists "commits: enrollment owner or admin" on public.commits;

create policy "commits: read own or admin"
  on public.commits for select to authenticated
  using (public.owns_enrollment(enrollment_id) or public.is_admin());

revoke insert, update, delete on public.commits from authenticated;
grant select on public.commits to authenticated;

-- Enrollments -----------------------------------------------------------
-- Students can link a repository before the first sync. After that the column
-- is locked (the students' grant covers repo_url only).
revoke update on public.enrollments from authenticated;
grant update (repo_url) on public.enrollments to authenticated;

drop policy if exists "enrollments: set repo before first sync" on public.enrollments;

create policy "enrollments: set repo before first sync"
  on public.enrollments for update to authenticated
  using (student_id = auth.uid() and last_synced_at is null)
  with check (student_id = auth.uid() and last_synced_at is null);

-- Aggregate helper so the workspace can show accurate totals without fetching
-- every commit. SECURITY INVOKER keeps the caller's row-level security.
create or replace function public.commit_stats(target_enrollment uuid)
returns table (total bigint, active_days bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*),
    count(distinct (committed_at at time zone 'UTC')::date)
  from public.commits
  where enrollment_id = target_enrollment;
$$;

grant execute on function public.commit_stats(uuid) to authenticated;
