import { GitHubError, collectCommits, hasGithubToken, parseRepoUrl } from "@/lib/github";
import { createAdminClient } from "@/lib/supabase/admin";

export const SYNC_COOLDOWN_MS = 10 * 60 * 1000;

/** Milliseconds left before `lastAttempt` may sync again (0 when allowed). */
export function syncCooldownRemainingMs(
  lastAttempt: string | null | undefined,
): number {
  if (!lastAttempt) return 0;

  const time = new Date(lastAttempt).getTime();
  if (Number.isNaN(time)) return 0;

  return Math.max(0, time + SYNC_COOLDOWN_MS - Date.now());
}

export type SyncResult =
  | { ok: true; added: number; total: number }
  | { ok: false; error: string };

export type SyncAllResult = {
  total: number;
  synced: number;
  failed: number;
  errors: { enrollmentId: string; error: string }[];
};

type EnrollmentForSync = {
  id: string;
  repo_url: string | null;
  challenges: { start_date: string | null } | null;
  profiles: { github_username: string | null } | null;
};

function describeError(error: unknown): string {
  if (error instanceof GitHubError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong while syncing commits.";
}

/**
 * Pulls the linked repository's commits for one enrollment and stores the ones
 * authored by the student. Safe to call repeatedly: the upsert ignores rows
 * that already exist for (enrollment_id, sha).
 *
 * All writes use the service role because `commits` is read-only through RLS.
 */
export async function syncEnrollment(
  enrollmentId: string,
): Promise<SyncResult> {
  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }

  const { data, error } = await admin
    .from("enrollments")
    .select(
      "id, repo_url, challenges ( start_date ), profiles ( github_username )",
    )
    .eq("id", enrollmentId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Could not load the enrollment." };
  }

  const enrollment = data as unknown as EnrollmentForSync | null;
  if (!enrollment) {
    return { ok: false, error: "Enrollment not found." };
  }

  try {
    if (!enrollment.repo_url) {
      throw new GitHubError("Link a GitHub repository before syncing.");
    }

    if (!hasGithubToken()) {
      throw new GitHubError(
        "GitHub sync is not configured: GITHUB_TOKEN is missing on the server.",
      );
    }

    const parsed = parseRepoUrl(enrollment.repo_url);
    if (!parsed) {
      throw new GitHubError(
        "The linked repository URL is not a valid GitHub repository URL.",
      );
    }

    const login = enrollment.profiles?.github_username?.trim();
    if (!login) {
      throw new GitHubError(
        "Your profile has no GitHub username, so commits cannot be matched.",
      );
    }

    const { data: existingData, error: existingError } = await admin
      .from("commits")
      .select("sha")
      .eq("enrollment_id", enrollmentId);

    if (existingError) {
      throw new Error("Could not load the commits already stored.");
    }

    const existingShas = new Set(
      ((existingData ?? []) as { sha: string }[]).map((row) => row.sha),
    );

    const startDate = enrollment.challenges?.start_date;
    const rows = await collectCommits({
      owner: parsed.owner,
      repo: parsed.repo,
      login,
      since: startDate ? `${startDate}T00:00:00Z` : null,
      existingShas,
    });

    if (rows.length > 0) {
      const { error: upsertError } = await admin.from("commits").upsert(
        rows.map((row) => ({ ...row, enrollment_id: enrollmentId })),
        { onConflict: "enrollment_id,sha", ignoreDuplicates: true },
      );

      if (upsertError) {
        throw new Error(`Could not save commits: ${upsertError.message}`);
      }
    }

    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("enrollments")
      .update({
        last_synced_at: now,
        last_sync_attempt_at: now,
        sync_error: null,
      })
      .eq("id", enrollmentId);

    if (updateError) {
      throw new Error(
        "Commits were saved but the enrollment could not be updated.",
      );
    }

    const { count } = await admin
      .from("commits")
      .select("id", { count: "exact", head: true })
      .eq("enrollment_id", enrollmentId);

    return {
      ok: true,
      added: rows.length,
      total: count ?? existingShas.size + rows.length,
    };
  } catch (error) {
    const message = describeError(error);

    // Record the failure so the workspace can explain what happened. The
    // attempt timestamp starts the 10-minute cooldown even on errors.
    await admin
      .from("enrollments")
      .update({
        sync_error: message.slice(0, 500),
        last_sync_attempt_at: new Date().toISOString(),
      })
      .eq("id", enrollmentId);

    return { ok: false, error: message };
  }
}

/** Syncs every active enrollment that has a repository linked. */
export async function syncAllEnrollments(): Promise<SyncAllResult> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("enrollments")
    .select("id")
    .eq("status", "active")
    .not("repo_url", "is", null);

  if (error) {
    throw new Error(`Could not load enrollments: ${error.message}`);
  }

  const enrollments = (data ?? []) as { id: string }[];
  const errors: SyncAllResult["errors"] = [];
  let synced = 0;

  for (const enrollment of enrollments) {
    const result = await syncEnrollment(enrollment.id);
    if (result.ok) {
      synced += 1;
    } else {
      errors.push({ enrollmentId: enrollment.id, error: result.error });
    }
  }

  return {
    total: enrollments.length,
    synced,
    failed: errors.length,
    errors,
  };
}
