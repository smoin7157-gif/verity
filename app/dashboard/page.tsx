import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  github_username: string | null;
  full_name: string | null;
  college: string | null;
  skills: string[] | null;
  role: "student" | "admin" | "company";
  created_at: string;
};

export default function DashboardPage() {
  return (
    <main className="flex flex-1 items-start justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <Suspense
          fallback={<p className="text-sm text-zinc-400">Loading your dashboard…</p>}
        >
          <Dashboard />
        </Suspense>
      </div>
    </main>
  );
}

async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected route: no session means no dashboard.
  if (!user) {
    redirect("/");
  }

  const { data } = await supabase
    .from("profiles")
    .select("github_username, full_name, college, skills, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as Profile | null;

  // Fall back to GitHub metadata if the profile row has not been created yet.
  const fullName =
    profile?.full_name ??
    (user.user_metadata.full_name as string | undefined) ??
    user.email ??
    "there";
  const githubUsername =
    profile?.github_username ??
    (user.user_metadata.user_name as string | undefined) ??
    (user.user_metadata.preferred_username as string | undefined) ??
    null;
  const skills = profile?.skills ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-400">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {fullName}
          </h1>
          {githubUsername ? (
            <a
              href={`https://github.com/${githubUsername}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block font-mono text-sm text-zinc-400 underline-offset-4 hover:text-emerald-400 hover:underline"
            >
              @{githubUsername}
            </a>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">GitHub username not set</p>
          )}
        </div>
        <SignOutButton />
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium capitalize text-emerald-300">
            {profile?.role ?? "student"}
          </span>
          {profile?.college ? (
            <span className="text-sm text-zinc-400">{profile.college}</span>
          ) : (
            <span className="text-sm text-zinc-500">No college added yet</span>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            Skills
          </h2>
          {skills.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {skill}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              No skills yet — they will show up here once added to your profile.
            </p>
          )}
        </div>

        <p className="mt-6 text-xs leading-5 text-zinc-500">
          This profile was created automatically on your first GitHub login.
          Students can only see their own profile; admins can see everyone.
        </p>
      </section>

      <Link
        href="/"
        className="inline-block text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
      >
        ← Back home
      </Link>
    </div>
  );
}
