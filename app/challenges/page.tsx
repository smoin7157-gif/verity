import Link from "next/link";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { ChallengeCard } from "@/components/challenge-card";
import { SkillFilter } from "@/components/skill-filter";
import { requireProfile } from "@/lib/auth";
import type { ChallengeSummary } from "@/lib/types";

type SearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

export default function ChallengesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-5xl">
        <Suspense
          fallback={<p className="text-sm text-zinc-400">Loading challenges…</p>}
        >
          <ChallengesList searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function ChallengesList({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawSkill = params.skill;
  const activeSkill =
    (Array.isArray(rawSkill) ? rawSkill[0] : rawSkill)?.trim() || null;

  const { supabase, profile } = await requireProfile();

  const { data, error } = await supabase
    .from("challenges")
    .select(
      "id, title, role, required_skills, start_date, end_date, status, companies ( name )",
    )
    .eq("status", "open")
    .order("start_date", { ascending: true });

  const challenges = (data ?? []) as unknown as ChallengeSummary[];

  const skills = Array.from(
    new Set(challenges.flatMap((challenge) => challenge.required_skills)),
  ).sort((a, b) => a.localeCompare(b));

  const visible = activeSkill
    ? challenges.filter((challenge) =>
        challenge.required_skills.some(
          (skill) => skill.toLowerCase() === activeSkill.toLowerCase(),
        ),
      )
    : challenges;

  return (
    <div className="space-y-8">
      <AppNav isAdmin={profile.role === "admin"} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-400">
            Challenges
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Open challenges
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Join one, ship real work and build a verified track record.
          </p>
        </div>
        <p className="text-sm text-zinc-500">
          {visible.length} {visible.length === 1 ? "challenge" : "challenges"}
        </p>
      </header>

      <SkillFilter skills={skills} activeSkill={activeSkill ?? undefined} />

      {error ? (
        <p className="text-sm text-red-400">
          Could not load challenges. Please refresh and try again.
        </p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">
            {activeSkill
              ? `No open challenges match “${activeSkill}”.`
              : "No open challenges right now. Check back soon."}
          </p>
          {activeSkill ? (
            <Link
              href="/challenges"
              className="mt-3 inline-block text-sm text-emerald-400 hover:underline"
            >
              Clear filter
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visible.map((challenge) => (
            <li key={challenge.id}>
              <ChallengeCard challenge={challenge} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
