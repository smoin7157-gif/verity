import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { JoinButton } from "@/components/join-button";
import { SkillTags } from "@/components/skill-tags";
import { StatusBadge } from "@/components/status-badge";
import { requireProfile } from "@/lib/auth";
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
  const today = new Date().toISOString().slice(0, 10);
  const isOpen =
    challenge.status === "open" &&
    (!challenge.end_date || challenge.end_date >= today);

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

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {joined ? "You're in" : isOpen ? "Ready to build?" : "Enrollment closed"}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {joined
              ? "Your enrollment is active. Track it from your dashboard."
              : isOpen
                ? "Join to log daily check-ins, commits and milestones."
                : "This challenge is not accepting new students right now."}
          </p>
        </div>

        {joined ? (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
            Joined
          </span>
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
