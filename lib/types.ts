export type Role = "student" | "admin" | "company";
export type ChallengeStatus = "draft" | "open" | "closed";
export type EnrollmentStatus = "active" | "completed" | "dropped";

export type Profile = {
  id: string;
  github_username: string | null;
  full_name: string | null;
  college: string | null;
  skills: string[] | null;
  role: Role;
  phone: string | null;
  year_of_study: number | null;
  branch: string | null;
  linkedin_url: string | null;
  bio: string | null;
  onboarding_completed: boolean;
  created_at: string;
};

export type CompanyRef = { name: string } | null;

export type ChallengeSummary = {
  id: string;
  title: string;
  role: string;
  required_skills: string[];
  start_date: string | null;
  end_date: string | null;
  status: ChallengeStatus;
  companies: CompanyRef;
};

export type ChallengeDetail = ChallengeSummary & {
  company_id: string;
  problem_statement: string | null;
};

export type ChallengeDefaults = {
  id: string;
  company_id: string | null;
  title: string;
  role: string;
  required_skills: string[];
  problem_statement: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ChallengeStatus;
};

export type AdminChallengeRow = {
  id: string;
  title: string;
  role: string;
  status: ChallengeStatus;
  start_date: string | null;
  end_date: string | null;
  companies: CompanyRef;
  enrollments: { count: number }[] | null;
};

export type EnrollmentRow = {
  id: string;
  status: EnrollmentStatus;
  repo_url: string | null;
  created_at: string;
  challenges: {
    id: string;
    title: string;
    status: ChallengeStatus;
    companies: CompanyRef;
  } | null;
};

export type CompanyOption = { id: string; name: string };

export type ChallengeFormState = { error: string | null };
export type ChallengeAction = (
  state: ChallengeFormState,
  formData: FormData,
) => Promise<ChallengeFormState>;

export type JoinState = { error: string | null };

export type WorkspaceEnrollment = {
  id: string;
  repo_url: string | null;
  last_synced_at: string | null;
  last_sync_attempt_at: string | null;
  sync_error: string | null;
  challenges: {
    id: string;
    title: string;
    role: string;
    status: ChallengeStatus;
    start_date: string | null;
    end_date: string | null;
    companies: CompanyRef;
  } | null;
};

export type CommitRow = {
  sha: string;
  message: string | null;
  author_login: string | null;
  author_date: string | null;
  committer_date: string | null;
  url: string | null;
  additions: number;
  deletions: number;
  committed_at: string;
};

export type CommitStats = { total: number; active_days: number };

export type RepoFormState = { error: string | null; success: string | null };
export type SyncState = { error: string | null; success: string | null };

export type ProfileFormState = { error: string | null };
export type ProfileAction = (
  state: ProfileFormState,
  formData: FormData,
) => Promise<ProfileFormState>;

export type StudentRow = {
  id: string;
  full_name: string | null;
  github_username: string | null;
  college: string | null;
  branch: string | null;
  year_of_study: number | null;
  skills: string[] | null;
};
