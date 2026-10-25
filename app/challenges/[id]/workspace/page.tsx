import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { RepoForm } from "@/components/repo-form";
import { StatusBadge } from "@/components/status-badge";
import { SyncButton } from "@/components/sync-button";
import { requireProfile } from "@/lib/auth";
import { formatDateRange, formatDateTime } from "@/lib/format";
import { syncCooldownRemainingMs } from "@/lib/github-sync";
import type {
  CommitRow,
  CommitStats,
  WorkspaceEnrollment,
} from "@/lib/types";

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <Suspense
          fallback={<p className="text-sm text-zinc-400">Loading workspace…</p>}
        >
          <Workspace params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Workspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireProfile();

  if (profile.role !== "student") redirect(`/challenges/${id}`);

  const { data } = await supabase
    .from("enrollments")
    .select(
      "id, repo_url, last_synced_at, last_sync_attempt_at, sync_error, challenges ( id, title, role, status, start_date, end_date, companies ( name ) )",
    )
    .eq("challenge_id", id)
    .eq("student_id", user.id)
    .maybeSingle();

  const enrollment = data as unknown as WorkspaceEnrollment | null;
  // Only enrolled students (and admins through RLS) get this far.
  if (!enrollment) redirect(`/challenges/${id}`);

  const challenge = enrollment.challenges;
  if (!challenge) notFound();

  const [statsResult, commitsResult] = await Promise.all([
    supabase.rpc("commit_stats", { target_enrollment: enrollment.id }),
    supabase
      .from("commits")
      .select(
        "sha, message, author_login, author_date, committer_date, url, additions, deletions, committed_at",
      )
      .eq("enrollment_id", enrollment.id)
      .order("committed_at", { ascending: false })
      .limit(20),
  ]);

  const stats =
    ((statsResult.data ?? []) as unknown as CommitStats[])[0] ?? {
      total: 0,
      active_days: 0,
    };
  const commits = (commitsResult.data ?? []) as unknown as CommitRow[];

  const cooldownRemainingMs = syncCooldownRemainingMs(
    enrollment.last_sync_attempt_at,
  );
  const locked = Boolean(enrollment.last_synced_at);
  const totalCommits = Math.max(stats.total ?? 0, commits.length);

  return (
    <div className="space-y-8">
      <AppNav isAdmin={false} />

      <div>
        <Link
          href={`/challenges/${challenge.id}`}
          className="text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
        >
          ← Challenge
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">
              {challenge.companies?.name ?? "Unknown company"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
              {challenge.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Workspace · {formatDateRange(challenge.start_date, challenge.end_date)}
            </p>
          </div>
          <StatusBadge status={challenge.status} />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Commits
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">{totalCommits}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Active days
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {stats.active_days ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Last synced
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-200">
            {formatDateTime(enrollment.last_synced_at)}
          </p>
        </div>
      </section>

      {enrollment.sync_error ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"
        >
          <p className="font-medium">The last sync failed</p>
          <p className="mt-1 leading-6">{enrollment.sync_error}</p>
          <p className="mt-2 text-xs text-amber-300/70">
            Fix the repository or wait for GitHub&apos;s rate limit to reset, then
            sync again.
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Repository
        </h2>

        {enrollment.repo_url ? (
          <div className="mt-3">
            <a
              href={enrollment.repo_url}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-sm text-emerald-400 underline-offset-4 hover:underline"
            >
              {enrollment.repo_url.replace(/^https?:\/\//, "")}
            </a>

            {locked ? (
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Locked after the first sync so the commit history stays
                trustworthy.
              </p>
            ) : (
              <RepoForm
                challengeId={challenge.id}
                defaultValue={enrollment.repo_url}
              />
            )}
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-zinc-400">
              Link the public GitHub repository for this challenge. You can change
              it until the first sync.
            </p>
            <RepoForm challengeId={challenge.id} />
          </>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            Commit sync
          </h2>
          {enrollment.repo_url ? (
            <SyncButton
              challengeId={challenge.id}
              cooldownRemainingMs={cooldownRemainingMs}
            />
          ) : null}
        </div>

        {enrollment.repo_url ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Commits authored by{" "}
            <span className="font-mono text-zinc-300">
              @{profile.github_username ?? "you"}
            </span>{" "}
            since the challenge start date are imported. Syncs also run
            automatically every 6 hours.
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            Link a repository above to start syncing commits.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            Recent commits
          </h2>
          <span className="text-xs text-zinc-500">
            Showing {commits.length} of {totalCommits}
          </span>
        </div>

        {commits.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No commits yet. Link a repository and hit sync, or wait for the next
            automatic sync.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800">
            {commits.map((commit) => {
              const title = (commit.message ?? "").split("\n")[0] || "Untitled commit";

              return (
                <li
                  key={commit.sha}
                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {title}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-zinc-500">
                      {commit.sha.slice(0, 7)} ·{" "}
                      {formatDateTime(
                        commit.committer_date ?? commit.committed_at,
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-400">
                      +{commit.additions}
                    </span>
                    <span className="text-red-400">−{commit.deletions}</span>
                    {commit.url ? (
                      <a
                        href={commit.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-400 underline-offset-4 hover:text-white hover:underline"
                      >
                        GitHub
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link
        href="/dashboard"
        className="inline-block text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
