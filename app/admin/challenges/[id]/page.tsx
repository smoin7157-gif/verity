import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminTabs } from "@/components/admin-tabs";
import { AppNav } from "@/components/app-nav";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { todayInKolkata } from "@/lib/dates";
import { formatDateRange } from "@/lib/format";
import { checkinSummary } from "@/lib/streaks";
import type { AdminChallengeDetail } from "@/lib/types";

export default function AdminChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-5xl">
        <Suspense
          fallback={<p className="text-sm text-zinc-400">Loading challenge…</p>}
        >
          <AdminChallenge params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function AdminChallenge({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("challenges")
    .select(
      "id, title, role, status, start_date, end_date, companies ( name ), enrollments ( id, status, student_id, profiles ( full_name, github_username ) )",
    )
    .eq("id", id)
    .maybeSingle();

  const challenge = data as unknown as AdminChallengeDetail | null;
  if (!challenge) notFound();

  const enrollments = challenge.enrollments ?? [];
  const enrollmentIds = enrollments.map((enrollment) => enrollment.id);

  let checkins: { enrollment_id: string; date: string }[] = [];
  let commits: { enrollment_id: string }[] = [];

  if (enrollmentIds.length > 0) {
    const [checkinResult, commitResult] = await Promise.all([
      supabase
        .from("checkins")
        .select("enrollment_id, date")
        .in("enrollment_id", enrollmentIds),
      supabase
        .from("commits")
        .select("enrollment_id")
        .in("enrollment_id", enrollmentIds),
    ]);

    checkins = (checkinResult.data ?? []) as { enrollment_id: string; date: string }[];
    commits = (commitResult.data ?? []) as { enrollment_id: string }[];
  }

  const datesByEnrollment = new Map<string, string[]>();
  for (const checkin of checkins) {
    const dates = datesByEnrollment.get(checkin.enrollment_id) ?? [];
    dates.push(checkin.date);
    datesByEnrollment.set(checkin.enrollment_id, dates);
  }

  const commitsByEnrollment = new Map<string, number>();
  for (const commit of commits) {
    commitsByEnrollment.set(
      commit.enrollment_id,
      (commitsByEnrollment.get(commit.enrollment_id) ?? 0) + 1,
    );
  }

  const today = todayInKolkata();
  const rows = enrollments
    .map((enrollment) => {
      const summary = checkinSummary(
        datesByEnrollment.get(enrollment.id) ?? [],
        challenge.start_date,
        challenge.end_date,
        today,
      );

      return {
        enrollment,
        student: enrollment.profiles,
        summary,
        commits: commitsByEnrollment.get(enrollment.id) ?? 0,
      };
    })
    .sort((a, b) =>
      (a.student?.full_name ?? "").localeCompare(b.student?.full_name ?? ""),
    );

  return (
    <div className="space-y-8">
      <AppNav isAdmin />
      <AdminTabs active="challenges" />

      <div>
        <Link
          href="/admin/challenges"
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
            <p className="mt-1 text-sm text-zinc-400">
              {challenge.role} ·{" "}
              {formatDateRange(challenge.start_date, challenge.end_date)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={challenge.status} />
            <Link
              href={`/admin/challenges/${challenge.id}/edit`}
              className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
            >
              Edit challenge
            </Link>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            Enrolled students
          </h2>
          <span className="text-xs text-zinc-500">
            {rows.length} {rows.length === 1 ? "student" : "students"}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No students have joined this challenge yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Student
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Current streak
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Check-ins
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Commits
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.map(({ enrollment, student, summary, commits: totalCommits }) => (
                  <tr key={enrollment.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">
                        {student?.full_name ?? "Unnamed student"}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        {student?.github_username ? (
                          <a
                            href={`https://github.com/${student.github_username}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-zinc-400 underline-offset-4 hover:text-emerald-400 hover:underline"
                          >
                            @{student.github_username}
                          </a>
                        ) : (
                          <span>No GitHub</span>
                        )}
                        <StatusBadge status={enrollment.status} />
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-zinc-200">
                      {summary.current}{" "}
                      <span className="text-xs text-zinc-500">
                        day{summary.current === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-zinc-200">
                      {summary.total}
                      {summary.elapsedDays > 0 ? (
                        <span className="text-xs text-zinc-500">
                          {" "}
                          / {summary.elapsedDays}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 text-zinc-200">{totalCommits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
