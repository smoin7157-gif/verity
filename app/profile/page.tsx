import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { updateProfile } from "@/app/profile/actions";
import { AppNav } from "@/components/app-nav";
import { ProfileForm } from "@/components/profile-form";
import { SkillTags } from "@/components/skill-tags";
import { requireProfile } from "@/lib/auth";

type SearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

export default function ProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <Suspense
          fallback={<p className="text-sm text-zinc-400">Loading profile…</p>}
        >
          <ProfileView searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function ProfileView({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawEdit = params.edit;
  const isEditing = (Array.isArray(rawEdit) ? rawEdit[0] : rawEdit) === "1";

  const { user, profile } = await requireProfile();

  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;
  const githubUrl = profile.github_username
    ? `https://github.com/${profile.github_username}`
    : null;

  return (
    <div className="space-y-8">
      <AppNav isAdmin={profile.role === "admin"} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-full border border-zinc-800"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-zinc-800 bg-zinc-800 text-lg font-semibold text-zinc-300">
              {initials(profile.full_name)}
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-400">
              Profile
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
              {profile.full_name ?? "Your name"}
            </h1>
            {githubUrl && profile.github_username ? (
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block font-mono text-sm text-zinc-400 underline-offset-4 hover:text-emerald-400 hover:underline"
              >
                @{profile.github_username}
              </a>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">GitHub not linked</p>
            )}
          </div>
        </div>

        <Link
          href={isEditing ? "/profile" : "/profile?edit=1"}
          className={
            isEditing
              ? "inline-flex h-10 items-center justify-center rounded-full border border-zinc-700 px-5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              : "inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
          }
        >
          {isEditing ? "Cancel" : "Edit profile"}
        </Link>
      </header>

      {isEditing ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <ProfileForm action={updateProfile} profile={profile} mode="edit" />
        </section>
      ) : (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                College
              </dt>
              <dd className="mt-1 text-sm text-zinc-200">
                {profile.college ?? "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                Branch
              </dt>
              <dd className="mt-1 text-sm text-zinc-200">
                {profile.branch ?? "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                Year of study
              </dt>
              <dd className="mt-1 text-sm text-zinc-200">
                {profile.year_of_study
                  ? `Year ${profile.year_of_study}`
                  : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                Phone
              </dt>
              <dd className="mt-1 text-sm text-zinc-200">
                {profile.phone ?? "Not set"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                LinkedIn
              </dt>
              <dd className="mt-1 truncate text-sm">
                {profile.linkedin_url ? (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 underline-offset-4 hover:underline"
                  >
                    {profile.linkedin_url}
                  </a>
                ) : (
                  <span className="text-zinc-500">Not set</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Bio
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-300">
              {profile.bio ?? "No bio yet."}
            </p>
          </div>

          <div className="mt-6">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Skills
            </h2>
            <div className="mt-2">
              <SkillTags skills={profile.skills ?? []} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function initials(name: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
