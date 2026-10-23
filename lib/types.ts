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
