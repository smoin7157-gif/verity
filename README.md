# ProofHire

Proof over promises: companies post real challenges, students enroll, and daily
check-ins, commits and milestones build a verified track record.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS**, and **Supabase**
for auth (GitHub OAuth) and the Postgres database.

## What's inside

- `/` — landing page with **Continue with GitHub** / **Log out** buttons.
- `/dashboard` — protected page showing the signed-in user's name, GitHub
  username, role, college and skills.
- `/auth/callback` — OAuth callback that exchanges the GitHub code for a session.
- `lib/supabase/client.ts` — browser Supabase client.
- `lib/supabase/server.ts` — server Supabase client (Server Components, Route
  Handlers, Server Actions).
- `proxy.ts` — refreshes the Supabase session cookie on each request.
- `supabase/migrations/` — schema, RLS policies and the first-login trigger.

## 1. Create the Supabase project

1. Create a project at [database.new](https://database.new).
2. Copy the project URL and the **anon / public** key from
   **Project Settings → API**.

## 2. Run the migrations

Run the files in `supabase/migrations/` **in order** in the Supabase
**SQL Editor**:

1. `0001_init.sql` — tables and indexes.
2. `0002_rls.sql` — row-level security and table privileges.
3. `0003_new_user_profile.sql` — trigger that creates a `profiles` row on first
   login.

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

- **Students** can read and write only their own rows: their profile, their
  enrollments and the check-ins, commits, milestones and scores attached to
  those enrollments. Open challenges are readable so they can enroll.
- **Admins** can read everything.
- **Company owners** can manage their own company and its challenges.
- Profile updates are column-limited so a student cannot promote themselves to
  `admin`; role changes must go through the Supabase SQL editor / service role.

Promote a user to admin (service role, e.g. SQL editor):

```sql
update public.profiles set role = 'admin' where github_username = 'their-handle';
```

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
