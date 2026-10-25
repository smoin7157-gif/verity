import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { JoinButton } from "@/components/join-button";
import { SkillTags } from "@/components/skill-tags";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
import { todayInKolkata } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import type { ChallengeDetail } from "@/lib/types";

export default function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <Suspense
          fallback={<p className="text-sm text-zinc-400">Loading challenge…</p>}
        >
          <ChallengeDetailView params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function ChallengeDetailView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await requireProfile();

  const { data } = await supabase
    .from("challenges")
    .select(
      "id, company_id, title, role, required_skills, problem_statement, start_date, end_date, status, companies ( name )",
    )
    .eq("id", id)
    .maybeSingle();

  const challenge = data as unknown as ChallengeDetail | null;
  if (!challenge) notFound();

  const { data: enrollmentData } = await supabase
    .from("enrollments")
    .select("id")
    .eq("challenge_id", challenge.id)
    .eq("student_id", user.id)
    .maybeSingle();

  const joined = Boolean(enrollmentData);
  const today = todayInKolkata();
  const isOpen =
    challenge.status === "open" &&
    (!challenge.end_date || challenge.end_date >= today);

  const studentSkills = new Set(
    (profile.skills ?? []).map((skill) => skill.toLowerCase()),
  );
  const matchedSkills = challenge.required_skills.filter((skill) =>
    studentSkills.has(skill.toLowerCase()),
  );
  const missingSkills = challenge.required_skills.filter(
    (skill) => !studentSkills.has(skill.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <AppNav isAdmin={profile.role === "admin"} />

      <div>
        <Link
          href="/challenges"
          className="text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
        >
          ← All challenges
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">
              {challenge.companies?.name ?? "Unknown company"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
              {challenge.title}
            </h1>
            <p className="mt-1 text-zinc-400">{challenge.role}</p>
          </div>
          <StatusBadge status={challenge.status} />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-500">
          <span>
            Starts{" "}
            <span className="text-zinc-300">
              {formatDate(challenge.start_date)}
            </span>
          </span>
          <span>
            Ends{" "}
            <span className="text-zinc-300">
              {formatDate(challenge.end_date)}
            </span>
          </span>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Problem statement
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">
          {challenge.problem_statement || "No problem statement provided."}
        </p>

        <h2 className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Required skills
        </h2>
        <div className="mt-3">
          <SkillTags skills={challenge.required_skills} />
        </div>
      </section>

      {profile.role === "student" ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            Your skill match
          </h2>

          {challenge.required_skills.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">
              This challenge lists no required skills.
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm text-zinc-300">
                You match{" "}
                <span className="font-semibold text-emerald-300">
                  {matchedSkills.length}
                </span>{" "}
                of {challenge.required_skills.length} required skills
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {matchedSkills.map((skill) => (
                  <li
                    key={`matched-${skill}`}
                    className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"
                  >
                    {skill}
                  </li>
                ))}
                {missingSkills.map((skill) => (
                  <li
                    key={`missing-${skill}`}
                    className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-400"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
              {missingSkills.length > 0 ? (
                <p className="mt-3 text-xs text-zinc-500">
                  Missing skills are gray — you can still join and learn them.
                </p>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {joined ? "You're in" : isOpen ? "Ready to build?" : "Enrollment closed"}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {joined
              ? "Your enrollment is active — open the workspace to link your repo and sync commits."
              : isOpen
                ? "Join to log daily check-ins, commits and milestones."
                : "This challenge is not accepting new students right now."}
          </p>
        </div>

        {joined ? (
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
              Joined
            </span>
            {profile.role === "student" ? (
              <Link
                href={`/challenges/${challenge.id}/workspace`}
                className="text-sm text-emerald-400 underline-offset-4 hover:underline"
              >
                Open workspace →
              </Link>
            ) : null}
          </div>
        ) : profile.role === "student" && isOpen ? (
          <JoinButton challengeId={challenge.id} />
        ) : (
          <span className="text-sm text-zinc-500">
            {profile.role === "student" ? "Closed" : "Students only"}
          </span>
        )}
      </section>
    </div>
  );
}
