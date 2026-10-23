import { Suspense } from "react";
import { AdminTabs } from "@/components/admin-tabs";
import { AppNav } from "@/components/app-nav";
import { SkillTags } from "@/components/skill-tags";
import { requireAdmin } from "@/lib/auth";
import type { StudentRow } from "@/lib/types";

export default function AdminStudentsPage() {
  return (
    <main className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-5xl">
        <Suspense
          fallback={<p className="text-sm text-zinc-400">Loading students…</p>}
        >
          <AdminStudents />
        </Suspense>
      </div>
    </main>
  );
}

async function AdminStudents() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, github_username, college, branch, year_of_study, skills",
    )
    .eq("role", "student")
    .order("full_name", { ascending: true });

  const students = (data ?? []) as unknown as StudentRow[];

  return (
    <div className="space-y-8">
      <AppNav isAdmin />
      <AdminTabs active="students" />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-400">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Students
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Everyone who signed up as a student.
          </p>
        </div>
        <p className="text-sm text-zinc-500">
          {students.length} {students.length === 1 ? "student" : "students"}
        </p>
      </header>

      {error ? (
        <p className="text-sm text-red-400">
          Could not load students. Please refresh and try again.
        </p>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">No students have signed up yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800">
          {students.map((student) => {
            const meta = [
              student.college,
              student.branch,
              student.year_of_study ? `Year ${student.year_of_study}` : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={student.id} className="bg-zinc-900/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">
                      {student.full_name ?? "Unnamed student"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {meta || "No college details yet"}
                    </p>
                  </div>

                  {student.github_username ? (
                    <a
                      href={`https://github.com/${student.github_username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm text-zinc-400 underline-offset-4 hover:text-emerald-400 hover:underline"
                    >
                      @{student.github_username}
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-500">No GitHub</span>
                  )}
                </div>

                <div className="mt-3">
                  <SkillTags skills={student.skills ?? []} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
