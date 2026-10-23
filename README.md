# ProofHire

Proof over promises: companies post real challenges, students enroll, and daily
check-ins, commits and milestones build a verified track record.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS**, and **Supabase**
for auth (GitHub OAuth) and the Postgres database.

## Routes

- `/` — landing page with **Continue with GitHub** / **Log out** buttons.
- `/dashboard` — profile plus **My challenges** (your enrollments and statuses).
- `/challenges` — grid of open challenges with a skill filter.
- `/challenges/[id]` — problem statement, skills, dates and a **Join challenge**
  button (shows **Joined** when you already enrolled).
- `/admin/challenges` — every challenge with status and enrolled count.
- `/admin/challenges/new` — create a challenge (existing or new company).
- `/admin/challenges/[id]/edit` — edit the same fields.
- `/auth/callback` — OAuth callback that exchanges the GitHub code for a session.

Only `profiles.role = 'admin'` can open `/admin/*`; other signed-in users are
redirected to `/dashboard`.

Supporting files:

- `lib/supabase/client.ts` — browser Supabase client.
- `lib/supabase/server.ts` — server Supabase client (Server Components, Route
  Handlers, Server Actions).
- `lib/auth.ts` — `requireUser`, `requireProfile` and `requireAdmin` guards.
- `proxy.ts` — refreshes the Supabase session cookie on each request.
- `supabase/migrations/` — schema, RLS policies and the first-login trigger.
- `supabase/seed.sql` — sample company and challenges for testing the UI.

## 1. Create the Supabase project

1. Create a project at [database.new](https://database.new).
2. Copy the project URL and the **anon / public** key from
   **Project Settings → API**.

## 2. Run the migrations

Run the files in `supabase/migrations/` **in order** in the Supabase
**SQL Editor**:

1. `0001_init.sql` — tables and indexes.
2. `0002_rls.sql` — base row-level security and table privileges.
3. `0003_new_user_profile.sql` — trigger that creates a `profiles` row on first
   login.
4. `0004_challenge_rls.sql` — challenge discovery, admin-only authoring and
   student enrollment rules.

Or, with the Supabase CLI linked to your project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## 3. Enable GitHub OAuth

1. In GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. In Supabase: **Authentication → Providers → GitHub**, enable it and paste the
   GitHub **Client ID** and **Client Secret**.
3. In Supabase: **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`

## 4. Environment variables

Create `.env.local` in the project root (see `.env.example`):

| Variable | Where to find it | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon / public key | yes |

```bash
cp .env.example .env.local
# then paste your project values into .env.local
```

## 5. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Continue with
GitHub**, and you will land on `/dashboard` with your name and GitHub username.

Production build:

```bash
npm run build
npm run start
```

## 6. Make yourself an admin

Sign in once so your profile exists, then run this in the Supabase **SQL
Editor** (service role):

```sql
update public.profiles
set role = 'admin'
where github_username = 'your-github-username';
```

Refresh the app: the **Admin** link appears in the navigation and
`/admin/challenges` becomes available. This is also the only supported way to
change a role — the API cannot update the `role` column.

## 7. Seed sample data (optional)

After you are an admin, paste `supabase/seed.sql` into the SQL Editor. It
creates one company (**Lumen Labs**) owned by the first admin and three open
challenges — **Backend Intern**, **ML Intern** and **Frontend Intern** — with
dates relative to the day you run it.

The seed uses fixed ids and `on conflict do nothing`, so it is safe to re-run.
To remove the sample data later:

```sql
delete from public.challenges
where id in (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103'
);
delete from public.companies where id = '00000000-0000-4000-8000-000000000001';
```

## Database

| Table | Purpose |
| --- | --- |
| `profiles` | One row per auth user: GitHub username, name, college, skills, role |
| `companies` | Company profile owned by a user |
| `challenges` | Challenge posted by a company (role, skills, dates, status) |
| `enrollments` | A student's enrollment in a challenge (repo URL, status) |
| `checkins` | Daily did / blocked / next updates per enrollment |
| `commits` | Commits synced per enrollment |
| `milestones` | Weekly deploy URL and note per enrollment |
| `scores` | Consistency, project quality, demo and computed total per enrollment |

### Row-level security

- **Companies** are readable by any signed-in user (challenge cards show the
  name). Only admins can insert, update or delete them.
- **Challenges** are readable by any signed-in user when `status = 'open'`.
  Students also keep reading challenges they are enrolled in, even after they
  close. Only admins can insert, update or delete challenges.
- **Enrollments** are visible to their student and to admins. A student can
  insert only their own enrollment, only for an open challenge whose end date
  has not passed, and `unique (challenge_id, student_id)` prevents duplicates.
- **Profiles** are visible to their owner and admins; the `role` column cannot
  be updated through the API (column-level privileges).
- **Check-ins, commits, milestones and scores** follow their enrollment: the
  owning student and admins can access them.
- Unauthenticated requests have no table access.

### First login

`0003_new_user_profile.sql` adds an `auth.users` trigger that inserts a
`profiles` row with `role = 'student'`, the GitHub username (`user_name`) and the
full name from GitHub metadata. The trigger uses `on conflict do nothing`, so it
runs at most once per user.

## Notes

- No UI libraries or ORMs are used — just Next.js, Tailwind and Supabase.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to expose
  in the browser; access is enforced by row-level security.
- The `.env.local` placeholder values let the app build; replace them with real
  project values before signing in.
