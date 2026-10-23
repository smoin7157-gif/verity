-- Student onboarding and profile fields.
-- RLS from 0002 already scopes profiles to their owner and lets admins read
-- all rows; this migration adds the new columns and extends the update grant.

alter table public.profiles
  add column phone text,
  add column year_of_study integer,
  add column branch text,
  add column linkedin_url text,
  add column bio text,
  add column onboarding_completed boolean not null default false;

alter table public.profiles
  add constraint profiles_bio_length_check
    check (bio is null or char_length(bio) <= 300),
  add constraint profiles_year_of_study_check
    check (year_of_study is null or year_of_study between 1 and 6);

-- Every existing profile starts with onboarding_completed = false, so students
-- are sent through /onboarding on their next request. Admins skip the gate.

-- Students may update these columns on their own row. `role` is intentionally
-- omitted so nobody can promote themselves to admin.
grant update (
  full_name,
  college,
  skills,
  github_username,
  phone,
  year_of_study,
  branch,
  linkedin_url,
  bio,
  onboarding_completed
) on public.profiles to authenticated;
