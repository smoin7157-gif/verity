import Link from "next/link";

function pillClass(active: boolean) {
  return `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
  }`;
}

export function SkillFilter({
  skills,
  activeSkill,
}: {
  skills: string[];
  activeSkill?: string;
}) {
  if (skills.length === 0) return null;

  const active = activeSkill?.toLowerCase();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
        Filter
      </span>
      <Link href="/challenges" className={pillClass(!active)}>
        All
      </Link>
      {skills.map((skill) => (
        <Link
          key={skill}
          href={`/challenges?skill=${encodeURIComponent(skill)}`}
          className={pillClass(active === skill.toLowerCase())}
        >
          {skill}
        </Link>
      ))}
    </div>
  );
}
