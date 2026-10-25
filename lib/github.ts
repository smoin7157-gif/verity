/**
 * Minimal GitHub REST client used by repo linking and commit sync.
 * Only `fetch` is used — no SDK. A server-only GITHUB_TOKEN raises the rate
 * limit from 60 to 5,000 requests per hour.
 */

const GITHUB_API = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 15_000;
const PER_PAGE = 100;
const MAX_PAGES = 10;
const MAX_COMMITS_PER_SYNC = 200;
const DETAIL_CONCURRENCY = 5;

export class GitHubError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

export type GithubRepo = {
  full_name: string;
  html_url: string;
  private: boolean;
  owner: { login: string } | null;
};

type GithubCommitListItem = {
  sha: string;
  html_url?: string;
  commit: {
    message?: string;
    author?: { date?: string } | null;
    committer?: { date?: string } | null;
  };
  author?: { login?: string } | null;
};

type GithubCommitDetail = {
  html_url?: string;
  stats?: { additions?: number; deletions?: number };
  commit?: {
    message?: string;
    author?: { date?: string } | null;
    committer?: { date?: string } | null;
  };
};

/** A row ready to be written to public.commits (minus enrollment_id). */
export type SyncedCommit = {
  sha: string;
  message: string;
  author_login: string;
  author_date: string | null;
  committer_date: string | null;
  url: string | null;
  additions: number;
  deletions: number;
  committed_at: string;
};

export function hasGithubToken(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

/**
 * Accepts https://github.com/owner/repo (with optional trailing slash or
 * .git suffix). Returns null for anything else.
 */
export function parseRepoUrl(raw: string): { owner: string; repo: string } | null {
  const value = raw.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.hostname.replace(/^www\./i, "").toLowerCase() !== "github.com") {
    return null;
  }

  const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length !== 2) return null;

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  const validName = /^[A-Za-z0-9_.-]+$/;

  if (!validName.test(owner) || !validName.test(repo)) return null;
  if (owner === "." || owner === ".." || repo === "." || repo === "..") {
    return null;
  }

  return { owner, repo };
}

function rateLimitMessage(response: Response): string {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    const minutes = Math.max(1, Math.ceil(retryAfter / 60));
    return `GitHub API rate limit reached. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }

  const reset = Number(response.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(reset) && reset > 0) {
    const minutes = Math.max(1, Math.ceil((reset * 1000 - Date.now()) / 60_000));
    return `GitHub API rate limit reached. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }

  return "GitHub API rate limit reached. Try again later.";
}

async function githubFetch(path: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ProofHire",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GitHubError(
      "Could not reach GitHub. Check your connection and try again.",
    );
  }

  if (response.ok) return response;

  if (response.status === 401) {
    throw new GitHubError(
      "GitHub rejected GITHUB_TOKEN. Check the token and try again.",
      401,
    );
  }

  if (response.status === 404) {
    throw new GitHubError(
      "That repository could not be found on GitHub, or it is private.",
      404,
    );
  }

  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0" || response.status === 429) {
      throw new GitHubError(rateLimitMessage(response), response.status);
    }
    throw new GitHubError(
      "GitHub refused the request. Check that GITHUB_TOKEN is valid and has public repo read access.",
      response.status,
    );
  }

  throw new GitHubError(`GitHub API error (${response.status}).`, response.status);
}

export async function fetchRepo(owner: string, repo: string): Promise<GithubRepo> {
  const response = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
  );
  return (await response.json()) as GithubRepo;
}

/**
 * True when `login` is the repository owner or appears as a contributor.
 * Falls back to the commits `author` filter for contributors beyond the first
 * page of the contributors list.
 */
export async function isContributor(
  owner: string,
  repo: string,
  login: string,
): Promise<boolean> {
  const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  const contributorsResponse = await githubFetch(
    `${path}/contributors?per_page=${PER_PAGE}`,
  );
  const contributors = (await contributorsResponse.json()) as
    | { login?: string }[]
    | null;

  if (
    Array.isArray(contributors) &&
    contributors.some(
      (contributor) => contributor.login?.toLowerCase() === login.toLowerCase(),
    )
  ) {
    return true;
  }

  const commitsResponse = await githubFetch(
    `${path}/commits?author=${encodeURIComponent(login)}&per_page=1`,
  );
  const commits = (await commitsResponse.json()) as unknown[] | null;

  return Array.isArray(commits) && commits.length > 0;
}

async function toSyncedCommit(
  owner: string,
  repo: string,
  item: GithubCommitListItem,
): Promise<SyncedCommit> {
  const listAuthorDate = item.commit.author?.date ?? null;
  const listCommitterDate = item.commit.committer?.date ?? null;

  let message = item.commit.message ?? "";
  let url: string | null = item.html_url ?? null;
  let authorDate = listAuthorDate;
  let committerDate = listCommitterDate;
  let additions = 0;
  let deletions = 0;

  try {
    const response = await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(item.sha)}`,
    );
    const detail = (await response.json()) as GithubCommitDetail;

    additions = detail.stats?.additions ?? 0;
    deletions = detail.stats?.deletions ?? 0;
    if (detail.commit?.message) message = detail.commit.message;
    if (detail.html_url) url = detail.html_url;
    authorDate = detail.commit?.author?.date ?? authorDate;
    committerDate = detail.commit?.committer?.date ?? committerDate;
  } catch (error) {
    // A deleted commit (404) or a diff GitHub refuses to render (422) should
    // not fail the whole sync — keep the list data and zeroed stats.
    if (
      !(error instanceof GitHubError) ||
      (error.status !== 404 && error.status !== 422)
    ) {
      throw error;
    }
  }

  return {
    sha: item.sha,
    message,
    author_login: item.author?.login ?? "",
    author_date: authorDate,
    committer_date: committerDate,
    url,
    additions,
    deletions,
    committed_at: committerDate ?? authorDate ?? new Date().toISOString(),
  };
}

export type CollectCommitsInput = {
  owner: string;
  repo: string;
  login: string;
  /** ISO timestamp; commits before it are ignored. */
  since?: string | null;
  existingShas?: Iterable<string>;
  maxPages?: number;
};

/**
 * Fetches the repository's commit list (newest first), keeps only commits
 * authored by `login`, and enriches the ones not stored yet with diff stats.
 */
export async function collectCommits({
  owner,
  repo,
  login,
  since,
  existingShas,
  maxPages = MAX_PAGES,
}: CollectCommitsInput): Promise<SyncedCommit[]> {
  const existing = new Set(existingShas ?? []);
  const seen = new Set<string>();
  const pending: GithubCommitListItem[] = [];
  const wantedLogin = login.toLowerCase();

  for (let page = 1; page <= maxPages; page += 1) {
    const query = new URLSearchParams({
      per_page: String(PER_PAGE),
      page: String(page),
    });
    if (since) query.set("since", since);

    const response = await githubFetch(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?${query.toString()}`,
    );
    const batch = (await response.json()) as GithubCommitListItem[] | null;

    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const item of batch) {
      if (!item?.sha || seen.has(item.sha)) continue;
      seen.add(item.sha);

      if (item.author?.login?.toLowerCase() !== wantedLogin) continue;
      if (existing.has(item.sha)) continue;

      pending.push(item);
      if (pending.length >= MAX_COMMITS_PER_SYNC) break;
    }

    if (
      batch.length < PER_PAGE ||
      pending.length >= MAX_COMMITS_PER_SYNC
    ) {
      break;
    }
  }

  const rows: SyncedCommit[] = [];
  for (let index = 0; index < pending.length; index += DETAIL_CONCURRENCY) {
    const chunk = pending.slice(index, index + DETAIL_CONCURRENCY);
    const built = await Promise.all(
      chunk.map((item) => toSyncedCommit(owner, repo, item)),
    );
    rows.push(...built);
  }

  return rows;
}
