import Link from "next/link";

const tabs = [
  { href: "/admin/challenges", label: "Challenges", key: "challenges" },
  { href: "/admin/students", label: "Students", key: "students" },
];

export function AdminTabs({ active }: { active: "challenges" | "students" }) {
  return (
    <nav className="flex gap-5 border-b border-zinc-800 pb-3 text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={
            tab.key === active
              ? "font-medium text-white"
              : "text-zinc-400 transition-colors hover:text-white"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
