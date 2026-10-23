-- ProofHire seed data for local UI testing.
--
-- Run the migrations first, then promote your user to admin (see README),
-- then run this whole file in the Supabase SQL editor.
-- Safe to re-run: seeded rows use fixed ids and are skipped if they exist.

do $$
declare
  admin_id uuid;
  seed_company uuid := '00000000-0000-4000-8000-000000000001';
begin
  select id
  into admin_id
  from public.profiles
  where role = 'admin'
  order by created_at
  limit 1;

  if admin_id is null then
    raise exception 'No admin profile found. Promote a user to admin first (see README).';
  end if;

  insert into public.companies (id, name, owner_id)
  values (seed_company, 'Lumen Labs', admin_id)
  on conflict (id) do nothing;

  insert into public.challenges
    (id, company_id, title, role, required_skills, problem_statement, start_date, end_date, status)
  values
    (
      '00000000-0000-4000-8000-000000000101',
      seed_company,
      'Backend Intern',
      'Backend Engineer',
      array['TypeScript', 'Node.js', 'PostgreSQL', 'REST APIs'],
      'Build the public API for a hiring marketplace. Design REST endpoints, model the data in PostgreSQL, add validation and tests, and ship a service other teams can call.',
      current_date + 3,
      current_date + 60,
      'open'
    ),
    (
      '00000000-0000-4000-8000-000000000102',
      seed_company,
      'ML Intern',
      'Machine Learning Engineer',
      array['Python', 'PyTorch', 'PostgreSQL', 'pandas'],
      'Prototype a candidate matching model. Clean a messy dataset, train a baseline, evaluate it with a holdout set, and explain the trade-offs in a short write-up.',
      current_date + 7,
      current_date + 75,
      'open'
    ),
    (
      '00000000-0000-4000-8000-000000000103',
      seed_company,
      'Frontend Intern',
      'Frontend Engineer',
      array['React', 'TypeScript', 'Tailwind CSS', 'Accessibility'],
      'Rebuild the challenge dashboard. Implement responsive layouts, accessible components and a clean data table, then deploy it and share the live URL.',
      current_date + 5,
      current_date + 45,
      'open'
    )
  on conflict (id) do nothing;
end
$$;
