import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { updateChallenge } from "@/app/admin/challenges/actions";
import { AppNav } from "@/components/app-nav";
import { ChallengeForm } from "@/components/challenge-form";
import { requireAdmin } from "@/lib/auth";
import type { ChallengeDefaults, CompanyOption } from "@/lib/types";

export default function EditChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <Suspense
          fallback={<p className="text-sm text-zinc-400">Loading form…</p>}
        >
          <EditChallenge params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function EditChallenge({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const [{ data: challengeData }, { data: companyData }] = await Promise.all([
    supabase
      .from("challenges")
      .select(
        "id, company_id, title, role, required_skills, problem_statement, start_date, end_date, status",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("companies").select("id, name").order("name"),
  ]);

  const challenge = challengeData as ChallengeDefaults | null;
  if (!challenge) notFound();

  const companies = (companyData ?? []) as CompanyOption[];

  return (
    <div className="space-y-8">
      <AppNav isAdmin />

      <div>
        <Link
          href="/admin/challenges"
          className="text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
        >
          ← All challenges
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Edit challenge
        </h1>
        <p className="mt-1 text-sm text-zinc-400">{challenge.title}</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <ChallengeForm
          action={updateChallenge}
          companies={companies}
          challenge={challenge}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
