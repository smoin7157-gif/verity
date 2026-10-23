-- ProofHire core schema.
-- Run after creating the Supabase project, before 0002_rls.sql.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  github_username text,
  full_name text,
  college text,
  skills text[] not null default '{}',
  role text not null default 'student' check (role in ('student', 'admin', 'company')),
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  role text not null,
  required_skills text[] not null default '{}',
  problem_statement text,
  start_date date,
  end_date date,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed'))
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  repo_url text,
  status text not null default 'active' check (status in ('active', 'completed', 'dropped')),
  created_at timestamptz not null default now(),
  unique (challenge_id, student_id)
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  date date not null default current_date,
  did text,
  blocked text,
  next text,
  created_at timestamptz not null default now(),
  unique (enrollment_id, date)
);

create table public.commits (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  sha text not null,
  message text,
  committed_at timestamptz not null,
  additions integer not null default 0,
  deletions integer not null default 0,
  unique (enrollment_id, sha)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  week integer not null check (week > 0),
  deploy_url text,
  note text,
  submitted_at timestamptz not null default now(),
  unique (enrollment_id, week)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments (id) on delete cascade,
  consistency integer not null default 0 check (consistency between 0 and 100),
  project_quality integer not null default 0 check (project_quality between 0 and 100),
  demo integer not null default 0 check (demo between 0 and 100),
  total integer generated always as (consistency + project_quality + demo) stored,
  updated_at timestamptz not null default now()
);

create index companies_owner_id_idx on public.companies (owner_id);
create index challenges_company_id_idx on public.challenges (company_id);
create index enrollments_challenge_id_idx on public.enrollments (challenge_id);
create index enrollments_student_id_idx on public.enrollments (student_id);
create index checkins_enrollment_id_idx on public.checkins (enrollment_id);
create index commits_enrollment_id_idx on public.commits (enrollment_id);
create index milestones_enrollment_id_idx on public.milestones (enrollment_id);
