"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import {
  GitHubError,
  fetchRepo,
  hasGithubToken,
  isContributor,
  parseRepoUrl,
} from "@/lib/github";
import { syncCooldownRemainingMs, syncEnrollment } from "@/lib/github-sync";
import type { RepoFormState, SyncState } from "@/lib/types";

function describe(error: unknown): string {
  if (error instanceof GitHubError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong talking to GitHub.";
}

/** Saves the student's repository URL after checking it on GitHub. */
export async function linkRepo(
  _previousState: RepoFormState,
  formData: FormData,
): Promise<RepoFormState> {
  const challengeId = String(formData.get("challenge_id") ?? "").trim();
  const rawUrl = String(formData.get("repo_url") ?? "").trim();

  if (!challengeId) return { error: "Missing challenge.", success: null };
  if (rawUrl.length > 300) {
    return { error: "That repository URL is too long.", success: null };
  }

  const { supabase, user, profile } = await requireProfile();

  if (profile.role !== "student") {
    return { error: "Only students can link a repository.", success: null };
  }

  const { data } = await supabase
    .from("enrollments")
    .select("id, repo_url, last_synced_at")
    .eq("challenge_id", challengeId)
    .eq("student_id", user.id)
    .maybeSingle();

  const enrollment = data as {
    id: string;
    repo_url: string | null;
    last_synced_at: string | null;
  } | null;

  if (!enrollment) {
    return { error: "Join this challenge before linking a repository.", success: null };
  }

  if (enrollment.last_synced_at) {
    return {
      error: "The repository is locked after the first sync.",
      success: null,
    };
  }

  const parsed = parseRepoUrl(rawUrl);
  if (!parsed) {
    return {
      error: "Enter a repository URL like https://github.com/owner/repo.",
      success: null,
    };
  }

  const githubUsername = profile.github_username?.trim();
  if (!githubUsername) {
    return {
      error: "Your profile has no GitHub username, so ownership cannot be checked.",
      success: null,
    };
  }

  if (!hasGithubToken()) {
    return {
      error: "GitHub access is not configured: GITHUB_TOKEN is missing on the server.",
      success: null,
    };
  }

  try {
    const repo = await fetchRepo(parsed.owner, parsed.repo);

    if (repo.private) {
      return {
        error: "That repository is private. Link a public repository.",
        success: null,
      };
    }

    const ownerLogin = repo.owner?.login ?? parsed.owner;
    const ownsRepo =
      ownerLogin.toLowerCase() === githubUsername.toLowerCase();

    if (
      !ownsRepo &&
      !(await isContributor(parsed.owner, parsed.repo, githubUsername))
    ) {
      return {
        error: `GitHub does not list @${githubUsername} as a contributor of ${parsed.owner}/${parsed.repo}. Use a repo you own or contribute to.`,
        success: null,
      };
    }

    const canonicalUrl =
      repo.html_url || `https://github.com/${parsed.owner}/${parsed.repo}`;

    const { data: updated, error } = await supabase
      .from("enrollments")
      .update({ repo_url: canonicalUrl })
      .eq("id", enrollment.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return { error: "Could not save the repository. Try again.", success: null };
    }

    if (!updated) {
      return {
        error: "The repository can no longer be changed — it is already locked.",
        success: null,
      };
    }

    revalidatePath(`/challenges/${challengeId}/workspace`);

    return { error: null, success: "Repository linked." };
  } catch (error) {
    return { error: describe(error), success: null };
  }
}

/** Manual sync, limited to once every 10 minutes per enrollment. */
export async function syncNow(
  _previousState: SyncState,
  formData: FormData,
): Promise<SyncState> {
  const challengeId = String(formData.get("challenge_id") ?? "").trim();
  if (!challengeId) return { error: "Missing challenge.", success: null };

  const { supabase, user, profile } = await requireProfile();

  if (profile.role !== "student") {
    return { error: "Only students can sync a workspace.", success: null };
  }

  const { data } = await supabase
    .from("enrollments")
    .select("id, repo_url, last_sync_attempt_at")
    .eq("challenge_id", challengeId)
    .eq("student_id", user.id)
    .maybeSingle();

  const enrollment = data as {
    id: string;
    repo_url: string | null;
    last_sync_attempt_at: string | null;
  } | null;

  if (!enrollment) {
    return { error: "Join this challenge before syncing.", success: null };
  }

  if (!enrollment.repo_url) {
    return { error: "Link a repository before syncing.", success: null };
  }

  const remaining = syncCooldownRemainingMs(enrollment.last_sync_attempt_at);
  if (remaining > 0) {
    const minutes = Math.max(1, Math.ceil(remaining / 60_000));
    return {
      error: `Sync is limited to once every 10 minutes. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      success: null,
    };
  }

  const result = await syncEnrollment(enrollment.id);
  revalidatePath(`/challenges/${challengeId}/workspace`);

  if (!result.ok) {
    return { error: result.error, success: null };
  }

  return {
    error: null,
    success:
      result.added === 0
        ? "Already up to date — no new commits."
        : `Synced ${result.added} new commit${result.added === 1 ? "" : "s"} (${result.total} total).`,
  };
}
