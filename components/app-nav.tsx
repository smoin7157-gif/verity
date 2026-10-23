import Link from "next/link";

export function AppNav({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
      <Link
        href="/dashboard"
        className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400"
      >
        ProofHire
      </Link>
      <nav className="flex items-center gap-5 text-sm text-zinc-400">
        <Link href="/challenges" className="transition-colors hover:text-white">
          Challenges
        </Link>
        <Link href="/dashboard" className="transition-colors hover:text-white">
          Dashboard
        </Link>
        <Link href="/profile" className="transition-colors hover:text-white">
          Profile
        </Link>
        {isAdmin ? (
          <Link
            href="/admin/challenges"
            className="transition-colors hover:text-white"
          >
            Admin
          </Link>
        ) : null}
      </nav>
    </header>
  );
}
