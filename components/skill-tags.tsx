export function SkillTags({ skills }: { skills: string[] }) {
  if (skills.length === 0) {
    return <p className="text-xs text-zinc-500">No specific skills listed</p>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <li
          key={skill}
          className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
        >
          {skill}
        </li>
      ))}
    </ul>
  );
}
