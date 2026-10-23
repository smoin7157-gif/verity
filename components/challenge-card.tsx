import Link from "next/link";
import { SkillTags } from "@/components/skill-tags";
import { formatDateRange } from "@/lib/format";
import type { ChallengeSummary } from "@/lib/types";

export function ChallengeCard({ challenge }: { challenge: ChallengeSummary }) {
  return (
    <Link
      href={`/challenges/${challenge.id}`}
      className="group flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-emerald-500/60"
    >
      <p className="text-xs text-zinc-500">
        {challenge.companies?.name ?? "Unknown company"}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-white transition-colors group-hover:text-emerald-300">
        {challenge.title}
      </h2>
      <p className="mt-1 text-sm text-zinc-400">{challenge.role}</p>

      <div className="mt-4">
        <SkillTags skills={challenge.required_skills} />
      </div>

      <p className="mt-auto pt-5 text-xs text-zinc-500">
        {formatDateRange(challenge.start_date, challenge.end_date)}
      </p>
    </Link>
  );
}
