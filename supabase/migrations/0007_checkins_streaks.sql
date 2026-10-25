-- Daily check-ins and streaks.
--
-- * one check-in per enrollment per day (unique constraint from 0001, ensured
--   again below);
-- * `did` must be at least 10 characters;
-- * students read, insert and update only their own check-ins, and only for
--   today's date in Asia/Kolkata;
-- * admins read every check-in. Nobody deletes through the API.

-- "Today" for the whole app. The UI uses the same zone via lib/dates.ts.
create or replace function public.kolkata_today()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

grant execute on function public.kolkata_today() to authenticated, anon;

-- One check-in per enrollment per day. 0001 creates this inline; add it only
-- if it is missing (same name Postgres would choose).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.checkins'::regclass
      and conname = 'checkins_enrollment_id_date_key'
  ) then
    alter table public.checkins
      add constraint checkins_enrollment_id_date_key unique (enrollment_id, date);
  end if;
end $$;

alter table public.checkins
  alter column created_at set default now();

-- Existing rows are left as they are (NOT VALID); every new insert and update
-- is checked. The app also enforces this in lib/checkins.ts.
alter table public.checkins
  drop constraint if exists checkins_did_min_length;

alter table public.checkins
  add constraint checkins_did_min_length
    check (did is not null and char_length(btrim(did)) >= 10)
    not valid;

create index if not exists checkins_enrollment_date_idx
  on public.checkins (enrollment_id, date desc);

-- Check-ins --------------------------------------------------------------
-- Replace the broad "owner or admin" policy from 0002.
drop policy if exists "checkins: enrollment owner or admin" on public.checkins;
drop policy if exists "checkins: read own or admin" on public.checkins;
drop policy if exists "checkins: insert own today" on public.checkins;
drop policy if exists "checkins: update own today" on public.checkins;

create policy "checkins: read own or admin"
  on public.checkins for select to authenticated
  using (public.owns_enrollment(enrollment_id) or public.is_admin());

create policy "checkins: insert own today"
  on public.checkins for insert to authenticated
  with check (
    public.owns_enrollment(enrollment_id)
    and date = public.kolkata_today()
  );

create policy "checkins: update own today"
  on public.checkins for update to authenticated
  using (
    public.owns_enrollment(enrollment_id)
    and date = public.kolkata_today()
  )
  with check (
    public.owns_enrollment(enrollment_id)
    and date = public.kolkata_today()
  );

-- Students keep insert/update (RLS limits them to today's own row). No delete.
revoke insert, update, delete on public.checkins from authenticated;
grant select, insert, update on public.checkins to authenticated;
