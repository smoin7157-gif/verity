"use client";

import { useActionState } from "react";
import { linkRepo } from "@/app/challenges/[id]/workspace/actions";
import type { RepoFormState } from "@/lib/types";

const initialState: RepoFormState = { error: null, success: null };

export function RepoForm({
  challengeId,
  defaultValue = "",
}: {
  challengeId: string;
  defaultValue?: string;
}) {
  const [state, formAction, pending] = useActionState<RepoFormState, FormData>(
    linkRepo,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="challenge_id" value={challengeId} />

      <div>
        <label htmlFor="repo_url" className="block text-sm font-medium text-zinc-300">
          Repository URL
        </label>
        <input
          id="repo_url"
          name="repo_url"
          type="url"
          required
          defaultValue={defaultValue}
          placeholder="https://github.com/owner/repo"
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500"
        />
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Public repository that you own or contribute to. Commits by your GitHub
          username are imported after each sync.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Checking…" : "Save repository"}
        </button>
        {state.success ? (
          <p className="text-sm text-emerald-300">{state.success}</p>
        ) : null}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
