"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ChallengeFormState, ChallengeStatus } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES: ChallengeStatus[] = ["draft", "open", "closed"];

type ParsedChallenge = {
  title: string;
  role: string;
  requiredSkills: string[];
  problemStatement: string | null;
  startDate: string | null;
  endDate: string | null;
  status: ChallengeStatus;
  companyId: string | null;
  newCompanyName: string | null;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseChallengeForm(
  formData: FormData,
): ParsedChallenge | { error: string } {
  const title = text(formData, "title");
  const role = text(formData, "role");
  const status = text(formData, "status");
  const startDate = text(formData, "start_date");
  const endDate = text(formData, "end_date");
  const problemStatement = text(formData, "problem_statement");
  const requiredSkills = text(formData, "required_skills")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
  const companyIdRaw = text(formData, "company_id");
  const companyId = companyIdRaw && companyIdRaw !== "new" ? companyIdRaw : null;
  const newCompanyName = text(formData, "new_company_name");

  if (!title) return { error: "Title is required." };
  if (!role) return { error: "Role is required." };
  if (!STATUSES.includes(status as ChallengeStatus)) {
    return { error: "Choose a valid status." };
  }
  if (startDate && !DATE_RE.test(startDate)) {
    return { error: "Start date is invalid." };
  }
  if (endDate && !DATE_RE.test(endDate)) {
    return { error: "End date is invalid." };
  }
  if (startDate && endDate && endDate < startDate) {
    return { error: "End date must be on or after the start date." };
  }
  if (companyId && !UUID_RE.test(companyId)) {
    return { error: "Choose a valid company." };
  }
  if (!companyId && !newCompanyName) {
    return { error: "Choose a company or enter a new company name." };
  }

  return {
    title,
    role,
    requiredSkills,
    problemStatement: problemStatement || null,
    startDate: startDate || null,
    endDate: endDate || null,
    status: status as ChallengeStatus,
    companyId,
    newCompanyName: newCompanyName || null,
  };
}

async function getAdminContext() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if ((data as { role?: string } | null)?.role !== "admin") {
    return null;
  }

  return { supabase, user };
}

type AdminContext = NonNullable<Awaited<ReturnType<typeof getAdminContext>>>;

async function resolveCompanyId(
  context: AdminContext,
  parsed: ParsedChallenge,
): Promise<string | ChallengeFormState> {
  if (parsed.companyId) return parsed.companyId;
  if (!parsed.newCompanyName) return { error: "Enter a new company name." };

  const { data, error } = await context.supabase
    .from("companies")
    .insert({ name: parsed.newCompanyName, owner_id: context.user.id })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the company." };
  }

  return (data as { id: string }).id;
}

function revalidateChallengePaths(id?: string) {
  revalidatePath("/admin/challenges");
  revalidatePath("/challenges");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/challenges/${id}`);
}

export async function createChallenge(
  _previousState: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const context = await getAdminContext();
  if (!context) {
    return { error: "Only admins can create challenges." };
  }

  const parsed = parseChallengeForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const companyId = await resolveCompanyId(context, parsed);
  if (typeof companyId !== "string") return companyId;

  const { error } = await context.supabase.from("challenges").insert({
    company_id: companyId,
    title: parsed.title,
    role: parsed.role,
    required_skills: parsed.requiredSkills,
    problem_statement: parsed.problemStatement,
    start_date: parsed.startDate,
    end_date: parsed.endDate,
    status: parsed.status,
  });

  if (error) return { error: error.message };

  revalidateChallengePaths();
  redirect("/admin/challenges");
}

export async function updateChallenge(
  _previousState: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const context = await getAdminContext();
  if (!context) {
    return { error: "Only admins can update challenges." };
  }

  const id = text(formData, "id");
  if (!UUID_RE.test(id)) return { error: "Challenge not found." };

  const parsed = parseChallengeForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const companyId = await resolveCompanyId(context, parsed);
  if (typeof companyId !== "string") return companyId;

  const { data, error } = await context.supabase
    .from("challenges")
    .update({
      company_id: companyId,
      title: parsed.title,
      role: parsed.role,
      required_skills: parsed.requiredSkills,
      problem_statement: parsed.problemStatement,
      start_date: parsed.startDate,
      end_date: parsed.endDate,
      status: parsed.status,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Challenge not found." };

  revalidateChallengePaths(id);
  redirect("/admin/challenges");
}
