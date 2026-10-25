import Link from "next/link";
import { Suspense } from "react";
import { AdminTabs } from "@/components/admin-tabs";
import { AppNav } from "@/components/app-nav";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { formatDateRange } from "@/lib/format";
import type { AdminChallengeRow } from "@/lib/types";

export default function AdminChallengesPage() {
  return (
    <main className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-5xl">
        <Suspense
          fallback={<p className="text-sm text-zinc-400">Loading challenges…</p>}
        >
          <AdminChallenges />
        </Suspense>
      </div>
    </main>
  );
}

async function AdminChallenges() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("challenges")
    .select(
      "id, title, role, status, start_date, end_date, companies ( name ), enrollments ( count )",
    )
    .order("start_date", { ascending: false });

  const rows = (data ?? []) as unknown as AdminChallengeRow[];

  return (
    <div className="space-y-8">
      <AppNav isAdmin />
      <AdminTabs active="challenges" />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-400">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Challenges
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Every challenge, including drafts and closed ones.
          </p>
        </div>
        <Link
          href="/admin/challenges/new"
          className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
        >
          New challenge
        </Link>
      </header>

      {error ? (
        <p className="text-sm text-red-400">
          Could not load challenges. Please refresh and try again.
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">
            No challenges yet. Create the first one.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/60 p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{row.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {row.companies?.name ?? "Unknown company"} · {row.role}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <span className="hidden text-xs text-zinc-500 md:inline">
                  {formatDateRange(row.start_date, row.end_date)}
                </span>
                <span className="text-xs text-zinc-400">
                  {row.enrollments?.[0]?.count ?? 0} enrolled
                </span>
                <StatusBadge status={row.status} />
                <Link
                  href={`/admin/challenges/${row.id}`}
                  className="text-sm text-zinc-300 underline-offset-4 hover:text-emerald-400 hover:underline"
                >
                  View
                </Link>
                <Link
                  href={`/admin/challenges/${row.id}/edit`}
                  className="text-sm text-emerald-400 underline-offset-4 hover:underline"
                >
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
