import Link from "next/link";
import { Suspense } from "react";
import { createChallenge } from "@/app/admin/challenges/actions";
import { AppNav } from "@/components/app-nav";
import { ChallengeForm } from "@/components/challenge-form";
import { requireAdmin } from "@/lib/auth";
import type { CompanyOption } from "@/lib/types";

export default function NewChallengePage() {
  return (
    <main className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <Suspense
          fallback={<p className="text-sm text-zinc-400">Loading form…</p>}
        >
          <NewChallenge />
        </Suspense>
      </div>
    </main>
  );
}

async function NewChallenge() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  const companies = (data ?? []) as CompanyOption[];

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
          New challenge
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Publish a challenge students can join.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <ChallengeForm
          action={createChallenge}
          companies={companies}
          submitLabel="Create challenge"
        />
      </div>
    </div>
  );
}
