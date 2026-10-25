"use client";

import { useActionState } from "react";
import { saveCheckin } from "@/app/challenges/[id]/workspace/actions";
import type { CheckinFormState } from "@/lib/types";

const initialState: CheckinFormState = { error: null, success: null };

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500";
const labelClass = "block text-sm font-medium text-zinc-300";

export type CheckinDefaults = {
  did: string;
  blocked: string;
  next: string;
};

export function CheckinForm({
  challengeId,
  defaults,
  editing,
}: {
  challengeId: string;
  defaults?: CheckinDefaults;
  editing: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    CheckinFormState,
    FormData
  >(saveCheckin, initialState);

  return (
    <form action={formAction} className="mt-4 space-y-5">
      <input type="hidden" name="challenge_id" value={challengeId} />

      <div>
        <label htmlFor="did" className={labelClass}>
          What I did today{" "}
          <span className="text-emerald-400" aria-hidden="true">
            *
          </span>
        </label>
        <textarea
          id="did"
          name="did"
          required
          minLength={10}
          maxLength={1000}
          rows={3}
          defaultValue={defaults?.did ?? ""}
          placeholder="Built the challenge list page and wired the skill filter."
          className={inputClass}
        />
        <p className="mt-1 text-xs text-zinc-500">
          At least 10 characters. Be specific — this becomes your proof of work.
        </p>
      </div>

      <div>
        <label htmlFor="blocked" className={labelClass}>
          What blocked me <span className="text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="blocked"
          name="blocked"
          maxLength={1000}
          rows={2}
          defaultValue={defaults?.blocked ?? ""}
          placeholder="GitHub rate limit slowed the sync down."
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="next" className={labelClass}>
          What&apos;s next{" "}
          <span className="text-emerald-400" aria-hidden="true">
            *
          </span>
        </label>
        <textarea
          id="next"
          name="next"
          required
          maxLength={1000}
          rows={2}
          defaultValue={defaults?.next ?? ""}
          placeholder="Add the commit heatmap and write tests for the date helpers."
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending
            ? "Saving…"
            : editing
              ? "Update today's check-in"
              : "Save check-in"}
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
